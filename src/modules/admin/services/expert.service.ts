import mongoose from "mongoose";

import AppError from "../../../utils/AppError";

const getUserModel = () =>
  mongoose.connection
    .useDb(
      "AgriNove-auth",
      {
        useCache:
          true,
      }
    )
    .collection(
      "user"
    );

const objectId = (
  value:
    string
) =>
  mongoose.Types.ObjectId.isValid(
    value
  )
    ? new mongoose.Types.ObjectId(
        value
      )
    : null;

const escapeRegex = (
  value:
    string
) =>
  value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

export const ExpertService = {
  async getPendingExpertsFromDB(
    query:
      Record<
        string,
        unknown
      > = {}
  ) {
    const userCollection =
      getUserModel();

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
        50
      );

    const skip =
      (page - 1) *
      limit;

    const filter:
      Record<
        string,
        unknown
      > = {
      role:
        "EXPERT",

      status:
        "PENDING",
    };

    if (
      typeof query.search ===
        "string" &&
      query.search.trim()
    ) {
      const rx =
        new RegExp(
          escapeRegex(
            query.search.trim()
          ),
          "i"
        );

      filter.$or = [
        {
          name:
            rx,
        },

        {
          email:
            rx,
        },

        {
          specialization:
            rx,
        },

        {
          qualification:
            rx,
        },
      ];
    }

    const [
      data,
      total,
    ] =
      await Promise.all([
        userCollection
          .find(
            filter
          )
          .sort({
            createdAt:
              -1,
          })
          .skip(
            skip
          )
          .limit(
            limit
          )
          .project({
            password:
              0,

            statusBeforeBlock:
              0,
          })
          .toArray(),

        userCollection.countDocuments(
          filter
        ),
      ]);

    return {
      data,

      meta: {
        page,

        limit,

        total,

        totalPages:
          Math.max(
            Math.ceil(
              total /
                limit
            ),
            1
          ),
      },
    };
  },

  async getExpertByIdFromDB(
    expertId:
      string
  ) {
    const _id =
      objectId(
        expertId
      );

    if (!_id) {
      return null;
    }

    return getUserModel().findOne(
      {
        _id,

        role:
          "EXPERT",
      },

      {
        projection: {
          password:
            0,

          statusBeforeBlock:
            0,
        },
      }
    );
  },

  async approveExpertInDB(
    expertId:
      string
  ) {
    const _id =
      objectId(
        expertId
      );

    if (!_id) {
      throw new AppError(
        400,
        "Invalid expert ID"
      );
    }

    const userCollection =
      getUserModel();

    const expert =
      await userCollection.findOne(
        {
          _id,

          role:
            "EXPERT",
        }
      );

    if (!expert) {
      throw new AppError(
        404,
        "Expert not found"
      );
    }

    if (
      [
        "APPROVED",
        "ACTIVE",
      ].includes(
        String(
          expert.status ||
            ""
        ).toUpperCase()
      )
    ) {
      throw new AppError(
        409,
        "Expert is already approved"
      );
    }

    return userCollection.findOneAndUpdate(
      {
        _id,

        role:
          "EXPERT",
      },

      {
        $set: {
          status:
            "APPROVED",

          rejectionReason:
            "",

          approvedAt:
            new Date(),

          updatedAt:
            new Date(),
        },
      },

      {
        returnDocument:
          "after",

        projection: {
          password:
            0,

          statusBeforeBlock:
            0,
        },
      }
    );
  },

  async rejectExpertInDB(
    expertId:
      string,

    reason?:
      string
  ) {
    const _id =
      objectId(
        expertId
      );

    if (!_id) {
      throw new AppError(
        400,
        "Invalid expert ID"
      );
    }

    const userCollection =
      getUserModel();

    const expert =
      await userCollection.findOne(
        {
          _id,

          role:
            "EXPERT",
        }
      );

    if (!expert) {
      throw new AppError(
        404,
        "Expert not found"
      );
    }

    if (
      String(
        expert.status ||
          ""
      ).toUpperCase() ===
      "REJECTED"
    ) {
      throw new AppError(
        409,
        "Expert application is already rejected"
      );
    }

    return userCollection.findOneAndUpdate(
      {
        _id,

        role:
          "EXPERT",
      },

      {
        $set: {
          status:
            "REJECTED",

          rejectionReason:
            String(
              reason ||
                ""
            )
              .trim()
              .slice(
                0,
                500
              ),

          updatedAt:
            new Date(),
        },
      },

      {
        returnDocument:
          "after",

        projection: {
          password:
            0,

          statusBeforeBlock:
            0,
        },
      }
    );
  },
};