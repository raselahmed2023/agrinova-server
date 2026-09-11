import {
  isValidObjectId,
} from "mongoose";

import AppError from "../../../utils/AppError";

import {
  Product,
} from "../../product/product.model";

export const ProductService = {
  async getAdminProductsFromDB(
    query: Record<
      string,
      unknown
    >
  ) {
    const page =
      Math.max(
        Number(query.page) || 1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(query.limit) || 10,
          1
        ),
        50
      );

    const skip =
      (page - 1) * limit;

    const filter: Record<
      string,
      any
    > = {
      isDeleted: {
        $ne: true,
      },
    };

    const andConditions: Record<string, any>[] = [];

    if (
      typeof query.status ===
        "string" &&
      query.status
    ) {
      if (query.status === "pending") {
        /*
         * Backward compatibility: old Agrinova listings could be saved as
         * available/out_of_stock without ever receiving approvedAt. Those
         * listings are not truly approved, so expose them to admins as
         * pending review instead of letting them disappear from moderation.
         */
        andConditions.push({
          $or: [
            { status: "pending" },
            {
              status: {
                $in: ["available", "out_of_stock"],
              },
              approvedAt: { $exists: false },
            },
            {
              status: {
                $in: ["available", "out_of_stock"],
              },
              approvedAt: null,
            },
          ],
        });
      } else if (
        query.status === "available" ||
        query.status === "out_of_stock"
      ) {
        filter.status = query.status;
        filter.approvedAt = {
          $exists: true,
          $ne: null,
        };
      } else {
        filter.status = query.status;
      }
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

      andConditions.push({
        $or: [
          {
            title: {
              $regex: escaped,
              $options: "i",
            },
          },

          {
            sellerName: {
              $regex: escaped,
              $options: "i",
            },
          },

          {
            district: {
              $regex: escaped,
              $options: "i",
            },
          },
        ],
      });
    }

    if (andConditions.length) {
      filter.$and = andConditions;
    }


    const [
      data,
      total,
    ] = await Promise.all([
      Product.find(filter)
        .sort({
          createdAt: -1,
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
              total / limit
            ),
            1
          ),
      },
    };
  },

  async getAdminProductByIdFromDB(
    productId: string
  ) {
    if (
      !isValidObjectId(
        productId
      )
    ) {
      return null;
    }

    return Product.findOne({
      _id: productId,

      isDeleted: {
        $ne: true,
      },
    }).lean();
  },

  /**
   * =====================================================
   * APPROVE PRODUCT
   * =====================================================
   */
  async approveProductInDB(
    productId: string,
    adminEmail?: string
  ) {
    if (
      !isValidObjectId(
        productId
      )
    ) {
      throw new AppError(
        400,
        "Invalid product ID"
      );
    }

    const product =
      await Product.findOne({
        _id: productId,

        isDeleted: {
          $ne: true,
        },
      });

    if (!product) {
      throw new AppError(
        404,
        "Product not found"
      );
    }

    if (
      product.status ===
      "disabled"
    ) {
      throw new AppError(
        400,
        "Disabled product cannot be approved"
      );
    }

    if (
      Number(product.quantity) <=
      0
    ) {
      throw new AppError(
        400,
        "Product must have available quantity before approval"
      );
    }

    product.status =
      "available";

    product.approvedAt =
      new Date();

    product.approvedBy =
      adminEmail;

    product.rejectionReason =
      undefined;

    await product.save();

    return product;
  },

  /**
   * =====================================================
   * REJECT PRODUCT
   * =====================================================
   */
  async rejectProductInDB(
    productId: string,
    reason?: string
  ) {
    if (
      !isValidObjectId(
        productId
      )
    ) {
      throw new AppError(
        400,
        "Invalid product ID"
      );
    }

    const product =
      await Product.findOne({
        _id: productId,

        isDeleted: {
          $ne: true,
        },
      });

    if (!product) {
      throw new AppError(
        404,
        "Product not found"
      );
    }

    /**
     * Rejection does not delete
     * the product.
     *
     * Farmer can see it in My Listings.
     */
    product.status =
      "rejected";

    product.approvedAt =
      undefined;

    product.approvedBy =
      undefined;

    product.rejectionReason =
      reason?.trim() ||
      "Product rejected by admin";

    await product.save();

    return product;
  },

  /**
   * =====================================================
   * DISABLE PRODUCT
   * =====================================================
   */
  async disableProductInDB(
    productId: string
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
        _id: productId,

        isDeleted: {
          $ne: true,
        },
      },

      {
        $set: {
          status: "disabled",
        },
      },

      {
        new: true,

        runValidators: true,
      }
    );
  },

  /**
   * =====================================================
   * RESTORE PRODUCT
   * =====================================================
   */
  async restoreProductInDB(
    productId: string
  ) {
    if (
      !isValidObjectId(
        productId
      )
    ) {
      return null;
    }

    const product =
      await Product.findOne({
        _id: productId,

        isDeleted: {
          $ne: true,
        },
      });

    if (!product) {
      return null;
    }

    /*
     * Restore never bypasses moderation. The farmer/admin must
     * review the listing and approve it again before it becomes public.
     */
    product.status = "pending";
    product.approvedAt = undefined;
    product.approvedBy = undefined;
    product.rejectionReason = undefined;

    await product.save();

    return product;
  },

  /**
   * =====================================================
   * REMOVE PRODUCT
   * =====================================================
   */
  async removeProductInDB(
    productId: string
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
        _id: productId,

        isDeleted: {
          $ne: true,
        },
      },

      {
        $set: {
          isDeleted: true,

          status: "disabled",
        },
      },

      {
        new: true,

        runValidators: true,
      }
    );
  },
};