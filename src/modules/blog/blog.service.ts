import axios from "axios";

import mongoose from "mongoose";

import AppError from "../../utils/AppError";

import {
  UserModel,
} from "../../app/modules/expert/expert.service";

import type {
  IBlog,
  IBlogAuthor,
  IBlogComment,
  IBlogQuery,
} from "./blog.interface";

import {
  Blog,
} from "./blog.model";

const generateSlug = (
  title: string
): string =>
  `${title
    .toLowerCase()
    .trim()
    .replace(
      /[^\w\s-]/g,
      ""
    )
    .replace(
      /[\s_-]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const calculateReadTime = (
  content: string
): string => {
  const words =
    content
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length;

  return `${Math.max(
    1,
    Math.ceil(
      words / 200
    )
  )} min read`;
};

const getAllBlogsFromDB =
  async (
    query: IBlogQuery
  ) => {
    const filter: Record<
      string,
      unknown
    > = {
      status: "PUBLISHED",
    };

    if (
      query.category &&
      query.category !== "All"
    ) {
      filter.category =
        new RegExp(
          `^${query.category}$`,
          "i"
        );
    }

    if (query.authorId) {
      filter[
        "author.id"
      ] = query.authorId;
    }

    if (query.search) {
      const rx =
        new RegExp(
          query.search,
          "i"
        );

      filter.$or = [
        {
          title: rx,
        },

        {
          summary: rx,
        },

        {
          category: rx,
        },

        {
          tags: {
            $in: [rx],
          },
        },

        {
          "author.name": rx,
        },
      ];
    }

    const page =
      Math.max(
        Number(
          query.page
        ) || 1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            query.limit
          ) || 12,
          1
        ),
        50
      );

    const skip =
      (page - 1) *
      limit;

    const [
      blogs,
      total,
    ] =
      await Promise.all([
        Blog.find(filter)
          .select(
            "-comments"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Blog.countDocuments(
          filter
        ),
      ]);

    return {
      blogs,

      meta: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    };
  };

const getMyBlogsFromDB =
  async (
    expertId: string
  ) =>
    Blog.find({
      "author.id":
        expertId,
    })
      .select(
        "-comments"
      )
      .sort({
        updatedAt: -1,
      })
      .lean();

const getBlogByIdOrSlugFromDB =
  async (
    idOrSlug: string
  ) => {
    const query =
      mongoose.Types.ObjectId.isValid(
        idOrSlug
      )
        ? {
            $or: [
              {
                _id:
                  idOrSlug,
              },

              {
                slug:
                  idOrSlug,
              },
            ],

            status:
              "PUBLISHED",
          }
        : {
            slug:
              idOrSlug,

            status:
              "PUBLISHED",
          };

    const blog =
      await Blog.findOneAndUpdate(
        query,

        {
          $inc: {
            views: 1,
          },
        },

        {
          new: true,
        }
      ).lean();

    if (!blog) {
      throw new AppError(
        404,
        "Blog article not found"
      );
    }

    const [
      nextBlog,
      prevBlog,
    ] =
      await Promise.all([
        Blog.findOne({
          status:
            "PUBLISHED",

          createdAt: {
            $lt:
              blog.createdAt,
          },
        })
          .sort({
            createdAt: -1,
          })
          .select(
            "title slug summary images readTime category author"
          )
          .lean(),

        Blog.findOne({
          status:
            "PUBLISHED",

          createdAt: {
            $gt:
              blog.createdAt,
          },
        })
          .sort({
            createdAt: 1,
          })
          .select(
            "title slug summary images readTime category author"
          )
          .lean(),
      ]);

    return {
      blog,
      nextBlog,
      prevBlog,
    };
  };

const buildAuthor = async (
  user: {
    id: string;

    email: string;

    name?: string;
  }
): Promise<IBlogAuthor> => {
  let author: IBlogAuthor =
    {
      id: user.id,

      name:
        user.name ||
        "Agricultural Expert",

      email:
        user.email,

      title:
        "Agricultural Specialist",

      specialization:
        "Smart Agriculture",
    };

  try {
    const userDoc =
      await UserModel.findById(
        user.id
      );

    if (userDoc) {
      author = {
        id:
          user.id,

        name:
          userDoc.name ||
          author.name,

        email:
          userDoc.email ||
          user.email,

        avatar:
          userDoc.avatar ||
          userDoc.image,

        title:
          userDoc.title ||
          "Agricultural Specialist",

        specialization:
          userDoc.specialization ||
          "Smart Agriculture",

        bio:
          userDoc.bio,
      };
    }
  } catch {
    // Token identity is enough
    // if profile lookup fails.
  }

  return author;
};

const createBlogInDB =
  async (
    payload:
      Partial<IBlog>,

    user: {
      id: string;

      email: string;

      name?: string;

      role: string;
    }
  ) => {
    if (
      user.role !==
      "EXPERT"
    ) {
      throw new AppError(
        403,
        "Only experts can publish blog articles"
      );
    }

    if (
      !payload.title ||
      !payload.content ||
      !payload.summary ||
      !payload.category ||
      !payload.images
        ?.length
    ) {
      throw new AppError(
        400,
        "Title, category, summary, content and a cover image are required"
      );
    }

    return Blog.create({
      ...payload,

      slug:
        generateSlug(
          payload.title
        ),

      readTime:
        calculateReadTime(
          payload.content
        ),

      author:
        await buildAuthor(
          user
        ),

      status:
        payload.status ||
        "PUBLISHED",

      views: 0,

      comments: [],
    });
  };

const getOwnedBlog =
  async (
    id: string,
    expertId: string
  ) => {
    const query =
      mongoose.Types.ObjectId.isValid(
        id
      )
        ? {
            $or: [
              {
                _id: id,
              },

              {
                slug: id,
              },
            ],
          }
        : {
            slug: id,
          };

    const blog =
      await Blog.findOne(
        query
      );

    if (!blog) {
      throw new AppError(
        404,
        "Blog article not found"
      );
    }

    if (
      blog.author.id !==
      expertId
    ) {
      throw new AppError(
        403,
        "You can only manage your own articles"
      );
    }

    return blog;
  };

const updateBlogInDB =
  async (
    id: string,

    payload:
      Partial<IBlog>,

    user: {
      id: string;

      email: string;

      role: string;
    }
  ) => {
    if (
      user.role !==
      "EXPERT"
    ) {
      throw new AppError(
        403,
        "Only experts can update blog articles"
      );
    }

    const blog =
      await getOwnedBlog(
        id,
        user.id
      );

    const allowed:
      Array<
        keyof IBlog
      > = [
      "title",
      "category",
      "tags",
      "summary",
      "content",
      "images",
      "status",
    ];

    for (
      const field
      of allowed
    ) {
      if (
        payload[field] !==
        undefined
      ) {
        (
          blog as unknown as Record<
            string,
            unknown
          >
        )[field] =
          payload[
            field
          ] as unknown;
      }
    }

    if (payload.title) {
      blog.slug =
        generateSlug(
          payload.title
        );
    }

    if (
      payload.content
    ) {
      blog.readTime =
        calculateReadTime(
          payload.content
        );
    }

    await blog.save();

    return blog;
  };

const deleteBlogFromDB =
  async (
    id: string,

    user: {
      id: string;

      email: string;

      role: string;
    }
  ) => {
    if (
      user.role !==
      "EXPERT"
    ) {
      throw new AppError(
        403,
        "Only experts can delete blog articles"
      );
    }

    const blog =
      await getOwnedBlog(
        id,
        user.id
      );

    await blog.deleteOne();

    return {
      deleted: true,
    };
  };

const addCommentInDB =
  async (
    id: string,

    content: string,

    user: {
      id: string;

      name?: string;

      email: string;

      role:
        | "FARMER"
        | "EXPERT"
        | "ADMIN";
    }
  ) => {
    const blog =
      await Blog.findOne(
        mongoose.Types.ObjectId.isValid(
          id
        )
          ? {
              $or: [
                {
                  _id: id,
                },

                {
                  slug: id,
                },
              ],

              status:
                "PUBLISHED",
            }
          : {
              slug: id,

              status:
                "PUBLISHED",
            }
      );

    if (!blog) {
      throw new AppError(
        404,
        "Blog article not found"
      );
    }

    blog.comments.push({
      userId:
        user.id,

      userName:
        user.name ||
        user.email.split(
          "@"
        )[0],

      userRole:
        user.role,

      content,

      replies: [],
    });

    await blog.save();

    return blog.comments[
      blog.comments.length -
        1
    ];
  };

const addReplyInDB =
  async (
    id: string,

    commentId: string,

    content: string,

    user: {
      id: string;

      name?: string;

      email: string;

      role:
        | "FARMER"
        | "EXPERT"
        | "ADMIN";
    }
  ) => {
    const blog =
      await Blog.findOne(
        mongoose.Types.ObjectId.isValid(
          id
        )
          ? {
              $or: [
                {
                  _id: id,
                },

                {
                  slug: id,
                },
              ],

              status:
                "PUBLISHED",
            }
          : {
              slug: id,

              status:
                "PUBLISHED",
            }
      );

    if (!blog) {
      throw new AppError(
        404,
        "Blog article not found"
      );
    }

    const comment =
      blog.comments.find(
        (
          item:
            IBlogComment
        ) =>
          String(
            item._id
          ) === commentId
      );

    if (!comment) {
      throw new AppError(
        404,
        "Comment not found"
      );
    }

    comment.replies.push({
      userId:
        user.id,

      userName:
        user.name ||
        user.email.split(
          "@"
        )[0],

      userRole:
        user.role,

      content,
    });

    await blog.save();

    return comment.replies[
      comment.replies
        .length - 1
    ];
  };

const uploadImageToImgBB =
  async (
    file:
      Express.Multer.File
  ) => {
    const apiKey =
      process.env
        .IMGBB_API_KEY;

    if (!apiKey) {
      throw new AppError(
        500,
        "IMGBB_API_KEY is not configured"
      );
    }

    if (
      !file.mimetype.startsWith(
        "image/"
      )
    ) {
      throw new AppError(
        400,
        "Only image files are allowed"
      );
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      throw new AppError(
        400,
        "Image must be 8 MB or smaller"
      );
    }

    const form =
      new URLSearchParams();

    form.set(
      "image",
      file.buffer.toString(
        "base64"
      )
    );

    form.set(
      "name",
      `agrinova-blog-${Date.now()}`
    );

    const response =
      await axios.post(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(
          apiKey
        )}`,

        form.toString(),

        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          timeout: 25000,
        }
      );

    const url =
      response.data?.data
        ?.url ||
      response.data?.data
        ?.display_url;

    if (!url) {
      throw new AppError(
        502,
        "ImgBB did not return an image URL"
      );
    }

    return {
      url: String(url),
    };
  };

export const BlogService = {
  getAllBlogsFromDB,
  getMyBlogsFromDB,
  getBlogByIdOrSlugFromDB,
  createBlogInDB,
  updateBlogInDB,
  deleteBlogFromDB,
  addCommentInDB,
  addReplyInDB,
  uploadImageToImgBB,
};