import {
  isValidObjectId,
} from "mongoose";

import AppError from "../../utils/AppError";

import {
  IMyListingsQueryParams,
  IProduct,
  IProductQueryParams,
} from "./product.interface";

import {
  Product,
} from "./product.model";

const escapeRegex = (
  value: string
) =>
  value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const buildSortConditions =
  (
    query:
      IProductQueryParams
  ): Record<
    string,
    1 | -1
  > => {
    switch (
      query.sort
    ) {
      case "oldest":
        return {
          createdAt: 1,
        };

      case "price_asc":
        return {
          price: 1,
        };

      case "price_desc":
        return {
          price: -1,
        };

      case "quantity_desc":
        return {
          quantity: -1,
        };

      case "newest":
        return {
          createdAt: -1,
        };

      default:
        break;
    }

    if (
      query.sortBy
    ) {
      return {
        [query.sortBy]:
          query.sortOrder ===
          "asc"
            ? 1
            : -1,
      };
    }

    return {
      createdAt: -1,
    };
  };

const applyCommonFilters =
  (
    queryObj:
      Record<
        string,
        any
      >,

    query:
      IProductQueryParams
  ) => {
    if (
      query.search
        ?.trim()
    ) {
      const searchRegex =
        new RegExp(
          escapeRegex(
            query.search.trim()
          ),
          "i"
        );

      queryObj.$or = [
        {
          title:
            searchRegex,
        },

        {
          description:
            searchRegex,
        },

        {
          location:
            searchRegex,
        },

        {
          district:
            searchRegex,
        },
      ];
    }

    if (
      query.category &&
      query.category !==
        "all"
    ) {
      queryObj.category =
        query.category;
    }

    if (
      query.transactionType
    ) {
      queryObj.transactionType =
        query.transactionType;
    }

    if (
      query.productionMethod
    ) {
      queryObj.productionMethod =
        query.productionMethod;
    }

    if (
      query.location
        ?.trim()
    ) {
      const locationRegex =
        new RegExp(
          escapeRegex(
            query.location.trim()
          ),
          "i"
        );

      queryObj.$and = [
        ...(
          queryObj.$and ||
          []
        ),

        {
          $or: [
            {
              location:
                locationRegex,
            },

            {
              division:
                locationRegex,
            },

            {
              district:
                locationRegex,
            },

            {
              upazila:
                locationRegex,
            },
          ],
        },
      ];
    }

    if (
      query.minPrice ||
      query.maxPrice
    ) {
      queryObj.price =
        {};

      if (
        query.minPrice
      ) {
        queryObj
          .price
          .$gte =
          Number(
            query.minPrice
          );
      }

      if (
        query.maxPrice
      ) {
        queryObj
          .price
          .$lte =
          Number(
            query.maxPrice
          );
      }
    }
  };

const createProductInDB =
  async (
    payload:
      IProduct
  ) => {
    const transactionType =
      payload.transactionType ??
      "sale";

    const price =
      transactionType ===
      "free"
        ? 0
        : payload.price;

    if (
      transactionType ===
        "sale" &&
      price <= 0
    ) {
      throw new AppError(
        400,
        "Sale products must have a price greater than 0"
      );
    }

    if (
      payload.category ===
        "poultry" &&
      !payload
        .poultryDetails
        ?.poultryType
    ) {
      throw new AppError(
        400,
        "Poultry type is required for poultry listings"
      );
    }

    return Product.create({
      ...payload,

      transactionType,

      productionMethod:
        payload.productionMethod ??
        "conventional",

      price,

      poultryDetails:
        payload.category ===
        "poultry"
          ? payload.poultryDetails
          : undefined,

      byProductUses:
        payload.category ===
        "by_products"
          ? payload.byProductUses ??
            []
          : [],

      status:
        payload.status ===
        "out_of_stock"
          ? "out_of_stock"
          : "available",

      isDeleted:
        false,
    });
  };

const getProductsFromDB =
  async (
    query:
      IProductQueryParams
  ) => {
    const queryObj:
      Record<
        string,
        any
      > = {
        isDeleted: {
          $ne: true,
        },

        status:
          query.status ===
          "out_of_stock"
            ? "out_of_stock"
            : "available",
      };

    applyCommonFilters(
      queryObj,
      query
    );

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
          ) || 12,
          1
        ),
        50
      );

    const skip =
      (
        page - 1
      ) *
      limit;

    const sortConditions =
      buildSortConditions(
        query
      );

    const [
      products,
      total,
    ] =
      await Promise.all([
        Product.find(
          queryObj
        )
          .select(
            "-sellerEmail -sellerContact"
          )
          .sort(
            sortConditions
          )
          .skip(skip)
          .limit(limit)
          .lean(),

        Product.countDocuments(
          queryObj
        ),
      ]);

    return {
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

      data:
        products,
    };
  };

const getProductByIdFromDB =
  async (
    id: string
  ) => {
    if (
      !isValidObjectId(
        id
      )
    ) {
      throw new AppError(
        400,
        "Invalid product ID"
      );
    }

    const product =
      await Product.findOne(
        {
          _id: id,

          isDeleted: {
            $ne: true,
          },

          status: {
            $in: [
              "available",
              "out_of_stock",
            ],
          },
        }
      )
        .select(
          "-sellerEmail -sellerContact"
        )
        .lean();

    if (
      !product
    ) {
      throw new AppError(
        404,
        "Product not found"
      );
    }

    return product;
  };

const getMyListingsFromDB =
  async (
    query:
      IMyListingsQueryParams,

    sellerEmail:
      string
  ) => {
    const queryObj:
      Record<
        string,
        any
      > = {
        sellerEmail:
          sellerEmail
            .trim()
            .toLowerCase(),

        isDeleted: {
          $ne: true,
        },
      };

    applyCommonFilters(
      queryObj,
      query
    );

    if (
      query.status
    ) {
      queryObj.status =
        query.status;
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
          ) || 20,
          1
        ),
        50
      );

    const skip =
      (
        page - 1
      ) *
      limit;

    const sortConditions =
      buildSortConditions(
        query
      );

    const [
      products,
      total,
    ] =
      await Promise.all([
        Product.find(
          queryObj
        )
          .sort(
            sortConditions
          )
          .skip(skip)
          .limit(limit)
          .lean(),

        Product.countDocuments(
          queryObj
        ),
      ]);

    return {
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

      data:
        products,
    };
  };

const updateProductInDB =
  async (
    id: string,

    sellerEmail:
      string,

    payload:
      Partial<IProduct>
  ) => {
    if (
      !isValidObjectId(
        id
      )
    ) {
      throw new AppError(
        400,
        "Invalid product ID"
      );
    }

    const product =
      await Product.findOne(
        {
          _id: id,

          sellerEmail:
            sellerEmail
              .trim()
              .toLowerCase(),

          isDeleted: {
            $ne: true,
          },
        }
      );

    if (
      !product
    ) {
      throw new AppError(
        404,
        "Product not found or you are not allowed to update it"
      );
    }

    const allowedFields =
      [
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

    for (
      const field of
      allowedFields
    ) {
      const value =
        payload[field];

      if (
        value !==
        undefined
      ) {
        (
          product as any
        )[field] =
          value;
      }
    }

    if (
      payload.status ===
        "available" ||
      payload.status ===
        "out_of_stock"
    ) {
      product.status =
        payload.status;
    }

    const transactionType =
      product.transactionType ??
      "sale";

    if (
      transactionType ===
      "free"
    ) {
      product.price =
        0;
    }

    if (
      transactionType ===
        "sale" &&
      Number(
        product.price
      ) <= 0
    ) {
      throw new AppError(
        400,
        "Sale products must have a price greater than 0"
      );
    }

    if (
      product.category ===
        "poultry" &&
      !product
        .poultryDetails
        ?.poultryType
    ) {
      throw new AppError(
        400,
        "Poultry type is required for poultry listings"
      );
    }

    if (
      product.category !==
      "poultry"
    ) {
      product.poultryDetails =
        undefined;
    }

    if (
      product.category !==
      "by_products"
    ) {
      product.byProductUses =
        [];
    }

    if (
      Number(
        product.quantity
      ) <= 0
    ) {
      product.quantity =
        0;

      product.status =
        "out_of_stock";
    }

    await product.save();

    return product;
  };

const deleteProductFromDB =
  async (
    id: string,

    sellerEmail:
      string
  ) => {
    if (
      !isValidObjectId(
        id
      )
    ) {
      throw new AppError(
        400,
        "Invalid product ID"
      );
    }

    const result =
      await Product.findOneAndUpdate(
        {
          _id: id,

          sellerEmail:
            sellerEmail
              .trim()
              .toLowerCase(),

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

    if (
      !result
    ) {
      throw new AppError(
        404,
        "Product not found or you are not allowed to delete it"
      );
    }

    return result;
  };

export const ProductService =
  {
    createProductInDB,

    getProductsFromDB,

    getProductByIdFromDB,

    getMyListingsFromDB,

    updateProductInDB,

    deleteProductFromDB,
  };