import {
  randomBytes,
} from "crypto";

import {
  isValidObjectId,
} from "mongoose";

import Stripe from "stripe";

import {
  Farm,
} from "../../app/modules/farm/farm.model";

import AppError from "../../utils/AppError";

import {
  NotificationService,
} from "../notification/notification.service";

import {
  IInvestmentApplicationQuery,
  IInvestmentProject,
  IInvestmentQuery,
  TInvestmentApplicationStatus,
  TInvestmentPaymentStatus,
  TInvestmentStatus,
} from "./investment.interface";

import {
  InvestmentApplication,
  InvestmentProject,
} from "./investment.model";

/* ============================================================
   HELPERS
============================================================ */

const generateCode =
  async (
    prefix:
      string,

    exists:
      (
        code:
          string
      ) =>
        Promise<boolean>
  ): Promise<string> => {
    for (
      let i = 0;
      i < 12;
      i += 1
    ) {
      const code =
        `${prefix}-${randomBytes(
          4
        )
          .toString(
            "hex"
          )
          .toUpperCase()}`;

      if (
        !(await exists(
          code
        ))
      ) {
        return code;
      }
    }

    throw new AppError(
      500,
      `Failed to generate ${prefix} code`
    );
  };

const getStripe =
  () => {
    const key =
      process.env
        .STRIPE_SECRET_KEY ||
      process.env
        .STRIPE_SECRET;

    if (!key) {
      throw new AppError(
        500,
        "STRIPE_SECRET_KEY is not configured"
      );
    }

    return new Stripe(
      key
    );
  };

const getClientUrl =
  () => {
    const url =
      process.env
        .CLIENT_URL ||
      process.env
        .FRONTEND_URL;

    if (!url) {
      throw new AppError(
        500,
        "CLIENT_URL is not configured"
      );
    }

    return url.replace(
      /\/$/,
      ""
    );
  };

const normalizeProject =
  <
    T extends Record<
      string,
      any
    >
  >(
    project:
      T
  ): T => {
    const durationMonths =
      Number(
        project.durationMonths ||
          parseInt(
            project.duration ||
              "0",
            10
          ) ||
          0
      );

    return {
      ...project,

      minimumInvestment:
        Number(
          project.minimumInvestment ||
            1000
        ),

      fundedAmount:
        Number(
          project.fundedAmount ||
            0
        ),

      durationMonths,

      useOfFunds:
        project.useOfFunds ||
        "Project operations and farm expansion",

      fundingStatus:
        project.fundingStatus ||
        "OPEN",
    };
  };

/* ============================================================
   FARMER PROJECT CREATION
============================================================ */

const createInvestmentProjectInDB =
  async (
    payload:
      Pick<
        IInvestmentProject,
        | "farmId"
        | "projectName"
        | "category"
        | "requiredInvestment"
        | "minimumInvestment"
        | "durationMonths"
        | "description"
        | "useOfFunds"
        | "projectImage"
        | "supportingDocument"
      >,

    farmer: {
      id:
        string;

      name?:
        string;

      email:
        string;
    }
  ) => {
    if (
      !isValidObjectId(
        payload.farmId
      )
    ) {
      throw new AppError(
        400,
        "Invalid farm id"
      );
    }

    const farm =
      await Farm.findOne(
        {
          _id:
            payload.farmId,

          farmerId:
            farmer.id,

          status:
            "Active",
        }
      ).lean();

    if (!farm) {
      throw new AppError(
        404,
        "Active farm not found or you do not own this farm"
      );
    }

    const existingOpenRequest =
      await InvestmentProject.exists(
        {
          farmId:
            String(
              farm._id
            ),

          farmerId:
            farmer.id,

          status: {
            $in: [
              "PENDING_REVIEW",
              "APPROVED",
            ],
          },

          fundingStatus: {
            $ne:
              "CLOSED",
          },

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (
      existingOpenRequest
    ) {
      throw new AppError(
        409,
        "This farm already has an active investment project. Close or complete it before submitting another one."
      );
    }

    const projectCode =
      await generateCode(
        "INV",

        async (
          code
        ) =>
          Boolean(
            await InvestmentProject.exists(
              {
                projectCode:
                  code,
              }
            )
          )
      );

    const project =
      await InvestmentProject.create(
        {
          projectCode,

          farmerId:
            farmer.id,

          farmerName:
            farmer.name ||
            "",

          farmerEmail:
            farmer.email
              .toLowerCase()
              .trim(),

          farmId:
            String(
              farm._id
            ),

          farmName:
            farm.name,

          projectName:
            payload.projectName,

          category:
            payload.category,

          requiredInvestment:
            payload.requiredInvestment,

          minimumInvestment:
            payload.minimumInvestment,

          fundedAmount:
            0,

          durationMonths:
            payload.durationMonths,

          division:
            farm.division,

          district:
            farm.district,

          upazila:
            farm.upazila,

          description:
            payload.description,

          useOfFunds:
            payload.useOfFunds,

          projectImage:
            payload.projectImage ||
            farm.coverImage,

          supportingDocument:
            payload.supportingDocument,

          status:
            "PENDING_REVIEW",

          fundingStatus:
            "OPEN",

          adminNote:
            "",

          isDeleted:
            false,
        }
      );

    return project;
  };

/* ============================================================
   FARMER PROJECT LIST
============================================================ */

const getMyInvestmentProjectsFromDB =
  async (
    farmerId:
      string
  ) => {
    const projects =
      await InvestmentProject.find(
        {
          farmerId,

          isDeleted: {
            $ne:
              true,
          },
        }
      )
        .sort({
          createdAt:
            -1,
        })
        .lean();

    return projects.map(
      (
        project
      ) =>
        normalizeProject(
          project as any
        )
    );
  };

const getMyInvestmentProjectByIdFromDB =
  async (
    projectId:
      string,

    farmerId:
      string
  ) => {
    if (
      !isValidObjectId(
        projectId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne(
        {
          _id:
            projectId,

          farmerId,

          isDeleted: {
            $ne:
              true,
          },
        }
      ).lean();

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    return normalizeProject(
      project as any
    );
  };

/* ============================================================
   FARMER PROJECT UPDATE
============================================================ */

const updateMyInvestmentProjectInDB =
  async (
    projectId:
      string,

    farmerId:
      string,

    payload:
      Partial<IInvestmentProject>
  ) => {
    if (
      !isValidObjectId(
        projectId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne(
        {
          _id:
            projectId,

          farmerId,

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    if (
      project.status ===
      "APPROVED"
    ) {
      throw new AppError(
        400,
        "Approved projects cannot be edited while funding is active"
      );
    }

    const allowedFields = [
      "projectName",
      "category",
      "requiredInvestment",
      "minimumInvestment",
      "durationMonths",
      "description",
      "useOfFunds",
      "projectImage",
      "supportingDocument",
    ];

    for (
      const field
      of allowedFields
    ) {
      const value =
        payload[
          field as keyof IInvestmentProject
        ];

      if (
        value !==
        undefined
      ) {
        (
          project as unknown as Record<
            string,
            unknown
          >
        )[field] =
          value;
      }
    }

    if (
      project.minimumInvestment >
      project.requiredInvestment
    ) {
      throw new AppError(
        400,
        "Minimum investment cannot exceed the funding goal"
      );
    }

    if (
      project.status ===
      "REJECTED"
    ) {
      project.status =
        "PENDING_REVIEW";

      project.adminNote =
        "";

      project.reviewedAt =
        undefined;

      project.approvedAt =
        undefined;
    }

    await project.save();

    return project;
  };

/* ============================================================
   FARMER PROJECT DELETE / WITHDRAW
============================================================ */

const deleteMyInvestmentProjectFromDB =
  async (
    projectId:
      string,

    farmerId:
      string
  ) => {
    if (
      !isValidObjectId(
        projectId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne(
        {
          _id:
            projectId,

          farmerId,

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    if (
      project.status ===
        "APPROVED" &&
      Number(
        project.fundedAmount ||
          0
      ) > 0
    ) {
      throw new AppError(
        400,
        "A funded project cannot be withdrawn"
      );
    }

    project.isDeleted =
      true;

    project.fundingStatus =
      "CLOSED";

    await project.save();

    return project;
  };

/* ============================================================
   FILTERS
============================================================ */

const buildProjectFilter =
  (
    query:
      IInvestmentQuery,

    publicOnly =
      false
  ) => {
    const filter:
      Record<
        string,
        unknown
      > = {
      isDeleted: {
        $ne:
          true,
      },
    };

    if (
      publicOnly
    ) {
      filter.status =
        "APPROVED";
    } else if (
      query.status
    ) {
      filter.status =
        query.status;
    }

    if (
      query.category
    ) {
      filter.category =
        query.category;
    }

    if (
      query.search
    ) {
      filter.$or = [
        {
          projectName: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },

        {
          farmName: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },

        {
          farmerName: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },

        {
          district: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },

        {
          projectCode: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },
      ];
    }

    return filter;
  };

const paginate =
  (
    query: {
      page?: string;

      limit?: string;
    },

    defaultLimit:
      number
  ) => {
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
          ) ||
            defaultLimit,
          1
        ),
        100
      );

    return {
      page,

      limit,

      skip:
        (page - 1) *
        limit,
    };
  };

/* ============================================================
   PUBLIC APPROVED PROJECTS
============================================================ */

const getApprovedInvestmentProjectsFromDB =
  async (
    query:
      IInvestmentQuery
  ) => {
    const filter =
      buildProjectFilter(
        query,
        true
      );

    const {
      page,
      limit,
      skip,
    } =
      paginate(
        query,
        12
      );

    const [
      data,
      total,
    ] =
      await Promise.all([
        InvestmentProject.find(
          filter
        )
          .select(
            "-farmerEmail -adminNote -reviewedAt -supportingDocument -nidNumber -nidFrontImage"
          )
          .sort({
            createdAt:
              -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        InvestmentProject.countDocuments(
          filter
        ),
      ]);

    return {
      meta: {
        page,

        limit,

        total,

        totalPages:
          Math.ceil(
            total /
              limit
          ),
      },

      data:
        data.map(
          (
            project
          ) =>
            normalizeProject(
              project as any
            )
        ),
    };
  };

const getApprovedInvestmentProjectByIdFromDB =
  async (
    projectId:
      string
  ) => {
    if (
      !isValidObjectId(
        projectId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne(
        {
          _id:
            projectId,

          status:
            "APPROVED",

          isDeleted: {
            $ne:
              true,
          },
        }
      )
        .select(
          "-farmerEmail -adminNote -reviewedAt -supportingDocument -nidNumber -nidFrontImage"
        )
        .lean();

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    return normalizeProject(
      project as any
    );
  };

/* ============================================================
   ADMIN PROJECTS
============================================================ */

const getAdminInvestmentProjectsFromDB =
  async (
    query:
      IInvestmentQuery
  ) => {
    const filter =
      buildProjectFilter(
        query,
        false
      );

    const {
      page,
      limit,
      skip,
    } =
      paginate(
        query,
        20
      );

    const [
      data,
      total,
    ] =
      await Promise.all([
        InvestmentProject.find(
          filter
        )
          .sort({
            createdAt:
              -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        InvestmentProject.countDocuments(
          filter
        ),
      ]);

    return {
      meta: {
        page,

        limit,

        total,

        totalPages:
          Math.ceil(
            total /
              limit
          ),
      },

      data:
        data.map(
          (
            project
          ) =>
            normalizeProject(
              project as any
            )
        ),
    };
  };

const getAdminInvestmentProjectByIdFromDB =
  async (
    projectId:
      string
  ) => {
    if (
      !isValidObjectId(
        projectId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne(
        {
          _id:
            projectId,

          isDeleted: {
            $ne:
              true,
          },
        }
      ).lean();

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    return normalizeProject(
      project as any
    );
  };

/* ============================================================
   ADMIN PROJECT REVIEW
============================================================ */

const reviewInvestmentProjectInDB =
  async (
    projectId:
      string,

    status:
      TInvestmentStatus,

    adminNote?:
      string
  ) => {
    if (
      !isValidObjectId(
        projectId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    if (
      status !==
        "APPROVED" &&
      status !==
        "REJECTED"
    ) {
      throw new AppError(
        400,
        "Only APPROVED or REJECTED is allowed"
      );
    }

    const project =
      await InvestmentProject.findOne(
        {
          _id:
            projectId,

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (!project) {
      throw new AppError(
        404,
        "Project not found"
      );
    }

    if (
      project.status !==
      "PENDING_REVIEW"
    ) {
      throw new AppError(
        400,
        "Project already reviewed"
      );
    }

    if (
      status ===
        "REJECTED" &&
      !adminNote?.trim()
    ) {
      throw new AppError(
        400,
        "Rejection reason is required"
      );
    }

    project.status =
      status;

    project.adminNote =
      adminNote?.trim() ||
      "";

    project.reviewedAt =
      new Date();

    project.approvedAt =
      status ===
      "APPROVED"
        ? new Date()
        : undefined;

    if (
      status ===
      "REJECTED"
    ) {
      project.fundingStatus =
        "CLOSED";
    }

    if (
      status ===
      "APPROVED"
    ) {
      project.fundingStatus =
        "OPEN";
    }

    await project.save();

    await NotificationService.createNotification(
      {
        userId:
          project.farmerId,

        type:
          status ===
          "APPROVED"
            ? "INVESTMENT_PROJECT_APPROVED"
            : "INVESTMENT_PROJECT_REJECTED",

        title:
          status ===
          "APPROVED"
            ? "Funding project approved"
            : "Funding project needs changes",

        message:
          status ===
          "APPROVED"
            ? `${project.projectName} is approved and is now visible on the public investment page.`
            : `${project.projectName} was rejected. ${project.adminNote}`,

        href:
          "/dashboard/farmer/investment",

        data: {
          projectId:
            String(
              project._id
            ),

          projectCode:
            project.projectCode,
        },
      }
    );

    return project;
  };

/* ============================================================
   INVESTOR APPLICATION
============================================================ */

const createInvestmentApplicationInDB =
  async (
    projectId:
      string,

    payload: {
      amount:
        number;

      nidNumber:
        string;

      note?:
        string;

      paymentMethod:
        | "BANK_TRANSFER"
        | "STRIPE";
    },

    investor: {
      id:
        string;

      name?:
        string;

      email:
        string;
    }
  ) => {
    if (
      !isValidObjectId(
        projectId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne(
        {
          _id:
            projectId,

          status:
            "APPROVED",

          fundingStatus:
            "OPEN",

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (!project) {
      throw new AppError(
        404,
        "This project is not open for investment"
      );
    }

    if (
      project.farmerId ===
      investor.id
    ) {
      throw new AppError(
        403,
        "You cannot invest in your own farm project"
      );
    }

    if (
      payload.amount <
      Number(
        project.minimumInvestment ||
          1000
      )
    ) {
      throw new AppError(
        400,
        `Minimum investment is ৳${Number(
          project.minimumInvestment ||
            1000
        ).toLocaleString(
          "en-BD"
        )}`
      );
    }

    const remaining =
      Math.max(
        Number(
          project.requiredInvestment
        ) -
          Number(
            project.fundedAmount ||
              0
          ),

        0
      );

    if (
      payload.amount >
      remaining
    ) {
      throw new AppError(
        400,
        `Only ৳${remaining.toLocaleString(
          "en-BD"
        )} remains to be funded`
      );
    }

    const activeApplication =
      await InvestmentApplication.exists(
        {
          projectId,

          investorId:
            investor.id,

          status: {
            $in: [
              "PENDING_REVIEW",
              "APPROVED",
            ],
          },

          paymentStatus: {
            $nin: [
              "PAID",
              "PAYMENT_REJECTED",
              "FAILED",
            ],
          },

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (
      activeApplication
    ) {
      throw new AppError(
        409,
        "You already have an active investment request for this project"
      );
    }

    const applicationCode =
      await generateCode(
        "APP",

        async (
          code
        ) =>
          Boolean(
            await InvestmentApplication.exists(
              {
                applicationCode:
                  code,
              }
            )
          )
      );

    const created =
      await InvestmentApplication.create(
        {
          applicationCode,

          projectId:
            String(
              project._id
            ),

          projectCode:
            project.projectCode,

          projectName:
            project.projectName,

          projectOwnerId:
            project.farmerId,

          projectOwnerName:
            project.farmerName,

          projectOwnerEmail:
            project.farmerEmail,

          investorId:
            investor.id,

          investorName:
            investor.name ||
            "",

          investorEmail:
            investor.email
              .toLowerCase()
              .trim(),

          nidNumber:
            payload.nidNumber.trim(),

          amount:
            payload.amount,

          note:
            payload.note ||
            "",

          paymentMethod:
            payload.paymentMethod,

          status:
            "PENDING_REVIEW",

          paymentStatus:
            "NOT_STARTED",

          isDeleted:
            false,
        }
      );

    /*
      IMPORTANT:
      NID must not be returned to the investor.
      It remains available to Admin through explicit +nidNumber select.
    */
    const safe =
      created.toObject() as unknown as Record<
        string,
        unknown
      >;

    delete safe.nidNumber;

    return safe;
  };

/* ============================================================
   MY INVESTMENTS
============================================================ */

const getMyInvestmentApplicationsFromDB =
  async (
    investorId:
      string
  ) => {
    return InvestmentApplication.find(
      {
        investorId,

        isDeleted: {
          $ne:
            true,
        },
      }
    )
      .sort({
        createdAt:
          -1,
      })
      .lean();
  };

const getMyInvestmentApplicationByIdFromDB =
  async (
    applicationId:
      string,

    investorId:
      string
  ) => {
    if (
      !isValidObjectId(
        applicationId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment application id"
      );
    }

    const application =
      await InvestmentApplication.findOne(
        {
          _id:
            applicationId,

          investorId,

          isDeleted: {
            $ne:
              true,
          },
        }
      ).lean();

    if (
      !application
    ) {
      throw new AppError(
        404,
        "Investment application not found"
      );
    }

    return application;
  };

/* ============================================================
   BANK PAYMENT
============================================================ */

const submitBankPaymentInDB =
  async (
    applicationId:
      string,

    investorId:
      string,

    payload: {
      senderBankName:
        string;

      transactionReference:
        string;

      paymentProofUrl:
        string;
    }
  ) => {
    if (
      !isValidObjectId(
        applicationId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment application id"
      );
    }

    const application =
      await InvestmentApplication.findOne(
        {
          _id:
            applicationId,

          investorId,

          status:
            "APPROVED",

          paymentMethod:
            "BANK_TRANSFER",

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (
      !application
    ) {
      throw new AppError(
        404,
        "Approved bank-transfer investment not found"
      );
    }

    if (
      application.paymentStatus ===
      "PAID"
    ) {
      throw new AppError(
        400,
        "Payment is already confirmed"
      );
    }

    application.senderBankName =
      payload.senderBankName;

    application.transactionReference =
      payload.transactionReference;

    application.paymentProofUrl =
      payload.paymentProofUrl;

    application.paymentStatus =
      "PENDING_VERIFICATION";

    application.paymentAdminNote =
      "";

    await application.save();

    await NotificationService.createNotification(
      {
        userId:
          application.projectOwnerId,

        type:
          "INVESTMENT_PAYMENT_SUBMITTED",

        title:
          "Investment payment submitted",

        message:
          `${application.investorName || "An investor"} submitted bank payment proof for ${application.projectName}. Admin verification is pending.`,

        href:
          "/dashboard/farmer/investment",

        data: {
          applicationId:
            String(
              application._id
            ),

          projectId:
            application.projectId,
        },
      }
    );

    return application;
  };

/* ============================================================
   STRIPE CHECKOUT
============================================================ */

const createStripeCheckoutSessionForInvestment =
  async (
    applicationId:
      string,

    investor: {
      id:
        string;

      email:
        string;
    }
  ) => {
    if (
      !isValidObjectId(
        applicationId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment application id"
      );
    }

    const application =
      await InvestmentApplication.findOne(
        {
          _id:
            applicationId,

          investorId:
            investor.id,

          status:
            "APPROVED",

          paymentMethod:
            "STRIPE",

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (
      !application
    ) {
      throw new AppError(
        404,
        "Approved Stripe investment not found"
      );
    }

    if (
      application.paymentStatus ===
      "PAID"
    ) {
      throw new AppError(
        400,
        "Payment is already confirmed"
      );
    }

    const project =
      await InvestmentProject.findOne(
        {
          _id:
            application.projectId,

          status:
            "APPROVED",

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (!project) {
      throw new AppError(
        404,
        "Investment project is no longer available"
      );
    }

    const stripe =
      getStripe();

    const clientUrl =
      getClientUrl();

    const session =
      await stripe.checkout.sessions.create(
        {
          mode:
            "payment",

          customer_email:
            investor.email,

          client_reference_id:
            String(
              application._id
            ),

          line_items: [
            {
              quantity:
                1,

              price_data: {
                currency:
                  "bdt",

                unit_amount:
                  Math.round(
                    Number(
                      application.amount
                    ) *
                      100
                  ),

                product_data: {
                  name:
                    `Investment: ${application.projectName}`,

                  description:
                    `AgriNova investment application ${application.applicationCode}`,
                },
              },
            },
          ],

          metadata: {
            type:
              "investment",

            investmentApplicationId:
              String(
                application._id
              ),

            projectId:
              application.projectId,

            investorId:
              application.investorId,
          },

          payment_intent_data: {
            metadata: {
              type:
                "investment",

              investmentApplicationId:
                String(
                  application._id
                ),

              projectId:
                application.projectId,

              investorId:
                application.investorId,
            },
          },

          success_url:
            `${clientUrl}/dashboard/farmer/my-investments?stripe=success&applicationId=${application._id}&session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${clientUrl}/dashboard/farmer/my-investments?stripe=cancelled&applicationId=${application._id}`,

          billing_address_collection:
            "auto",

          submit_type:
            "pay",
        }
      );

    application.stripeSessionId =
      session.id;

    application.paymentStatus =
      "AWAITING_PAYMENT";

    await application.save();

    return {
      sessionId:
        session.id,

      url:
        session.url,
    };
  };

/* ============================================================
   PAYMENT CONFIRMATION
============================================================ */

const confirmPaidApplication =
  async (
    applicationId:
      string,

    reference?: {
      stripeSessionId?:
        string;

      stripePaymentIntentId?:
        string;
    }
  ) => {
    if (
      !isValidObjectId(
        applicationId
      )
    ) {
      return null;
    }

    const application =
      await InvestmentApplication.findOneAndUpdate(
        {
          _id:
            applicationId,

          status:
            "APPROVED",

          paymentStatus: {
            $ne:
              "PAID",
          },

          isDeleted: {
            $ne:
              true,
          },
        },

        {
          $set: {
            paymentStatus:
              "PAID",

            paymentReviewedAt:
              new Date(),

            ...(reference?.stripeSessionId
              ? {
                  stripeSessionId:
                    reference.stripeSessionId,
                }
              : {}),

            ...(reference?.stripePaymentIntentId
              ? {
                  stripePaymentIntentId:
                    reference.stripePaymentIntentId,
                }
              : {}),
          },
        },

        {
          new:
            true,
        }
      );

    if (
      !application
    ) {
      return null;
    }

    const project =
      await InvestmentProject.findByIdAndUpdate(
        application.projectId,

        {
          $inc: {
            fundedAmount:
              application.amount,
          },
        },

        {
          new:
            true,
        }
      );

    if (
      project &&
      Number(
        project.fundedAmount ||
          0
      ) >=
        Number(
          project.requiredInvestment
        )
    ) {
      project.fundedAmount =
        Math.min(
          Number(
            project.fundedAmount
          ),

          Number(
            project.requiredInvestment
          )
        );

      project.fundingStatus =
        "FUNDED";

      await project.save();
    }

    await NotificationService.createManyNotifications(
      [
        {
          userId:
            application.investorId,

          type:
            "INVESTMENT_PAYMENT_CONFIRMED",

          title:
            "Investment confirmed",

          message:
            `Your ৳${Number(
              application.amount
            ).toLocaleString(
              "en-BD"
            )} investment in ${application.projectName} is confirmed.`,

          href:
            "/dashboard/farmer/my-investments",

          data: {
            applicationId:
              String(
                application._id
              ),

            projectId:
              application.projectId,
          },
        },

        {
          userId:
            application.projectOwnerId,

          type:
            "INVESTMENT_PAYMENT_CONFIRMED",

          title:
            "New investment funded",

          message:
            `৳${Number(
              application.amount
            ).toLocaleString(
              "en-BD"
            )} has been confirmed for ${application.projectName}.`,

          href:
            "/dashboard/farmer/investment",

          data: {
            applicationId:
              String(
                application._id
              ),

            projectId:
              application.projectId,
          },
        },
      ]
    );

    return application;
  };

const markInvestmentPaymentFailed =
  async (
    applicationId:
      string,

    reference?:
      string
  ) => {
    if (
      !isValidObjectId(
        applicationId
      )
    ) {
      return null;
    }

    return InvestmentApplication.findOneAndUpdate(
      {
        _id:
          applicationId,

        paymentStatus: {
          $ne:
            "PAID",
        },

        isDeleted: {
          $ne:
            true,
        },
      },

      {
        $set: {
          paymentStatus:
            "FAILED",

          ...(reference
            ? {
                stripePaymentIntentId:
                  reference,
              }
            : {}),
        },
      },

      {
        new:
          true,
      }
    );
  };

/* ============================================================
   STRIPE VERIFY
============================================================ */

const verifyStripeInvestmentSession =
  async (
    applicationId:
      string,

    investorId:
      string,

    sessionId:
      string
  ) => {
    if (
      !isValidObjectId(
        applicationId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment application id"
      );
    }

    const application =
      await InvestmentApplication.findOne(
        {
          _id:
            applicationId,

          investorId,

          paymentMethod:
            "STRIPE",

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (
      !application
    ) {
      throw new AppError(
        404,
        "Investment application not found"
      );
    }

    if (
      application.paymentStatus ===
      "PAID"
    ) {
      return application;
    }

    if (
      application.stripeSessionId &&
      application.stripeSessionId !==
        sessionId
    ) {
      throw new AppError(
        400,
        "Stripe session does not match this investment"
      );
    }

    const session =
      await getStripe().checkout.sessions.retrieve(
        sessionId
      );

    if (
      session.metadata
        ?.investmentApplicationId !==
      String(
        application._id
      )
    ) {
      throw new AppError(
        400,
        "Stripe session is not linked to this investment"
      );
    }

    if (
      session.payment_status ===
      "paid"
    ) {
      await confirmPaidApplication(
        String(
          application._id
        ),

        {
          stripeSessionId:
            session.id,

          stripePaymentIntentId:
            typeof session.payment_intent ===
            "string"
              ? session.payment_intent
              : undefined,
        }
      );
    }

    const refreshed =
      await InvestmentApplication.findById(
        application._id
      ).lean();

    return refreshed;
  };

/* ============================================================
   ADMIN INVESTMENT APPLICATIONS
============================================================ */

const getAdminInvestmentApplicationsFromDB =
  async (
    query:
      IInvestmentApplicationQuery
  ) => {
    const filter:
      Record<
        string,
        unknown
      > = {
      isDeleted: {
        $ne:
          true,
      },
    };

    if (
      query.status
    ) {
      filter.status =
        query.status;
    }

    if (
      query.paymentStatus
    ) {
      filter.paymentStatus =
        query.paymentStatus;
    }

    if (
      query.paymentMethod
    ) {
      filter.paymentMethod =
        query.paymentMethod;
    }

    if (
      query.search
    ) {
      filter.$or = [
        {
          applicationCode: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },

        {
          projectName: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },

        {
          investorName: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },

        {
          investorEmail: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },

        {
          projectOwnerName: {
            $regex:
              query.search,

            $options:
              "i",
          },
        },
      ];
    }

    const {
      page,
      limit,
      skip,
    } =
      paginate(
        query,
        20
      );

    const [
      data,
      total,
    ] =
      await Promise.all([
        InvestmentApplication.find(
          filter
        )
          .select(
            "+nidNumber"
          )
          .sort({
            createdAt:
              -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        InvestmentApplication.countDocuments(
          filter
        ),
      ]);

    return {
      meta: {
        page,

        limit,

        total,

        totalPages:
          Math.ceil(
            total /
              limit
          ),
      },

      data,
    };
  };

/* ============================================================
   ADMIN APPLICATION REVIEW
============================================================ */

const reviewInvestmentApplicationInDB =
  async (
    applicationId:
      string,

    status:
      TInvestmentApplicationStatus,

    adminNote?:
      string
  ) => {
    if (
      !isValidObjectId(
        applicationId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment application id"
      );
    }

    if (
      status !==
        "APPROVED" &&
      status !==
        "REJECTED"
    ) {
      throw new AppError(
        400,
        "Only APPROVED or REJECTED is allowed"
      );
    }

    const application =
      await InvestmentApplication.findOne(
        {
          _id:
            applicationId,

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (
      !application
    ) {
      throw new AppError(
        404,
        "Investment application not found"
      );
    }

    if (
      application.status !==
      "PENDING_REVIEW"
    ) {
      throw new AppError(
        400,
        "Investment application already reviewed"
      );
    }

    if (
      status ===
        "REJECTED" &&
      !adminNote?.trim()
    ) {
      throw new AppError(
        400,
        "Rejection reason is required"
      );
    }

    if (
      status ===
      "APPROVED"
    ) {
      const project =
        await InvestmentProject.findOne(
          {
            _id:
              application.projectId,

            status:
              "APPROVED",

            fundingStatus:
              "OPEN",

            isDeleted: {
              $ne:
                true,
            },
          }
        );

      if (!project) {
        throw new AppError(
          400,
          "The project is no longer open for investment"
        );
      }

      const committedAgg =
        await InvestmentApplication.aggregate(
          [
            {
              $match: {
                projectId:
                  application.projectId,

                _id: {
                  $ne:
                    application._id,
                },

                status:
                  "APPROVED",

                paymentStatus: {
                  $nin: [
                    "PAYMENT_REJECTED",
                    "FAILED",
                  ],
                },

                isDeleted: {
                  $ne:
                    true,
                },
              },
            },

            {
              $group: {
                _id:
                  null,

                total: {
                  $sum:
                    "$amount",
                },
              },
            },
          ]
        );

      const committed =
        Number(
          committedAgg[0]
            ?.total ||
            0
        );

      const available =
        Math.max(
          Number(
            project.requiredInvestment
          ) -
            committed,

          0
        );

      if (
        Number(
          application.amount
        ) >
        available
      ) {
        throw new AppError(
          400,
          `Only ৳${available.toLocaleString(
            "en-BD"
          )} remains available for approved commitments`
        );
      }
    }

    application.status =
      status;

    application.adminNote =
      adminNote?.trim() ||
      "";

    application.reviewedAt =
      new Date();

    application.paymentStatus =
      status ===
      "APPROVED"
        ? "AWAITING_PAYMENT"
        : "NOT_STARTED";

    await application.save();

    const approvalMessage =
      `Your ৳${Number(
        application.amount
      ).toLocaleString(
        "en-BD"
      )} investment request for ${application.projectName} was approved. Complete payment from My Investments.`;

    await NotificationService.createNotification(
      {
        userId:
          application.investorId,

        type:
          status ===
          "APPROVED"
            ? "INVESTMENT_APPLICATION_APPROVED"
            : "INVESTMENT_APPLICATION_REJECTED",

        title:
          status ===
          "APPROVED"
            ? "Investment request approved"
            : "Investment request rejected",

        message:
          status ===
          "APPROVED"
            ? approvalMessage
            : `Your investment request for ${application.projectName} was rejected. ${application.adminNote}`,

        href:
          "/dashboard/farmer/my-investments",

        data: {
          applicationId:
            String(
              application._id
            ),

          projectId:
            application.projectId,
        },
      }
    );

    if (
      status ===
      "APPROVED"
    ) {
      await NotificationService.createNotification(
        {
          userId:
            application.projectOwnerId,

          type:
            "INVESTMENT_APPLICATION_APPROVED",

          title:
            "Investor commitment approved",

          message:
            `${application.investorName || "A farmer"}'s ৳${Number(
              application.amount
            ).toLocaleString(
              "en-BD"
            )} commitment to ${application.projectName} was approved. Payment is now pending.`,

          href:
            "/dashboard/farmer/investment",

          data: {
            applicationId:
              String(
                application._id
              ),

            projectId:
              application.projectId,
          },
        }
      );
    }

    return application;
  };

/* ============================================================
   ADMIN BANK PAYMENT REVIEW
============================================================ */

const reviewBankPaymentInDB =
  async (
    applicationId:
      string,

    paymentStatus:
      TInvestmentPaymentStatus,

    paymentAdminNote?:
      string
  ) => {
    if (
      !isValidObjectId(
        applicationId
      )
    ) {
      throw new AppError(
        400,
        "Invalid investment application id"
      );
    }

    if (
      paymentStatus !==
        "PAID" &&
      paymentStatus !==
        "PAYMENT_REJECTED"
    ) {
      throw new AppError(
        400,
        "Invalid payment review status"
      );
    }

    const application =
      await InvestmentApplication.findOne(
        {
          _id:
            applicationId,

          status:
            "APPROVED",

          paymentMethod:
            "BANK_TRANSFER",

          paymentStatus:
            "PENDING_VERIFICATION",

          isDeleted: {
            $ne:
              true,
          },
        }
      );

    if (
      !application
    ) {
      throw new AppError(
        404,
        "Bank payment awaiting verification was not found"
      );
    }

    if (
      paymentStatus ===
      "PAID"
    ) {
      await confirmPaidApplication(
        String(
          application._id
        )
      );
    } else {
      application.paymentStatus =
        "PAYMENT_REJECTED";

      application.paymentAdminNote =
        paymentAdminNote?.trim() ||
        "";

      application.paymentReviewedAt =
        new Date();

      await application.save();

      await NotificationService.createNotification(
        {
          userId:
            application.investorId,

          type:
            "INVESTMENT_PAYMENT_REJECTED",

          title:
            "Bank payment could not be verified",

          message:
            `Payment for ${application.projectName} was not verified. ${application.paymentAdminNote}`,

          href:
            "/dashboard/farmer/my-investments",

          data: {
            applicationId:
              String(
                application._id
              ),

            projectId:
              application.projectId,
          },
        }
      );
    }

    return InvestmentApplication.findById(
      application._id
    ).lean();
  };

/* ============================================================
   EXPORT
============================================================ */

export const InvestmentService = {
  createInvestmentProjectInDB,

  getMyInvestmentProjectsFromDB,

  getMyInvestmentProjectByIdFromDB,

  updateMyInvestmentProjectInDB,

  deleteMyInvestmentProjectFromDB,

  getApprovedInvestmentProjectsFromDB,

  getApprovedInvestmentProjectByIdFromDB,

  getAdminInvestmentProjectsFromDB,

  getAdminInvestmentProjectByIdFromDB,

  reviewInvestmentProjectInDB,

  createInvestmentApplicationInDB,

  getMyInvestmentApplicationsFromDB,

  getMyInvestmentApplicationByIdFromDB,

  submitBankPaymentInDB,

  createStripeCheckoutSessionForInvestment,

  verifyStripeInvestmentSession,

  getAdminInvestmentApplicationsFromDB,

  reviewInvestmentApplicationInDB,

  reviewBankPaymentInDB,

  confirmPaidApplication,

  markInvestmentPaymentFailed,
};