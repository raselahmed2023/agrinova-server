import axios from "axios";
import mongoose, {
  isValidObjectId,
  Types,
} from "mongoose";

import AppError from "../../utils/AppError";

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

const getAuthUserCollection = () => {
  const authDb =
    mongoose.connection.useDb(
      "AgriNove-auth",
      {
        useCache: true,
      }
    );

  return authDb.collection(
    "user"
  );
};

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

const avatarFromUser = (
  user:
    | Record<string, any>
    | undefined
    | null
) => {
  return String(
    user?.avatar ||
      user?.image ||
      ""
  );
};

const getAuthProfilesMap =
  async (
    ids: string[]
  ) => {
    const uniqueIds = [
      ...new Set(
        ids
          .map(String)
          .filter(
            (
              id
            ) =>
              isValidObjectId(
                id
              )
          )
      ),
    ];

    const map =
      new Map<
        string,
        Record<
          string,
          any
        >
      >();

    if (
      uniqueIds.length ===
      0
    ) {
      return map;
    }

    const objectIds =
      uniqueIds.map(
        (
          id
        ) =>
          new Types.ObjectId(
            id
          )
      );

    const users =
      await getAuthUserCollection()
        .find({
          _id: {
            $in:
              objectIds as any,
          },
        })
        .project({
          name: 1,
          avatar: 1,
          image: 1,
          location: 1,
          role: 1,
          createdAt: 1,
        })
        .toArray();

    users.forEach(
      (
        user
      ) => {
        map.set(
          String(
            user._id
          ),
          user
        );
      }
    );

    return map;
  };

const collectPostUserIds =
  (
    posts: any[]
  ) => {
    const ids:
      string[] = [];

    posts.forEach(
      (
        post
      ) => {
        if (
          post?.authorId
        ) {
          ids.push(
            String(
              post.authorId
            )
          );
        }

        (
          post?.comments ||
          []
        ).forEach(
          (
            comment: any
          ) => {
            if (
              comment?.authorId
            ) {
              ids.push(
                String(
                  comment.authorId
                )
              );
            }

            (
              comment?.replies ||
              []
            ).forEach(
              (
                reply: any
              ) => {
                if (
                  reply?.authorId
                ) {
                  ids.push(
                    String(
                      reply.authorId
                    )
                  );
                }
              }
            );
          }
        );
      }
    );

    return ids;
  };

const sanitizePost = (
  post: any,
  viewerId?: string,
  profiles:
    Map<
      string,
      Record<
        string,
        any
      >
    > = new Map()
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

  const postAuthor =
    profiles.get(
      String(
        plain.authorId
      )
    );

  const comments =
    Array.isArray(
      plain?.comments
    )
      ? plain.comments.map(
          (
            comment: any
          ) => {
            const commentAuthor =
              profiles.get(
                String(
                  comment.authorId
                )
              );

            const replies =
              Array.isArray(
                comment.replies
              )
                ? comment.replies.map(
                    (
                      reply: any
                    ) => {
                      const replyAuthor =
                        profiles.get(
                          String(
                            reply.authorId
                          )
                        );

                      return {
                        ...reply,

                        authorName:
                          replyAuthor
                            ?.name ||
                          reply.authorName,

                        authorAvatar:
                          avatarFromUser(
                            replyAuthor
                          ),
                      };
                    }
                  )
                : [];

            return {
              ...comment,

              authorName:
                commentAuthor
                  ?.name ||
                comment.authorName,

              authorAvatar:
                avatarFromUser(
                  commentAuthor
                ),

              replies,
            };
          }
        )
      : [];

  return {
    ...plain,

    authorName:
      postAuthor?.name ||
      plain.authorName,

    authorAvatar:
      avatarFromUser(
        postAuthor
      ),

    likes,

    comments,

    likeCount:
      likes.length,

    commentCount:
      comments.length,

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

const hydratePosts =
  async (
    posts: any[],
    viewerId?: string
  ) => {
    const profiles =
      await getAuthProfilesMap(
        collectPostUserIds(
          posts
        )
      );

    return posts.map(
      (
        post
      ) =>
        sanitizePost(
          post,
          viewerId,
          profiles
        )
    );
};

/* ============================================================
   PUBLIC FEED
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

        CommunityPost.countDocuments({
          status:
            "ACTIVE",
        }),
      ]);

    const hydrated =
      await hydratePosts(
        posts as any[],
        viewerId
      );

    return {
      data:
        hydrated,

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

    requireObjectId(
      user.id,
      "farmer id"
    );

    const authUser =
      await getAuthUserCollection().findOne(
        {
          _id:
            new Types.ObjectId(
              user.id
            ) as any,
        }
      );

    const created =
      await CommunityPost.create(
        {
          authorId:
            new Types.ObjectId(
              user.id
            ),

          authorName:
            authUser?.name ||
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

    const hydrated =
      await hydratePosts(
        [
          created.toObject(),
        ],
        user.id
      );

    return hydrated[0];
  };

/* ============================================================
   OWN POST
============================================================ */

const getOwnPost =
  async (
    postId: string,
    farmerId: string
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
   UPDATE POST
============================================================ */

const updatePostInDB =
  async (
    postId: string,
    farmerId: string,

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

    const hydrated =
      await hydratePosts(
        [
          post.toObject(),
        ],
        farmerId
      );

    return hydrated[0];
  };

/* ============================================================
   DELETE POST
============================================================ */

const deleteOwnPostFromDB =
  async (
    postId: string,
    farmerId: string
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
   LIKE
============================================================ */

const toggleLikeInDB =
  async (
    postId: string,
    farmerId: string
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
      await CommunityPost.findOne({
        _id:
          new Types.ObjectId(
            postId
          ),

        status:
          "ACTIVE",
      });

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

    const hydrated =
      await hydratePosts(
        [
          post.toObject(),
        ],
        farmerId
      );

    return hydrated[0];
  };

/* ============================================================
   COMMENT
============================================================ */

const addCommentInDB =
  async (
    postId: string,
    content: string,
    user: CommunityUser
  ) => {
    requireObjectId(
      postId,
      "post id"
    );

    requireObjectId(
      user.id,
      "farmer id"
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

    const authUser =
      await getAuthUserCollection().findOne(
        {
          _id:
            new Types.ObjectId(
              user.id
            ) as any,
        }
      );

    const post =
      await CommunityPost.findOne({
        _id:
          new Types.ObjectId(
            postId
          ),

        status:
          "ACTIVE",
      });

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
          authUser?.name ||
          user.name ||
          user.email.split(
            "@"
          )[0],

        content,

        replies: [],
      } as never
    );

    await post.save();

    const newComment =
      post.comments[
        post.comments.length -
          1
      ];

    return {
      ...(
        newComment.toObject
          ? newComment.toObject()
          : newComment
      ),

      authorAvatar:
        avatarFromUser(
          authUser
        ),
    };
  };

/* ============================================================
   REPLY
============================================================ */

const addReplyInDB =
  async (
    postId: string,
    commentId: string,
    content: string,
    user: CommunityUser
  ) => {
    requireObjectId(
      postId,
      "post id"
    );

    requireObjectId(
      commentId,
      "comment id"
    );

    requireObjectId(
      user.id,
      "farmer id"
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

    const authUser =
      await getAuthUserCollection().findOne(
        {
          _id:
            new Types.ObjectId(
              user.id
            ) as any,
        }
      );

    const post =
      await CommunityPost.findOne({
        _id:
          new Types.ObjectId(
            postId
          ),

        status:
          "ACTIVE",
      });

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
          authUser?.name ||
          user.name ||
          user.email.split(
            "@"
          )[0],

        content,
      } as never
    );

    await post.save();

    const reply =
      comment.replies[
        comment.replies.length -
          1
      ];

    return {
      ...(
        reply.toObject
          ? reply.toObject()
          : reply
      ),

      authorAvatar:
        avatarFromUser(
          authUser
        ),
    };
  };

/* ============================================================
   FARMER PROFILE
   IMPORTANT:
   READ FROM AgriNove-auth DATABASE
============================================================ */

const getFarmerProfileFromDB =
  async (
    farmerId: string,
    viewerId: string,

    query: Record<
      string,
      unknown
    >
  ) => {
    requireObjectId(
      farmerId,
      "farmer id"
    );

    const farmerObjectId =
      new Types.ObjectId(
        farmerId
      );

    const farmer =
      await getAuthUserCollection().findOne(
        {
          _id:
            farmerObjectId as any,

          role:
            "FARMER",
        },

        {
          projection: {
            password: 0,
            email: 0,
            phone: 0,
          },
        }
      );

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

    const [
      posts,
      total,
    ] =
      await Promise.all([
        CommunityPost.find({
          authorId:
            farmerObjectId,

          status:
            "ACTIVE",
        })
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        CommunityPost.countDocuments({
          authorId:
            farmerObjectId,

          status:
            "ACTIVE",
        }),
      ]);

    const hydrated =
      await hydratePosts(
        posts as any[],
        viewerId
      );

    return {
      profile: {
        _id:
          String(
            farmer._id
          ),

        name:
          String(
            farmer.name ||
              "AgriNova Farmer"
          ),

        avatar:
          avatarFromUser(
            farmer
          ),

        location:
          String(
            farmer.location ||
              ""
          ),

        joinedAt:
          farmer.createdAt,

        postCount:
          total,
      },

      posts:
        hydrated,

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
   MY PROFILE
============================================================ */

const getMyProfileFromDB =
  async (
    farmerId: string
  ) => {
    requireObjectId(
      farmerId,
      "farmer id"
    );

    const farmer =
      await getAuthUserCollection().findOne(
        {
          _id:
            new Types.ObjectId(
              farmerId
            ) as any,

          role:
            "FARMER",
        },

        {
          projection: {
            password: 0,
            email: 0,
            phone: 0,
          },
        }
      );

    if (!farmer) {
      throw new AppError(
        404,
        "Farmer profile not found"
      );
    }

    const postCount =
      await CommunityPost.countDocuments({
        authorId:
          new Types.ObjectId(
            farmerId
          ),

        status:
          "ACTIVE",
      });

    return {
      _id:
        String(
          farmer._id
        ),

      name:
        String(
          farmer.name ||
            "AgriNova Farmer"
        ),

      avatar:
        avatarFromUser(
          farmer
        ),

      location:
        String(
          farmer.location ||
            ""
        ),

      joinedAt:
        farmer.createdAt,

      postCount,
    };
  };

/* ============================================================
   UPDATE MY PROFILE
============================================================ */

const updateMyProfileInDB =
  async (
    farmerId: string,

    payload: {
      avatar?: string;
      location?: string;
    }
  ) => {
    requireObjectId(
      farmerId,
      "farmer id"
    );

    const updates:
      Record<
        string,
        unknown
      > = {
      updatedAt:
        new Date(),
    };

    if (
      payload.avatar !==
      undefined
    ) {
      updates.avatar =
        payload.avatar;

      /*
        Better Auth default image field too.
        Navbar/session compatibility.
      */
      updates.image =
        payload.avatar;
    }

    if (
      payload.location !==
      undefined
    ) {
      updates.location =
        payload.location;
    }

    const farmer =
      await getAuthUserCollection().findOneAndUpdate(
        {
          _id:
            new Types.ObjectId(
              farmerId
            ) as any,

          role:
            "FARMER",
        },

        {
          $set:
            updates,
        },

        {
          returnDocument:
            "after",

          projection: {
            password: 0,
            email: 0,
            phone: 0,
          },
        }
      );

    if (!farmer) {
      throw new AppError(
        404,
        "Farmer profile not found"
      );
    }

    const postCount =
      await CommunityPost.countDocuments({
        authorId:
          new Types.ObjectId(
            farmerId
          ),

        status:
          "ACTIVE",
      });

    return {
      _id:
        String(
          farmer._id
        ),

      name:
        String(
          farmer.name ||
            "AgriNova Farmer"
        ),

      avatar:
        avatarFromUser(
          farmer
        ),

      location:
        String(
          farmer.location ||
            ""
        ),

      joinedAt:
        farmer.createdAt,

      postCount,
    };
  };

/* ============================================================
   ADMIN POSTS
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
      any = {};

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

      const regex =
        new RegExp(
          escaped,
          "i"
        );

      filter.$or = [
        {
          authorName:
            regex,
        },

        {
          content:
            regex,
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

    const hydrated =
      await hydratePosts(
        posts as any[]
      );

    return {
      data:
        hydrated,

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
   ADMIN REMOVE
============================================================ */

const removePostByAdminInDB =
  async (
    postId: string,
    adminId: string,
    reason: string
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

    const hydrated =
      await hydratePosts(
        [
          post.toObject(),
        ]
      );

    return hydrated[0];
  };

/* ============================================================
   ADMIN WARNING
============================================================ */

const warnFarmerByAdminInDB =
  async (
    postId: string,
    reason: string
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
   OLD SERVER IMAGE UPLOAD
   Kept for compatibility.
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

    const form =
      new URLSearchParams();

    form.set(
      "image",
      file.buffer.toString(
        "base64"
      )
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

          timeout:
            25000,
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
        "Image upload failed"
      );
    }

    return {
      url:
        String(url),
    };
  };

export const CommunityService = {
  getFeedFromDB,
  createPostInDB,
  updatePostInDB,
  deleteOwnPostFromDB,
  toggleLikeInDB,
  addCommentInDB,
  addReplyInDB,

  getFarmerProfileFromDB,
  getMyProfileFromDB,
  updateMyProfileInDB,

  getAdminPostsFromDB,
  removePostByAdminInDB,
  warnFarmerByAdminInDB,

  uploadImageToImgBB,
};