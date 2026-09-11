import axios from "axios";

import {
  isValidObjectId,
  Types,
} from "mongoose";

import AppError from "../../utils/AppError";

import {
  User,
} from "../user/user.model";

import {
  NotificationService,
} from "../notification/notification.service";

import {
  CommunityPost,
} from "./community.model";

interface CommunityUser {
  id: string;

  name?: string;

  email: string;

  role:
    | "FARMER"
    | "EXPERT"
    | "ADMIN";
}

interface CommunityCommentLike {
  _id?: unknown;
}

/* ============================================================
   HELPERS
============================================================ */

const requireObjectId = (
  id: string,
  label: string
) => {
  if (
    !isValidObjectId(id)
  ) {
    throw new AppError(
      400,
      `Invalid ${label}`
    );
  }
};

const sanitizePost = (
  post: any,
  viewerId?: string
) => {
  const plain =
    typeof post?.toObject ===
    "function"
      ? post.toObject()
      : post;

  const likes =
    Array.isArray(
      plain?.likes
    )
      ? plain.likes.map(
          (
            id: unknown
          ) =>
            String(id)
        )
      : [];

  return {
    ...plain,

    likes,

    likeCount:
      likes.length,

    commentCount:
      Array.isArray(
        plain?.comments
      )
        ? plain.comments.length
        : 0,

    likedByMe:
      viewerId
        ? likes.includes(
            String(
              viewerId
            )
          )
        : false,
  };
};

/* ============================================================
   PUBLIC COMMUNITY FEED

   Logged-out users can:
   - read posts
   - see comments
   - see replies

   They cannot:
   - like
   - comment
   - reply
   - create
   - see farmer profile
============================================================ */

const getFeedFromDB =
  async (
    viewerId:
      | string
      | undefined,

    query: Record<
      string,
      unknown
    >
  ) => {
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
          ) || 10,
          1
        ),
        30
      );

    const skip =
      (page - 1) *
      limit;

    const [
      posts,
      total,
    ] =
      await Promise.all([
        CommunityPost.find({
          status:
            "ACTIVE",
        })
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        CommunityPost.countDocuments(
          {
            status:
              "ACTIVE",
          }
        ),
      ]);

    return {
      data:
        posts.map(
          (
            post: unknown
          ) =>
            sanitizePost(
              post,
              viewerId
            )
        ),

      meta: {
        page,

        limit,

        total,

        totalPages:
          Math.ceil(
            total /
              limit
          ),
      },
    };
  };

/* ============================================================
   CREATE POST
============================================================ */

const createPostInDB =
  async (
    payload: {
      content: string;

      images?: string[];
    },

    user:
      CommunityUser
  ) => {
    if (
      user.role !==
      "FARMER"
    ) {
      throw new AppError(
        403,
        "Only farmers can create community posts"
      );
    }

    if (
      !isValidObjectId(
        user.id
      )
    ) {
      throw new AppError(
        400,
        "Invalid farmer id"
      );
    }

    const created =
      await CommunityPost.create(
        {
          authorId:
            new Types.ObjectId(
              user.id
            ),

          authorName:
            user.name ||
            user.email.split(
              "@"
            )[0],

          content:
            payload.content,

          images:
            payload.images ||
            [],

          likes: [],

          comments: [],

          status:
            "ACTIVE",
        }
      );

    return sanitizePost(
      created,
      user.id
    );
  };

/* ============================================================
   GET OWN POST
============================================================ */

const getOwnPost =
  async (
    postId:
      string,

    farmerId:
      string
  ) => {
    requireObjectId(
      postId,
      "post id"
    );

    requireObjectId(
      farmerId,
      "farmer id"
    );

    const post =
      await CommunityPost.findById(
        postId
      );

    if (!post) {
      throw new AppError(
        404,
        "Community post not found"
      );
    }

    if (
      String(
        post.authorId
      ) !==
      String(
        farmerId
      )
    ) {
      throw new AppError(
        403,
        "You can only manage your own posts"
      );
    }

    if (
      post.status ===
      "REMOVED"
    ) {
      throw new AppError(
        403,
        "This post was removed by Admin"
      );
    }

    return post;
  };

/* ============================================================
   UPDATE OWN POST
============================================================ */

const updatePostInDB =
  async (
    postId:
      string,

    farmerId:
      string,

    payload: {
      content?: string;

      images?: string[];
    }
  ) => {
    const post =
      await getOwnPost(
        postId,
        farmerId
      );

    if (
      payload.content !==
      undefined
    ) {
      post.content =
        payload.content;
    }

    if (
      payload.images !==
      undefined
    ) {
      post.images =
        payload.images;
    }

    await post.save();

    return sanitizePost(
      post,
      farmerId
    );
  };

/* ============================================================
   DELETE OWN POST
============================================================ */

const deleteOwnPostFromDB =
  async (
    postId:
      string,

    farmerId:
      string
  ) => {
    const post =
      await getOwnPost(
        postId,
        farmerId
      );

    await post.deleteOne();

    return {
      deleted: true,
    };
  };

/* ============================================================
   LIKE / UNLIKE
============================================================ */

const toggleLikeInDB =
  async (
    postId:
      string,

    farmerId:
      string
  ) => {
    requireObjectId(
      postId,
      "post id"
    );

    requireObjectId(
      farmerId,
      "farmer id"
    );

    const post =
      await CommunityPost.findOne(
        {
          _id:
            new Types.ObjectId(
              postId
            ),

          status:
            "ACTIVE",
        }
      );

    if (!post) {
      throw new AppError(
        404,
        "Community post not found"
      );
    }

    const exists =
      post.likes.some(
        (
          id: unknown
        ) =>
          String(id) ===
          String(
            farmerId
          )
      );

    if (exists) {
      post.likes =
        post.likes.filter(
          (
            id: unknown
          ) =>
            String(id) !==
            String(
              farmerId
            )
        ) as typeof post.likes;
    } else {
      post.likes.push(
        new Types.ObjectId(
          farmerId
        ) as never
      );
    }

    await post.save();

    return sanitizePost(
      post,
      farmerId
    );
  };

/* ============================================================
   COMMENT
============================================================ */

const addCommentInDB =
  async (
    postId:
      string,

    content:
      string,

    user:
      CommunityUser
  ) => {
    requireObjectId(
      postId,
      "post id"
    );

    if (
      user.role !==
      "FARMER"
    ) {
      throw new AppError(
        403,
        "Only farmers can comment in Community"
      );
    }

    requireObjectId(
      user.id,
      "farmer id"
    );

    const post =
      await CommunityPost.findOne(
        {
          _id:
            new Types.ObjectId(
              postId
            ),

          status:
            "ACTIVE",
        }
      );

    if (!post) {
      throw new AppError(
        404,
        "Community post not found"
      );
    }

    post.comments.push(
      {
        authorId:
          new Types.ObjectId(
            user.id
          ),

        authorName:
          user.name ||
          user.email.split(
            "@"
          )[0],

        content,

        replies: [],
      } as never
    );

    await post.save();

    return post.comments[
      post.comments.length -
        1
    ];
  };

/* ============================================================
   REPLY
============================================================ */

const addReplyInDB =
  async (
    postId:
      string,

    commentId:
      string,

    content:
      string,

    user:
      CommunityUser
  ) => {
    requireObjectId(
      postId,
      "post id"
    );

    requireObjectId(
      commentId,
      "comment id"
    );

    if (
      user.role !==
      "FARMER"
    ) {
      throw new AppError(
        403,
        "Only farmers can reply in Community"
      );
    }

    requireObjectId(
      user.id,
      "farmer id"
    );

    const post =
      await CommunityPost.findOne(
        {
          _id:
            new Types.ObjectId(
              postId
            ),

          status:
            "ACTIVE",
        }
      );

    if (!post) {
      throw new AppError(
        404,
        "Community post not found"
      );
    }

    const comment =
      post.comments.find(
        (
          item:
            CommunityCommentLike
        ) =>
          String(
            item._id
          ) ===
          String(
            commentId
          )
      );

    if (!comment) {
      throw new AppError(
        404,
        "Comment not found"
      );
    }

    comment.replies.push(
      {
        authorId:
          new Types.ObjectId(
            user.id
          ),

        authorName:
          user.name ||
          user.email.split(
            "@"
          )[0],

        content,
      } as never
    );

    await post.save();

    return comment.replies[
      comment.replies.length -
        1
    ];
  };

/* ============================================================
   FARMER COMMUNITY PROFILE

   IMPORTANT:
   - Login required
   - Farmer role required
   - no email
   - no phone
   - no NID
   - no private profile information
============================================================ */

const getFarmerProfileFromDB =
  async (
    farmerId:
      string,

    viewerId:
      string,

    query: Record<
      string,
      unknown
    >
  ) => {
    requireObjectId(
      farmerId,
      "farmer id"
    );

    requireObjectId(
      viewerId,
      "viewer id"
    );

    const farmerObjectId =
      new Types.ObjectId(
        farmerId
      );

    const farmer =
      await User.findOne(
        {
          _id:
            farmerObjectId,

          role:
            "FARMER",
        }
      )
        .select(
          "name location createdAt"
        )
        .lean();

    if (!farmer) {
      throw new AppError(
        404,
        "Farmer profile not found"
      );
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
          ) || 10,
          1
        ),
        30
      );

    const skip =
      (page - 1) *
      limit;

    /*
      IMPORTANT FIX:

      Do not create one shared variable like:

      const filter = {
        authorId: farmerId,
        status: "ACTIVE"
      };

      Mongoose was selecting the wrong overload for that inferred
      object type.

      Use the exact typed values directly in find() and
      countDocuments().
    */

    const [
      posts,
      total,
    ] =
      await Promise.all([
        CommunityPost.find(
          {
            authorId:
              farmerObjectId,

            status:
              "ACTIVE",
          }
        )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        CommunityPost.countDocuments(
          {
            authorId:
              farmerObjectId,

            status:
              "ACTIVE",
          }
        ),
      ]);

    return {
      profile: {
        _id:
          String(
            farmer._id
          ),

        name:
          farmer.name,

        location:
          farmer.location ||
          "",

        joinedAt:
          farmer.createdAt,

        postCount:
          total,
      },

      posts:
        posts.map(
          (
            post: unknown
          ) =>
            sanitizePost(
              post,
              viewerId
            )
        ),

      meta: {
        page,

        limit,

        total,

        totalPages:
          Math.ceil(
            total /
              limit
          ),
      },
    };
  };

/* ============================================================
   ADMIN MODERATION FEED
============================================================ */

const getAdminPostsFromDB =
  async (
    query: Record<
      string,
      unknown
    >
  ) => {
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
          ) || 20,
          1
        ),
        50
      );

    const skip =
      (page - 1) *
      limit;

    const status =
      String(
        query.status ||
          "ALL"
      ).toUpperCase();

    const search =
      String(
        query.search ||
          ""
      ).trim();

    const filter:
      Record<
        string,
        unknown
      > = {};

    if (
      status ===
        "ACTIVE" ||
      status ===
        "REMOVED"
    ) {
      filter.status =
        status;
    }

    if (search) {
      const escaped =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const rx =
        new RegExp(
          escaped,
          "i"
        );

      filter.$or = [
        {
          authorName:
            rx,
        },

        {
          content:
            rx,
        },
      ];
    }

    const [
      posts,
      total,
    ] =
      await Promise.all([
        CommunityPost.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        CommunityPost.countDocuments(
          filter
        ),
      ]);

    return {
      data:
        posts.map(
          (
            post: unknown
          ) =>
            sanitizePost(
              post
            )
        ),

      meta: {
        page,

        limit,

        total,

        totalPages:
          Math.ceil(
            total /
              limit
          ),
      },
    };
  };

/* ============================================================
   ADMIN REMOVE POST

   Admin:
   - removes post
   - stores reason
   - farmer gets notification
============================================================ */

const removePostByAdminInDB =
  async (
    postId:
      string,

    adminId:
      string,

    reason:
      string
  ) => {
    requireObjectId(
      postId,
      "post id"
    );

    requireObjectId(
      adminId,
      "admin id"
    );

    const post =
      await CommunityPost.findById(
        postId
      );

    if (!post) {
      throw new AppError(
        404,
        "Community post not found"
      );
    }

    post.status =
      "REMOVED";

    post.moderationReason =
      reason.trim();

    post.removedAt =
      new Date();

    post.removedBy =
      new Types.ObjectId(
        adminId
      ) as never;

    await post.save();

    await NotificationService.createNotification(
      {
        userId:
          String(
            post.authorId
          ),

        type:
          "COMMUNITY_POST_REMOVED",

        title:
          "Community post removed",

        message:
          `Your Community post was removed by Admin. Reason: ${reason.trim()}`,

        href:
          "/community",

        data: {
          postId:
            String(
              post._id
            ),

          reason:
            reason.trim(),
        },
      }
    );

    return sanitizePost(
      post
    );
  };

/* ============================================================
   ADMIN WARNING

   Admin can send warning without deleting post.
============================================================ */

const warnFarmerByAdminInDB =
  async (
    postId:
      string,

    reason:
      string
  ) => {
    requireObjectId(
      postId,
      "post id"
    );

    const post =
      await CommunityPost.findById(
        postId
      );

    if (!post) {
      throw new AppError(
        404,
        "Community post not found"
      );
    }

    await NotificationService.createNotification(
      {
        userId:
          String(
            post.authorId
          ),

        type:
          "COMMUNITY_WARNING",

        title:
          "Community warning",

        message:
          `Admin sent you a Community warning. ${reason.trim()}`,

        href:
          "/community",

        data: {
          postId:
            String(
              post._id
            ),

          reason:
            reason.trim(),
        },
      }
    );

    return {
      warned:
        true,

      postId:
        String(
          post._id
        ),
    };
  };

/* ============================================================
   COMMUNITY IMAGE UPLOAD

   Uses same server-side ImgBB key.
============================================================ */

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
      8 *
        1024 *
        1024
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
      `agrinova-community-${Date.now()}`
    );

    let response;

    try {
      response =
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

            timeout:
              25000,
          }
        );
    } catch (
      error
    ) {
      console.error(
        "Community ImgBB upload failed:",
        error
      );

      throw new AppError(
        502,
        "Unable to upload Community image"
      );
    }

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
      url:
        String(url),
    };
  };

/* ============================================================
   EXPORT
============================================================ */

export const CommunityService = {
  getFeedFromDB,

  createPostInDB,

  updatePostInDB,

  deleteOwnPostFromDB,

  toggleLikeInDB,

  addCommentInDB,

  addReplyInDB,

  getFarmerProfileFromDB,

  getAdminPostsFromDB,

  removePostByAdminInDB,

  warnFarmerByAdminInDB,

  uploadImageToImgBB,
};