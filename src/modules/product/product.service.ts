import { isValidObjectId } from "mongoose";

import AppError from "../../utils/AppError";

import {
  IMyListingsQueryParams,
  IProduct,
  IProductQueryParams,
} from "./product.interface";

import { Product } from "./product.model";

type TSellerIdentity = {
  id: string;
  email: string;
};

const REVIEW_REQUIRED_FIELDS = new Set([
  "title",
  "description",
  "price",
  "category",
  "transactionType",
  "productionMethod",
  "unit",
  "images",
  "location",
  "division",
  "district",
  "upazila",
  "poultryDetails",
  "byProductUses",
]);

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSortConditions = (
  query: IProductQueryParams
): Record<string, 1 | -1> => {
  switch (query.sort) {
    case "oldest":
      return { createdAt: 1 };
    case "price_asc":
      return { price: 1 };
    case "price_desc":
      return { price: -1 };
    case "quantity_desc":
      return { quantity: -1 };
    case "newest":
      return { createdAt: -1 };
    default:
      break;
  }

  if (query.sortBy) {
    return {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };
  }

  return { createdAt: -1 };
};

const addAndCondition = (
  queryObj: Record<string, any>,
  condition: Record<string, any>
) => {
  queryObj.$and = [
    ...(Array.isArray(queryObj.$and) ? queryObj.$and : []),
    condition,
  ];
};

const applyCommonFilters = (
  queryObj: Record<string, any>,
  query: IProductQueryParams
) => {
  if (query.search?.trim()) {
    const searchRegex = new RegExp(
      escapeRegex(query.search.trim()),
      "i"
    );

    addAndCondition(queryObj, {
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { district: searchRegex },
      ],
    });
  }

  if (query.category && query.category !== "all") {
    queryObj.category = query.category;
  }

  if (query.transactionType) {
    queryObj.transactionType = query.transactionType;
  }

  if (query.productionMethod) {
    queryObj.productionMethod = query.productionMethod;
  }

  if (query.district?.trim()) {
    queryObj.district = new RegExp(
      escapeRegex(query.district.trim()),
      "i"
    );
  }

  if (query.location?.trim()) {
    const locationRegex = new RegExp(
      escapeRegex(query.location.trim()),
      "i"
    );

    addAndCondition(queryObj, {
      $or: [
        { location: locationRegex },
        { division: locationRegex },
        { district: locationRegex },
        { upazila: locationRegex },
      ],
    });
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    queryObj.price = {};

    if (query.minPrice !== undefined) {
      queryObj.price.$gte = Number(query.minPrice);
    }

    if (query.maxPrice !== undefined) {
      queryObj.price.$lte = Number(query.maxPrice);
    }
  }
};

const buildSellerCondition = (seller: TSellerIdentity) => ({
  $or: [
    { sellerId: seller.id },
    {
      sellerEmail: seller.email.trim().toLowerCase(),
    },
  ],
});

const valuesAreDifferent = (current: unknown, next: unknown) => {
  const normalize = (value: unknown) => {
    if (value && typeof value === "object" && "toObject" in (value as object)) {
      const maybeDocument = value as { toObject?: () => unknown };
      return maybeDocument.toObject?.() ?? value;
    }

    return value;
  };

  return (
    JSON.stringify(normalize(current) ?? null) !==
    JSON.stringify(normalize(next) ?? null)
  );
};

const clearApproval = (product: any) => {
  product.approvedAt = undefined;
  product.approvedBy = undefined;
};

const createProductInDB = async (payload: IProduct) => {
  const transactionType = payload.transactionType ?? "sale";
  const price = transactionType === "free" ? 0 : payload.price;

  if (transactionType === "sale" && price <= 0) {
    throw new AppError(
      400,
      "Sale products must have a price greater than 0"
    );
  }

  if (
    payload.category === "poultry" &&
    !payload.poultryDetails?.poultryType
  ) {
    throw new AppError(
      400,
      "Poultry type is required for poultry listings"
    );
  }

  return Product.create({
    ...payload,
    transactionType,
    productionMethod: payload.productionMethod ?? "conventional",
    price,
    poultryDetails:
      payload.category === "poultry"
        ? payload.poultryDetails
        : undefined,
    byProductUses:
      payload.category === "by_products"
        ? payload.byProductUses ?? []
        : [],
    status: "pending",
    approvedAt: undefined,
    approvedBy: undefined,
    rejectionReason: undefined,
    isDeleted: false,
  });
};

/** Public marketplace: only admin-approved listings are visible. */
const getProductsFromDB = async (query: IProductQueryParams) => {
  const queryObj: Record<string, any> = {
    isDeleted: { $ne: true },
    approvedAt: { $exists: true, $ne: null },
    status:
      query.status === "out_of_stock"
        ? "out_of_stock"
        : "available",
  };

  applyCommonFilters(queryObj, query);

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(query.limit) || 12, 1),
    50
  );
  const skip = (page - 1) * limit;
  const sortConditions = buildSortConditions(query);

  const [products, total] = await Promise.all([
    Product.find(queryObj)
      .select("-sellerEmail -sellerContact -sellerId -approvedBy")
      .sort(sortConditions)
      .skip(skip)
      .limit(limit)
      .lean(),
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

  const product = await Product.findOne({
    _id: id,
    isDeleted: { $ne: true },
    approvedAt: { $exists: true, $ne: null },
    status: { $in: ["available", "out_of_stock"] },
  })
    .select("-sellerEmail -sellerContact -sellerId -approvedBy")
    .lean();

  if (!product) {
    throw new AppError(404, "Product not found");
  }

  return product;
};

const getMyListingsFromDB = async (
  query: IMyListingsQueryParams,
  seller: TSellerIdentity
) => {
  const queryObj: Record<string, any> = {
    isDeleted: { $ne: true },
    $and: [buildSellerCondition(seller)],
  };

  applyCommonFilters(queryObj, query);

  if (query.status === "pending") {
    addAndCondition(queryObj, {
      $or: [
        { status: "pending" },
        {
          status: { $in: ["available", "out_of_stock"] },
          approvedAt: { $exists: false },
        },
        {
          status: { $in: ["available", "out_of_stock"] },
          approvedAt: null,
        },
      ],
    });
  } else if (
    query.status === "available" ||
    query.status === "out_of_stock"
  ) {
    queryObj.status = query.status;
    queryObj.approvedAt = { $exists: true, $ne: null };
  } else if (query.status) {
    queryObj.status = query.status;
  }

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(query.limit) || 20, 1),
    50
  );
  const skip = (page - 1) * limit;
  const sortConditions = buildSortConditions(query);

  const [products, total] = await Promise.all([
    Product.find(queryObj)
      .sort(sortConditions)
      .skip(skip)
      .limit(limit)
      .lean(),
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

const getMyProductByIdFromDB = async (
  id: string,
  seller: TSellerIdentity
) => {
  if (!isValidObjectId(id)) {
    throw new AppError(400, "Invalid product ID");
  }

  const product = await Product.findOne({
    _id: id,
    isDeleted: { $ne: true },
    $and: [buildSellerCondition(seller)],
  }).lean();

  if (!product) {
    throw new AppError(
      404,
      "Product not found or you are not allowed to access it"
    );
  }

  return product;
};

const updateProductInDB = async (
  id: string,
  seller: TSellerIdentity,
  payload: Partial<IProduct>
) => {
  if (!isValidObjectId(id)) {
    throw new AppError(400, "Invalid product ID");
  }

  const product = await Product.findOne({
    _id: id,
    isDeleted: { $ne: true },
    $and: [buildSellerCondition(seller)],
  });

  if (!product) {
    throw new AppError(
      404,
      "Product not found or you are not allowed to update it"
    );
  }

  const originalStatus = product.status ?? "pending";
  const wasApproved =
    Boolean(product.approvedAt) &&
    (originalStatus === "available" ||
      originalStatus === "out_of_stock");

  const allowedFields = [
    "title",
    "description",
    "price",
    "category",
    "transactionType",
    "productionMethod",
    "quantity",
    "unit",
    "images",
    "sellerContact",
    "location",
    "division",
    "district",
    "upazila",
    "poultryDetails",
    "byProductUses",
  ] as const;

  let hasAnyChanges = false;
  let hasReviewRequiredChanges = false;

  for (const field of allowedFields) {
    const value = payload[field];

    if (value === undefined) {
      continue;
    }

    const currentValue = (product as any)[field];

    if (!valuesAreDifferent(currentValue, value)) {
      continue;
    }

    (product as any)[field] = value;
    hasAnyChanges = true;

    if (REVIEW_REQUIRED_FIELDS.has(field)) {
      hasReviewRequiredChanges = true;
    }
  }

  const transactionType = product.transactionType ?? "sale";

  if (transactionType === "free") {
    if (Number(product.price) !== 0) {
      product.price = 0;
      hasAnyChanges = true;
      hasReviewRequiredChanges = true;
    }
  }

  if (
    transactionType === "sale" &&
    Number(product.price) <= 0
  ) {
    throw new AppError(
      400,
      "Sale products must have a price greater than 0"
    );
  }

  if (
    product.category === "poultry" &&
    !product.poultryDetails?.poultryType
  ) {
    throw new AppError(
      400,
      "Poultry type is required for poultry listings"
    );
  }

  if (product.category !== "poultry" && product.poultryDetails) {
    product.poultryDetails = undefined;
    hasAnyChanges = true;
    hasReviewRequiredChanges = true;
  }

  if (
    product.category !== "by_products" &&
    (product.byProductUses?.length || 0) > 0
  ) {
    product.byProductUses = [];
    hasAnyChanges = true;
    hasReviewRequiredChanges = true;
  }

  if (!hasAnyChanges) {
    return product;
  }

  /*
   * Admin-disabled listings stay disabled until an admin restores them.
   * Rejected/pending/approved listings can be edited by the farmer.
   */
  if (originalStatus === "disabled") {
    product.status = "disabled";
  } else if (originalStatus === "rejected") {
    // Any farmer correction to a rejected listing resubmits it for review.
    product.status = "pending";
    clearApproval(product);
    product.rejectionReason = undefined;
  } else if (hasReviewRequiredChanges) {
    product.status = "pending";
    clearApproval(product);
    product.rejectionReason = undefined;
  } else if (originalStatus === "pending") {
    product.status = "pending";
  } else if (wasApproved) {
    product.status =
      Number(product.quantity) <= 0
        ? "out_of_stock"
        : "available";
  } else {
    product.status = "pending";
    clearApproval(product);
  }

  await product.save();
  return product;
};

const deleteProductFromDB = async (
  id: string,
  seller: TSellerIdentity
) => {
  if (!isValidObjectId(id)) {
    throw new AppError(400, "Invalid product ID");
  }

  const result = await Product.findOneAndUpdate(
    {
      _id: id,
      isDeleted: { $ne: true },
      $and: [buildSellerCondition(seller)],
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
  getMyProductByIdFromDB,
  updateProductInDB,
  deleteProductFromDB,
};