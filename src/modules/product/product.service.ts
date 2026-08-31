import { isValidObjectId } from "mongoose";

import AppError from "../../utils/AppError";
import {
  IMyListingsQueryParams,
  IProduct,
  IProductQueryParams,
} from "./product.interface";
import { Product } from "./product.model";

const createProductInDB = async (payload: IProduct) => {
  return Product.create(payload);
};

const getProductsFromDB = async (query: IProductQueryParams) => {
  const queryObj: Record<string, any> = {};

  if (query.search) {
    const searchRegex = new RegExp(query.search, "i");
    queryObj.$or = [
      { title: searchRegex },
      { description: searchRegex },
    ];
  }

  if (query.category && query.category !== "all") {
    queryObj.category = query.category;
  }

  if (query.status) {
    queryObj.status = query.status;
  }

  if (query.minPrice || query.maxPrice) {
    queryObj.price = {};

    if (query.minPrice) {
      queryObj.price.$gte = Number(query.minPrice);
    }

    if (query.maxPrice) {
      queryObj.price.$lte = Number(query.maxPrice);
    }
  }

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;

  let sortConditions: Record<string, 1 | -1> = {
    createdAt: -1,
  };

  if (query.sortBy) {
    sortConditions = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };
  }

  const [products, total] = await Promise.all([
    Product.find(queryObj)
      .sort(sortConditions)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(queryObj),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: products,
  };
};

const getProductByIdFromDB = async (id: string) => {
  if (!isValidObjectId(id)) {
    throw new AppError(400, "Invalid product ID");
  }

  const product = await Product.findById(id);

  if (!product) {
    throw new AppError(404, "Product not found");
  }

  return product;
};

const getMyListingsFromDB = async (
  query: IMyListingsQueryParams,
  sellerEmail: string
) => {
  const queryObj: Record<string, any> = {
    sellerEmail: sellerEmail.trim().toLowerCase(),
  };

  if (query.search) {
    const searchRegex = new RegExp(query.search, "i");
    queryObj.$or = [
      { title: searchRegex },
      { description: searchRegex },
    ];
  }

  if (query.category && query.category !== "all") {
    queryObj.category = query.category;
  }

  if (query.status) {
    queryObj.status = query.status;
  }

  if (query.minPrice || query.maxPrice) {
    queryObj.price = {};

    if (query.minPrice) {
      queryObj.price.$gte = Number(query.minPrice);
    }

    if (query.maxPrice) {
      queryObj.price.$lte = Number(query.maxPrice);
    }
  }

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const [products, total] = await Promise.all([
    Product.find(queryObj)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(queryObj),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: products,
  };
};

const updateProductInDB = async (
  id: string,
  sellerEmail: string,
  payload: Partial<IProduct>
) => {
  if (!isValidObjectId(id)) {
    throw new AppError(400, "Invalid product ID");
  }

  const {
    sellerEmail: _ignoredSellerEmail,
    sellerName: _ignoredSellerName,
    isFeatured: _ignoredFeatured,
    ...safePayload
  } = payload;

  const result = await Product.findOneAndUpdate(
    {
      _id: id,
      sellerEmail: sellerEmail.trim().toLowerCase(),
    },
    safePayload,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!result) {
    throw new AppError(
      404,
      "Product not found or you are not allowed to update it"
    );
  }

  return result;
};

const deleteProductFromDB = async (
  id: string,
  sellerEmail: string
) => {
  if (!isValidObjectId(id)) {
    throw new AppError(400, "Invalid product ID");
  }

  const result = await Product.findOneAndDelete({
    _id: id,
    sellerEmail: sellerEmail.trim().toLowerCase(),
  });

  if (!result) {
    throw new AppError(
      404,
      "Product not found or you are not allowed to delete it"
    );
  }

  return result;
};

export const ProductService = {
  createProductInDB,
  getProductsFromDB,
  getProductByIdFromDB,
  getMyListingsFromDB,
  updateProductInDB,
  deleteProductFromDB,
};
