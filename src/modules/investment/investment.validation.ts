import { z } from "zod";

import {
  INVESTMENT_CATEGORIES,
  INVESTMENT_STATUSES,
} from "./investment.interface";



const categorySchema =
  z.enum(
    INVESTMENT_CATEGORIES
  );



const statusSchema =
  z.enum(
    INVESTMENT_STATUSES
  );





const createInvestmentProjectSchema =
z.object({

  body: z.object({



    projectName: z
      .string({
        message:
          "Project name is required",
      })
      .trim()
      .min(
        3,
        "Project name must be at least 3 characters"
      )
      .max(
        150,
        "Project name is too long"
      ),




    category:
      categorySchema,




    requiredInvestment: z
      .number({
        message:
          "Required investment is required",
      })
      .positive(
        "Investment amount must be greater than 0"
      ),




    ownContribution: z
      .number()
      .min(
        0,
        "Own contribution cannot be negative"
      )
      .optional(),





    duration: z
      .string({
        message:
          "Duration is required",
      })
      .trim()
      .min(1)
      .max(100),





    expectedReturn: z
      .string({
        message:
          "Expected return is required",
      })
      .trim()
      .min(1)
      .max(100),





    profitSharing: z
      .string({
        message:
          "Profit sharing information is required",
      })
      .trim()
      .min(1)
      .max(200),






    estimatedRevenue: z
      .number({
        message:
          "Estimated revenue is required",
      })
      .min(
        0,
        "Revenue cannot be negative"
      ),





    estimatedCost: z
      .number({
        message:
          "Estimated cost is required",
      })
      .min(
        0,
        "Cost cannot be negative"
      ),





    estimatedProfit: z
      .number({
        message:
          "Estimated profit is required",
      })
      .min(
        0,
        "Profit cannot be negative"
      ),






    division: z
      .string({
        message:
          "Division is required",
      })
      .trim()
      .min(1),





    district: z
      .string({
        message:
          "District is required",
      })
      .trim()
      .min(1),





    upazila: z
      .string({
        message:
          "Upazila is required",
      })
      .trim()
      .min(1),





    address: z
      .string({
        message:
          "Address is required",
      })
      .trim()
      .min(2)
      .max(300),





    description: z
      .string({
        message:
          "Project description is required",
      })
      .trim()
      .min(
        20,
        "Description must be at least 20 characters"
      )
      .max(5000),





    nidNumber: z
      .string({
        message:
          "NID number is required",
      })
      .trim()
      .min(
        5,
        "Invalid NID number"
      )
      .max(30),





    nidFrontImage: z
      .string()
      .url(
        "Invalid NID image URL"
      )
      .optional(),



  }),


});









const updateInvestmentProjectSchema =
z.object({

  body:
    z.object({

      projectName:
        z.string()
        .trim()
        .min(3)
        .max(150)
        .optional(),



      category:
        categorySchema
        .optional(),



      requiredInvestment:
        z.number()
        .positive()
        .optional(),



      ownContribution:
        z.number()
        .min(0)
        .optional(),



      duration:
        z.string()
        .trim()
        .min(1)
        .max(100)
        .optional(),



      expectedReturn:
        z.string()
        .trim()
        .min(1)
        .max(100)
        .optional(),



      profitSharing:
        z.string()
        .trim()
        .min(1)
        .max(200)
        .optional(),



      estimatedRevenue:
        z.number()
        .min(0)
        .optional(),



      estimatedCost:
        z.number()
        .min(0)
        .optional(),



      estimatedProfit:
        z.number()
        .min(0)
        .optional(),



      division:
        z.string()
        .trim()
        .min(1)
        .optional(),



      district:
        z.string()
        .trim()
        .min(1)
        .optional(),



      upazila:
        z.string()
        .trim()
        .min(1)
        .optional(),



      address:
        z.string()
        .trim()
        .min(2)
        .max(300)
        .optional(),



      description:
        z.string()
        .trim()
        .min(20)
        .max(5000)
        .optional(),



      nidNumber:
        z.string()
        .trim()
        .min(5)
        .max(30)
        .optional(),



      nidFrontImage:
        z.string()
        .url()
        .optional(),


    })

    .refine(
      (data)=>
        Object.keys(data).length > 0,
      {
        message:
          "At least one field is required",
      }
    ),

});

const reviewInvestmentProjectSchema =
z.object({

  body:
    z.object({



      status:
        statusSchema
        .refine(

          (value)=>
            value === "APPROVED" ||
            value === "REJECTED",

          {
            message:
              "Invalid review status",
          }

        ),



      adminNote:
        z.string()
        .trim()
        .max(2000)
        .optional(),


    })

    .superRefine(

      (data,ctx)=>{


        if(
          data.status === "REJECTED" &&
          !data.adminNote
        ){

          ctx.addIssue({

            code:
              "custom",

            path:[
              "adminNote"
            ],

            message:
              "Rejection reason is required",

          });

        }


      }

    ),

});

const getAdminInvestmentProjectsSchema =
z.object({

  query:
    z.object({

      status:
        statusSchema
        .optional(),


      search:
        z.string()
        .optional(),


      page:
        z.string()
        .optional(),


      limit:
        z.string()
        .optional(),
    })

    .optional(),

});




export const InvestmentValidation = {
  createInvestmentProjectSchema,
  updateInvestmentProjectSchema,
  reviewInvestmentProjectSchema,
  getAdminInvestmentProjectsSchema,
};