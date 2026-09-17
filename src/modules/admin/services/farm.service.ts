import mongoose from "mongoose";

import {
  Farm,
} from "../../../app/modules/farm/farm.model";

export const FarmService = {

  async getAdminFarmsFromDB(
    query:
      Record<
        string,
        unknown
      >
  ) {
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
        100
      );

    const skip =
      (
        page - 1
      ) *
      limit;

    const filter:
      Record<
        string,
        unknown
      > = {};

    /**
     * District filter
     */
    if (
      typeof query.district ===
        "string" &&
      query.district.trim()
    ) {
      filter.district = {
        $regex:
          query.district.trim(),

        $options:
          "i",
      };
    }

    /**
     * Farm status filter
     */
    if (
      typeof query.status ===
        "string" &&
      query.status.trim() &&
      query.status !==
        "All Statuses"
    ) {
      filter.status =
        query.status.trim();
    }


    if (
      typeof query.farmType ===
        "string" &&
      query.farmType.trim()
    ) {
      filter.farmType =
        query.farmType.trim();
    }


    if (
      typeof query.search ===
        "string" &&
      query.search.trim()
    ) {
      const escaped =
        query.search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

      filter.$or = [
        {
          name: {
            $regex:
              escaped,

            $options:
              "i",
          },
        },

        {
          farmerEmail: {
            $regex:
              escaped,

            $options:
              "i",
          },
        },

        {
          division: {
            $regex:
              escaped,

            $options:
              "i",
          },
        },

        {
          district: {
            $regex:
              escaped,

            $options:
              "i",
          },
        },

        {
          upazila: {
            $regex:
              escaped,

            $options:
              "i",
          },
        },

        {
          soilType: {
            $regex:
              escaped,

            $options:
              "i",
          },
        },
      ];
    }

    const [
      data,
      total,
    ] =
      await Promise.all([
        Farm.find(
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
          .lean(),

        Farm.countDocuments(
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


  async getAdminFarmByIdFromDB(
    farmId:
      string
  ) {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          farmId
        )
    ) {
      return null;
    }

    return Farm.findById(
      farmId
    ).lean();
  },
};