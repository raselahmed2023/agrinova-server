import AppError from "../../utils/AppError";
import { IProduct, IProductQueryParams } from "./product.interface";
import { Product } from "./product.model";

const createProductInDB = async (payload: IProduct) => {
  const result = await Product.create(payload);
  return result;
};

const getProductsFromDB = async (query: IProductQueryParams) => {
  const queryObj: Record<string, any> = {};

  // Search filter (matches title or description)
  if (query.search) {
    const searchRegex = new RegExp(query.search, "i");
    queryObj.$or = [{ title: searchRegex }, { description: searchRegex }];
  }

  // Category filter
  if (query.category) {
    queryObj.category = query.category;
  }

  // Status filter
  if (query.status) {
    queryObj.status = query.status;
  }

  // Price range filter
  if (query.minPrice || query.maxPrice) {
    queryObj.price = {};
    if (query.minPrice) {
      queryObj.price.$gte = Number(query.minPrice);
    }
    if (query.maxPrice) {
      queryObj.price.$lte = Number(query.maxPrice);
    }
  }

  // Pagination & Sorting defaults
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;
  const sortConditions: Record<string, 1 | -1> = {
    [sortBy]: sortOrder,
  };

  const [products, total] = await Promise.all([
    Product.find(queryObj).sort(sortConditions).skip(skip).limit(limit),
    Product.countDocuments(queryObj),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: products,
  };
};

const getProductByIdFromDB = async (id: string) => {
  const result = await Product.findById(id);
  if (!result) {
    throw new AppError(404, "Product not found");
  }
  return result;
};

export const ProductService = {
  createProductInDB,
  getProductsFromDB,
  getProductByIdFromDB,
};

