import {
  z,
} from "zod";

import {
  BY_PRODUCT_USES,
  POULTRY_TYPES,
  PRODUCT_CATEGORIES,
  PRODUCT_SELLER_STATUSES,
  PRODUCT_STATUSES,
  PRODUCTION_METHODS,
  TRANSACTION_TYPES,
} from "./product.constant";

const categorySchema =
  z.enum(
    PRODUCT_CATEGORIES
  );

const productStatusSchema =
  z.enum(
    PRODUCT_STATUSES
  );

const sellerStatusSchema =
  z.enum(
    PRODUCT_SELLER_STATUSES
  );

const transactionTypeSchema =
  z.enum(
    TRANSACTION_TYPES
  );

const productionMethodSchema =
  z.enum(
    PRODUCTION_METHODS
  );

const poultryDetailsSchema =
  z
    .object({
      poultryType:
        z
          .enum(
            POULTRY_TYPES
          )
          .optional(),

      breed:
        z
          .string()
          .trim()
          .max(100)
          .optional(),

      ageWeeks:
        z
          .number()
          .min(0)
          .optional(),

      averageWeightKg:
        z
          .number()
          .min(0)
          .optional(),
    })
    .optional();

const nonNegativeNumberString =
  z
    .string()
    .refine(
      (
        value
      ) => {
        const number =
          Number(value);

        return (
          Number.isFinite(
            number
          ) &&
          number >= 0
        );
      },
      {
        message:
          "Must be a valid non-negative number",
      }
    );

const positiveIntegerString =
  z
    .string()
    .refine(
      (
        value
      ) => {
        const number =
          Number(value);

        return (
          Number.isInteger(
            number
          ) &&
          number > 0
        );
      },
      {
        message:
          "Must be a positive integer",
      }
    );

const createProductValidationSchema =
  z.object({
    body:
      z
        .object({
          title:
            z
              .string({
                message:
                  "Title is required",
              })
              .trim()
              .min(
                1,
                "Title cannot be empty"
              )
              .max(150),

          description:
            z
              .string({
                message:
                  "Description is required",
              })
              .trim()
              .min(
                1,
                "Description cannot be empty"
              )
              .max(3000),

          price:
            z
              .number({
                message:
                  "Price is required",
              })
              .min(
                0,
                "Price cannot be negative"
              ),

          category:
            categorySchema,

          transactionType:
            transactionTypeSchema
              .optional(),

          productionMethod:
            productionMethodSchema
              .optional(),

          quantity:
            z
              .number({
                message:
                  "Quantity is required",
              })
              .positive(
                "Quantity must be greater than 0"
              ),

          unit:
            z
              .string({
                message:
                  "Unit is required",
              })
              .trim()
              .min(
                1,
                "Unit cannot be empty"
              )
              .max(50),

          images:
            z
              .array(
                z
                  .string()
                  .url()
              )
              .max(5)
              .optional(),

          sellerContact:
            z
              .string()
              .trim()
              .max(50)
              .optional(),

          location:
            z
              .string()
              .trim()
              .max(200)
              .optional(),

          division:
            z
              .string()
              .trim()
              .max(100)
              .optional(),

          district:
            z
              .string()
              .trim()
              .max(100)
              .optional(),

          upazila:
            z
              .string()
              .trim()
              .max(100)
              .optional(),

          poultryDetails:
            poultryDetailsSchema,

          byProductUses:
            z
              .array(
                z.enum(
                  BY_PRODUCT_USES
                )
              )
              .max(10)
              .optional(),

          status:
            sellerStatusSchema
              .optional(),
        })
        .superRefine(
          (
            body,
            ctx
          ) => {
            const transactionType =
              body.transactionType ??
              "sale";

            if (
              transactionType ===
                "sale" &&
              body.price <= 0
            ) {
              ctx.addIssue({
                code:
                  "custom",

                path: [
                  "price",
                ],

                message:
                  "Sale products must have a price greater than 0",
              });
            }

            if (
              transactionType ===
                "free" &&
              body.price !== 0
            ) {
              ctx.addIssue({
                code:
                  "custom",

                path: [
                  "price",
                ],

                message:
                  "Free products must have price 0",
              });
            }

            if (
              body.category ===
                "poultry" &&
              !body
                .poultryDetails
                ?.poultryType
            ) {
              ctx.addIssue({
                code:
                  "custom",

                path: [
                  "poultryDetails",
                  "poultryType",
                ],

                message:
                  "Poultry type is required for poultry listings",
              });
            }
          }
        ),
  });

const getProductsQueryValidationSchema =
  z.object({
    query:
      z
        .object({
          search:
            z
              .string()
              .optional(),

          category:
            categorySchema
              .optional(),

          status:
            z
              .enum([
                "available",
                "out_of_stock",
              ])
              .optional(),

          transactionType:
            transactionTypeSchema
              .optional(),

          productionMethod:
            productionMethodSchema
              .optional(),

          location:
            z
              .string()
              .optional(),

          minPrice:
            nonNegativeNumberString
              .optional(),

          maxPrice:
            nonNegativeNumberString
              .optional(),

          sort:
            z
              .enum([
                "newest",
                "oldest",
                "price_asc",
                "price_desc",
                "quantity_desc",
              ])
              .optional(),

          sortBy:
            z
              .enum([
                "createdAt",
                "price",
                "quantity",
                "title",
              ])
              .optional(),

          sortOrder:
            z
              .enum([
                "asc",
                "desc",
              ])
              .optional(),

          page:
            positiveIntegerString
              .optional(),

          limit:
            positiveIntegerString
              .optional(),
        })
        .optional(),
  });

const getMyListingsQueryValidationSchema =
  z.object({
    query:
      z
        .object({
          search:
            z
              .string()
              .optional(),

          category:
            categorySchema
              .optional(),

          status:
            productStatusSchema
              .optional(),

          transactionType:
            transactionTypeSchema
              .optional(),

          productionMethod:
            productionMethodSchema
              .optional(),

          location:
            z
              .string()
              .optional(),

          minPrice:
            nonNegativeNumberString
              .optional(),

          maxPrice:
            nonNegativeNumberString
              .optional(),

          sort:
            z
              .enum([
                "newest",
                "oldest",
                "price_asc",
                "price_desc",
                "quantity_desc",
              ])
              .optional(),

          sortBy:
            z
              .enum([
                "createdAt",
                "price",
                "quantity",
                "title",
              ])
              .optional(),

          sortOrder:
            z
              .enum([
                "asc",
                "desc",
              ])
              .optional(),

          page:
            positiveIntegerString
              .optional(),

          limit:
            positiveIntegerString
              .optional(),
        })
        .optional(),
  });

const updateProductValidationSchema =
  z.object({
    body:
      z
        .object({
          title:
            z
              .string()
              .trim()
              .min(1)
              .max(150)
              .optional(),

          description:
            z
              .string()
              .trim()
              .min(1)
              .max(3000)
              .optional(),

          price:
            z
              .number()
              .min(0)
              .optional(),

          category:
            categorySchema
              .optional(),

          transactionType:
            transactionTypeSchema
              .optional(),

          productionMethod:
            productionMethodSchema
              .optional(),

          quantity:
            z
              .number()
              .min(0)
              .optional(),

          unit:
            z
              .string()
              .trim()
              .min(1)
              .max(50)
              .optional(),

          images:
            z
              .array(
                z
                  .string()
                  .url()
              )
              .max(5)
              .optional(),

          sellerContact:
            z
              .string()
              .trim()
              .max(50)
              .optional(),

          location:
            z
              .string()
              .trim()
              .max(200)
              .optional(),

          division:
            z
              .string()
              .trim()
              .max(100)
              .optional(),

          district:
            z
              .string()
              .trim()
              .max(100)
              .optional(),

          upazila:
            z
              .string()
              .trim()
              .max(100)
              .optional(),

          poultryDetails:
            poultryDetailsSchema,

          byProductUses:
            z
              .array(
                z.enum(
                  BY_PRODUCT_USES
                )
              )
              .max(10)
              .optional(),

          status:
            sellerStatusSchema
              .optional(),
        })
        .refine(
          (
            body
          ) =>
            Object.keys(
              body
            ).length >
            0,
          {
            message:
              "At least one field is required",
          }
        ),
  });

export const ProductValidation =
  {
    createProductValidationSchema,

    getProductsQueryValidationSchema,

    getMyListingsQueryValidationSchema,

    updateProductValidationSchema,
  };