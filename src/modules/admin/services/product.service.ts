import { isValidObjectId } from "mongoose";

import AppError from "../../../utils/AppError";
import { NotificationService } from "../../notification/notification.service";
import { Product } from "../../product/product.model";
import { User } from "../../user/user.model";

const resolveSellerUserId = async (product: any): Promise<string | null> => {
  if (product.sellerId) return String(product.sellerId);

  if (product.sellerEmail) {
    const user = await User.findOne({
      email: String(product.sellerEmail).trim().toLowerCase(),
    })
      .select("_id")
      .lean();

    if (user?._id) return String(user._id);
  }

  return null;
};

const notifySeller = async (
  product: any,
  type:
    | "MARKETPLACE_PRODUCT_HIDDEN"
    | "MARKETPLACE_PRODUCT_REMOVED"
    | "MARKETPLACE_PRODUCT_RESTORED",
  title: string,
  message: string
) => {
  const userId = await resolveSellerUserId(product);
  if (!userId) return;

  await NotificationService.createNotification({
    userId,
    type,
    title,
    message,
    href: "/marketplace/listings",
    data: {
      productId: String(product._id),
      productTitle: product.title,
    },
  });
};

export const ProductService = {
  async getAdminProductsFromDB(query: Record<string, unknown>) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      isDeleted: { $ne: true },
    };

    if (typeof query.status === "string" && query.status) {
      filter.status = query.status;
    }

    if (typeof query.category === "string" && query.category) {
      filter.category = query.category;
    }

    if (typeof query.search === "string" && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { sellerName: { $regex: escaped, $options: "i" } },
        { sellerEmail: { $regex: escaped, $options: "i" } },
        { district: { $regex: escaped, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const [live, outOfStock, hidden] = await Promise.all([
      Product.countDocuments({
        isDeleted: { $ne: true },
        status: "available",
      }),
      Product.countDocuments({
        isDeleted: { $ne: true },
        status: "out_of_stock",
      }),
      Product.countDocuments({
        isDeleted: { $ne: true },
        status: "disabled",
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        counts: {
          live,
          outOfStock,
          hidden,
        },
      },
    };
  },

  async getAdminProductByIdFromDB(productId: string) {
    if (!isValidObjectId(productId)) return null;

    return Product.findOne({
      _id: productId,
      isDeleted: { $ne: true },
    }).lean();
  },

  /**
   * Hide a rule-violating listing. The product remains visible to its farmer
   * in My Listings, but disappears from the public marketplace.
   */
  async moderateProductInDB(
    productId: string,
    reason: string,
    adminEmail?: string
  ) {
    if (!isValidObjectId(productId)) {
      throw new AppError(400, "Invalid product ID");
    }

    const cleanReason = reason?.trim();
    if (!cleanReason) {
      throw new AppError(400, "A moderation reason is required");
    }

    const product = await Product.findOne({
      _id: productId,
      isDeleted: { $ne: true },
    });

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    product.status = "disabled";
    product.moderationReason = cleanReason;
    product.moderatedAt = new Date();
    product.moderatedBy = adminEmail;
    product.rejectionReason = undefined;

    await product.save();

    await notifySeller(
      product,
      "MARKETPLACE_PRODUCT_HIDDEN",
      "Marketplace listing hidden",
      `Your listing “${product.title}” was hidden by AgriNova moderation. Reason: ${cleanReason}`
    );

    return product;
  },

  async restoreProductInDB(productId: string, adminEmail?: string) {
    if (!isValidObjectId(productId)) {
      throw new AppError(400, "Invalid product ID");
    }

    const product = await Product.findOne({
      _id: productId,
      isDeleted: { $ne: true },
    });

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    product.status = Number(product.quantity) > 0 ? "available" : "out_of_stock";
    product.moderationReason = undefined;
    product.moderatedAt = new Date();
    product.moderatedBy = adminEmail;
    product.rejectionReason = undefined;

    await product.save();

    await notifySeller(
      product,
      "MARKETPLACE_PRODUCT_RESTORED",
      "Marketplace listing restored",
      `Your listing “${product.title}” is active again on the AgriNova Marketplace.`
    );

    return product;
  },

  /** Soft delete and notify the farmer. */
  async removeProductInDB(
    productId: string,
    reason: string,
    adminEmail?: string
  ) {
    if (!isValidObjectId(productId)) {
      throw new AppError(400, "Invalid product ID");
    }

    const cleanReason = reason?.trim();
    if (!cleanReason) {
      throw new AppError(400, "A removal reason is required");
    }

    const product = await Product.findOne({
      _id: productId,
      isDeleted: { $ne: true },
    });

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    product.isDeleted = true;
    product.status = "disabled";
    product.moderationReason = cleanReason;
    product.moderatedAt = new Date();
    product.moderatedBy = adminEmail;

    await product.save();

    await notifySeller(
      product,
      "MARKETPLACE_PRODUCT_REMOVED",
      "Marketplace listing removed",
      `Your listing “${product.title}” was removed from AgriNova. Reason: ${cleanReason}`
    );

    return product;
  },

  /** Backward-compatible aliases for older clients. */
  async disableProductInDB(productId: string, reason?: string, adminEmail?: string) {
    return this.moderateProductInDB(
      productId,
      reason?.trim() || "Listing hidden by AgriNova moderation.",
      adminEmail
    );
  },

  async approveProductInDB(productId: string, adminEmail?: string) {
    return this.restoreProductInDB(productId, adminEmail);
  },

  async rejectProductInDB(productId: string, reason?: string, adminEmail?: string) {
    return this.moderateProductInDB(
      productId,
      reason?.trim() || "Listing hidden by AgriNova moderation.",
      adminEmail
    );
  },
};
