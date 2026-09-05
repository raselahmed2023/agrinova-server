import {
  isValidObjectId,
} from "mongoose";

import {
  Product,
} from "../../product/product.model";

export const ProductService =
  {
    async getAdminProductsFromDB(
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
            ) || 10,
            1
          ),
          50
        );

      const skip =
        (
          page - 1
        ) *
        limit;

      const filter:
        Record<
          string,
          any
        > = {
          isDeleted: {
            $ne: true,
          },
        };

      if (
        typeof query.status ===
          "string" &&
        query.status
      ) {
        filter.status =
          query.status;
      }

      if (
        typeof query.category ===
          "string" &&
        query.category
      ) {
        filter.category =
          query.category;
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
            title: {
              $regex:
                escaped,

              $options:
                "i",
            },
          },

          {
            sellerName: {
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
        ];
      }

      const [
        data,
        total,
      ] =
        await Promise.all([
          Product.find(
            filter
          )
            .sort({
              createdAt:
                -1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),

          Product.countDocuments(
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

    async getAdminProductByIdFromDB(
      productId:
        string
    ) {
      if (
        !isValidObjectId(
          productId
        )
      ) {
        return null;
      }

      return Product.findOne(
        {
          _id:
            productId,

          isDeleted: {
            $ne: true,
          },
        }
      ).lean();
    },

    async disableProductInDB(
      productId:
        string
    ) {
      if (
        !isValidObjectId(
          productId
        )
      ) {
        return null;
      }

      return Product.findOneAndUpdate(
        {
          _id:
            productId,

          isDeleted: {
            $ne: true,
          },
        },

        {
          $set: {
            status:
              "disabled",
          },
        },

        {
          new: true,

          runValidators:
            true,
        }
      );
    },

    async restoreProductInDB(
      productId:
        string
    ) {
      if (
        !isValidObjectId(
          productId
        )
      ) {
        return null;
      }

      const product =
        await Product.findOne(
          {
            _id:
              productId,

            isDeleted: {
              $ne: true,
            },
          }
        );

      if (!product) {
        return null;
      }

      product.status =
        Number(
          product.quantity
        ) > 0
          ? "available"
          : "out_of_stock";

      await product.save();

      return product;
    },

    async removeProductInDB(
      productId:
        string
    ) {
      if (
        !isValidObjectId(
          productId
        )
      ) {
        return null;
      }

      return Product.findOneAndUpdate(
        {
          _id:
            productId,

          isDeleted: {
            $ne: true,
          },
        },

        {
          $set: {
            isDeleted:
              true,

            status:
              "disabled",
          },
        },

        {
          new: true,

          runValidators:
            true,
        }
      );
    },
  };