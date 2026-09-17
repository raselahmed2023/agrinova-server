import {
  randomBytes,
} from "crypto";

import {
  isValidObjectId,
} from "mongoose";

import Stripe from "stripe";

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
   CODE GENERATOR
============================================================ */

const generateCode = async (
  prefix: string,

  exists: (
    code: string
  ) => Promise<boolean>
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

/* ============================================================
   STRIPE
============================================================ */

const getStripe =
  () => {
    const key =
      process.env
        .STRIPE_SECRET_KEY ||
      process.env
        .STRIPE_SECRET;

    if (
      !key
    ) {
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

    if (
      !url
    ) {
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

/* ============================================================
   NORMALIZE PROJECT
============================================================ */

/**
 * Supports old investment documents while the new Farmer Care
 * investment structure uses:
 *
 * durationMonths
 * expectedReturnPercent
 */
const normalizeProject =
  <
    T extends Record<
      string,
      any
    >
  >(
    project: T
  ): T => {
    const durationMonths =
      Number(
        project.durationMonths ||
          parseInt(
            String(
              project.duration ||
                "0"
            ),
            10
          ) ||
          0
      );

    /**
     * Legacy database projects may contain:
     *
     * expectedReturn = "15%"
     *
     * New projects use:
     *
     * expectedReturnPercent = 15
     */
    const legacyReturn =
      parseFloat(
        String(
          project.expectedReturn ||
            ""
        ).replace(
          /[^0-9.]/g,
          ""
        )
      );

    const expectedReturnPercent =
      Number(
        project.expectedReturnPercent ||
          legacyReturn ||
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

      expectedReturnPercent,

      useOfFunds:
        project.useOfFunds ||
        "Project operations and agricultural development",

      fundingStatus:
        project.fundingStatus ||
        "OPEN",
    };
  };

/* ============================================================
   PUBLIC PROJECT SANITIZER
============================================================ */

/**
 * Public API should not expose:
 *
 * farmer email
 * admin notes
 * private documents
 * old profit-sharing data
 * farmer NID
 *
 * We normalize FIRST so legacy expectedReturn can still be
 * converted into expectedReturnPercent.
 */
const toPublicProject =
  (
    project:
      Record<
        string,
        any
      >
  ) => {
    const normalized =
      normalizeProject(
        {
          ...project,
        }
      ) as Record<
        string,
        any
      >;

    delete normalized
      .farmerEmail;

    delete normalized
      .adminNote;

    delete normalized
      .reviewedAt;

    delete normalized
      .supportingDocument;

    delete normalized
      .nidNumber;

    delete normalized
      .nidFrontImage;

    /* ========================================================
       OLD FINANCIAL MODEL
    ======================================================== */

    delete normalized
      .ownContribution;

    delete normalized
      .investorSharePercent;

    delete normalized
      .duration;

    delete normalized
      .expectedReturn;

    delete normalized
      .profitSharing;

    delete normalized
      .estimatedRevenue;

    delete normalized
      .estimatedCost;

    delete normalized
      .estimatedProfit;

    return normalized;
  };

/* ============================================================
   FARMER - CREATE INVESTMENT PROJECT
============================================================ */

/**
 * Farmer does NOT need to select an existing Farm anymore.
 *
 * This is now a standalone agricultural investment project.
 */
const createInvestmentProjectInDB =
  async (
    payload:
      Pick<
        IInvestmentProject,
        | "projectName"
        | "category"
        | "requiredInvestment"
        | "minimumInvestment"
        | "durationMonths"
        | "expectedReturnPercent"
        | "division"
        | "district"
        | "upazila"
        | "address"
        | "description"
        | "useOfFunds"
        | "projectImage"
        | "supportingDocument"
      >,

    farmer: {
      id: string;

      name?: string;

      email: string;
    }
  ) => {
    /* ========================================================
       VALIDATE FINANCIAL DATA
    ======================================================== */

    if (
      Number(
        payload.requiredInvestment
      ) <=
      0
    ) {
      throw new AppError(
        400,
        "Funding goal must be greater than 0"
      );
    }

    if (
      Number(
        payload.minimumInvestment
      ) <=
      0
    ) {
      throw new AppError(
        400,
        "Minimum investment must be greater than 0"
      );
    }

    if (
      Number(
        payload.minimumInvestment
      ) >
      Number(
        payload.requiredInvestment
      )
    ) {
      throw new AppError(
        400,
        "Minimum investment cannot exceed the funding goal"
      );
    }

    if (
      Number(
        payload.durationMonths
      ) <=
      0
    ) {
      throw new AppError(
        400,
        "Investment term must be greater than 0"
      );
    }

    if (
      Number(
        payload.expectedReturnPercent
      ) <=
      0
    ) {
      throw new AppError(
        400,
        "Projected ROI must be greater than 0"
      );
    }

    /* ========================================================
       PROJECT CODE
    ======================================================== */

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

    /* ========================================================
       CREATE PROJECT
    ======================================================== */

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

          /**
           * Legacy compatibility.
           *
           * New projects are no longer attached to a Farm.
           */
          farmId:
            "",

          farmName:
            "",

          projectName:
            payload.projectName
              .trim(),

          category:
            payload.category,

          requiredInvestment:
            Number(
              payload.requiredInvestment
            ),

          minimumInvestment:
            Number(
              payload.minimumInvestment
            ),

          fundedAmount:
            0,

          durationMonths:
            Number(
              payload.durationMonths
            ),

          expectedReturnPercent:
            Number(
              payload.expectedReturnPercent
            ),

          division:
            payload.division
              .trim(),

          district:
            payload.district
              .trim(),

          upazila:
            payload.upazila
              .trim(),

          address:
            payload.address
              ?.trim() ||
            "",

          description:
            payload.description
              .trim(),

          useOfFunds:
            payload.useOfFunds
              .trim(),

          projectImage:
            payload.projectImage,

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

    return normalizeProject(
      project.toObject() as any
    );
  };

/* ============================================================
   FARMER - MY PROJECTS
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

/* ============================================================
   FARMER - MY SINGLE PROJECT
============================================================ */

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

    if (
      !project
    ) {
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
   FARMER - UPDATE PROJECT
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

    if (
      !project
    ) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    /**
     * Once public funding has started,
     * farmer must not silently change investment terms.
     */
    if (
      project.status ===
      "APPROVED"
    ) {
      throw new AppError(
        400,
        "Approved projects cannot be edited while funding is active"
      );
    }

    /* ========================================================
       ONLY THESE FIELDS MAY BE EDITED
    ======================================================== */

    const allowedFields = [
      "projectName",

      "category",

      "requiredInvestment",

      "minimumInvestment",

      "durationMonths",

      "expectedReturnPercent",

      "division",

      "district",

      "upazila",

      "address",

      "description",

      "useOfFunds",

      "projectImage",

      "supportingDocument",
    ] as const;

    for (
      const field of
        allowedFields
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
        )[
          field
        ] =
          value;
      }
    }

    /* ========================================================
       VALIDATE UPDATED TERMS
    ======================================================== */

    if (
      Number(
        project.requiredInvestment
      ) <=
      0
    ) {
      throw new AppError(
        400,
        "Funding goal must be greater than 0"
      );
    }

    if (
      Number(
        project.minimumInvestment
      ) <=
      0
    ) {
      throw new AppError(
        400,
        "Minimum investment must be greater than 0"
      );
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
      Number(
        project.durationMonths
      ) <=
      0
    ) {
      throw new AppError(
        400,
        "Investment term must be greater than 0"
      );
    }

    if (
      Number(
        project.expectedReturnPercent
      ) <=
      0
    ) {
      throw new AppError(
        400,
        "Projected ROI must be greater than 0"
      );
    }

    /* ========================================================
       REJECTED PROJECT → RESUBMIT
    ======================================================== */

    if (
      project.status ===
      "REJECTED"
    ) {
      project.status =
        "PENDING_REVIEW";

      project.fundingStatus =
        "OPEN";

      project.adminNote =
        "";

      project.reviewedAt =
        undefined;

      project.approvedAt =
        undefined;
    }

    await project.save();

    return normalizeProject(
      project.toObject() as any
    );
  };

/* ============================================================
   FARMER - WITHDRAW PROJECT
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

    if (
      !project
    ) {
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
      ) >
        0
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
   PROJECT FILTER
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
        any
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

      filter.fundingStatus =
        {
          $in: [
            "OPEN",
            "FUNDED",
          ],
        };
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
        ?.trim()
    ) {
      const search =
        query.search
          .trim();

      filter.$or = [
        {
          projectName: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          farmName: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          farmerName: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          district: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          division: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          projectCode: {
            $regex:
              search,

            $options:
              "i",
          },
        },
      ];
    }

    return filter;
  };

/* ============================================================
   PAGINATION
============================================================ */

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
        ) ||
          1,

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
        (
          page -
          1
        ) *
        limit,
    };
  };

/* ============================================================
   PUBLIC - APPROVED PROJECTS
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
      await Promise.all(
        [
          /**
           * Keep legacy expectedReturn internally.
           * toPublicProject() removes it AFTER ROI migration.
           */
          InvestmentProject.find(
            filter
          )
            .select(
              [
                "-farmerEmail",
                "-adminNote",
                "-reviewedAt",
                "-supportingDocument",
                "-nidNumber",
                "-nidFrontImage",
              ].join(
                " "
              )
            )
            .sort({
              createdAt:
                -1,
            })
            .skip(
              skip
            )
            .limit(
              limit
            )
            .lean(),

          InvestmentProject.countDocuments(
            filter
          ),
        ]
      );

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
            toPublicProject(
              project as any
            )
        ),
    };
  };

/* ============================================================
   PUBLIC - SINGLE PROJECT
============================================================ */

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
          [
            "-farmerEmail",
            "-adminNote",
            "-reviewedAt",
            "-supportingDocument",
            "-nidNumber",
            "-nidFrontImage",
          ].join(
            " "
          )
        )
        .lean();

    if (
      !project
    ) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    return toPublicProject(
      project as any
    );
  };

/* ============================================================
   ADMIN - PROJECTS
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
      await Promise.all(
        [
          InvestmentProject.find(
            filter
          )
            .sort({
              createdAt:
                -1,
            })
            .skip(
              skip
            )
            .limit(
              limit
            )
            .lean(),

          InvestmentProject.countDocuments(
            filter
          ),
        ]
      );

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

/* ============================================================
   ADMIN - SINGLE PROJECT
============================================================ */

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

    if (
      !project
    ) {
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
   ADMIN - REVIEW PROJECT
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

    if (
      !project
    ) {
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
      !adminNote
        ?.trim()
    ) {
      throw new AppError(
        400,
        "Rejection reason is required"
      );
    }

    /**
     * Farmer Care investment cannot be approved
     * without clear investment terms.
     */
    if (
      status ===
        "APPROVED" &&
      Number(
        project.expectedReturnPercent ||
          0
      ) <=
        0
    ) {
      throw new AppError(
        400,
        "Projected ROI is required before this project can be approved"
      );
    }

    if (
      status ===
        "APPROVED" &&
      Number(
        project.durationMonths ||
          0
      ) <=
        0
    ) {
      throw new AppError(
        400,
        "Investment term is required before this project can be approved"
      );
    }

    project.status =
      status;

    project.adminNote =
      adminNote
        ?.trim() ||
      "";

    project.reviewedAt =
      new Date();

    project.approvedAt =
      status ===
      "APPROVED"
        ? new Date()
        : undefined;

    project.fundingStatus =
      status ===
      "APPROVED"
        ? "OPEN"
        : "CLOSED";

    await project.save();

    /* ========================================================
       FARMER NOTIFICATION
    ======================================================== */

    await NotificationService
      .createNotification(
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
              ? "Investment project approved"
              : "Investment project needs changes",

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

    return normalizeProject(
      project.toObject() as any
    );
  };

/* ============================================================
   INVESTOR - CREATE INVESTMENT APPLICATION
============================================================ */

const createInvestmentApplicationInDB =
  async (
    projectId:
      string,

    payload: {
      amount: number;

      nidNumber: string;

      note?: string;

      paymentMethod:
        | "BANK_TRANSFER"
        | "STRIPE";
    },

    investor: {
      id: string;

      name?: string;

      email: string;
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

    if (
      !project
    ) {
      throw new AppError(
        404,
        "This project is not open for investment"
      );
    }

    /* ========================================================
       OWNER CANNOT INVEST IN OWN PROJECT
    ======================================================== */

    if (
      project.farmerId ===
      investor.id
    ) {
      throw new AppError(
        403,
        "You cannot invest in your own investment project"
      );
    }

    /* ========================================================
       AVAILABLE FUNDING
    ======================================================== */

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
      remaining <=
      0
    ) {
      throw new AppError(
        400,
        "This project is already fully funded"
      );
    }

    const configuredMinimum =
      Number(
        project.minimumInvestment ||
          1000
      );

    /**
     * If the final remaining amount is smaller
     * than the normal minimum, allow that final amount.
     */
    const effectiveMinimum =
      Math.min(
        configuredMinimum,
        remaining
      );

    if (
      Number(
        payload.amount
      ) <
      effectiveMinimum
    ) {
      throw new AppError(
        400,
        `Minimum investment is ৳${effectiveMinimum.toLocaleString(
          "en-BD"
        )}`
      );
    }

    if (
      Number(
        payload.amount
      ) >
      remaining
    ) {
      throw new AppError(
        400,
        `Only ৳${remaining.toLocaleString(
          "en-BD"
        )} remains to be funded`
      );
    }

    /* ========================================================
       DUPLICATE ACTIVE APPLICATION
    ======================================================== */

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

    /* ========================================================
       APPLICATION CODE
    ======================================================== */

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

    /* ========================================================
       CREATE APPLICATION
    ======================================================== */

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

          /**
           * Admin-only sensitive information.
           */
          nidNumber:
            payload.nidNumber
              .trim(),

          amount:
            Number(
              payload.amount
            ),

          /**
           * IMPORTANT:
           *
           * Snapshot investment terms at application time.
           *
           * If the project changes in the future,
           * this investor still has a record of the
           * terms they applied under.
           */
          expectedReturnPercent:
            Number(
              project.expectedReturnPercent ||
                0
            ),

          durationMonths:
            Number(
              project.durationMonths ||
                0
            ),

          note:
            payload.note
              ?.trim() ||
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

    /**
     * nidNumber is select:false in the model,
     * but the freshly-created Mongoose document still
     * contains it in memory.
     *
     * Remove before sending to client.
     */
    const safe =
      created.toObject() as unknown as Record<
        string,
        unknown
      >;

    delete safe
      .nidNumber;

    return safe;
  };

/* ============================================================
   INVESTOR - MY INVESTMENTS
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

/* ============================================================
   INVESTOR - SINGLE INVESTMENT
============================================================ */

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
   ENSURE APPLICATION STILL FITS FUNDING
============================================================ */

const ensureApplicationStillFitsAvailableFunding =
  async (
    application: {
      _id:
        unknown;

      projectId:
        string;

      amount:
        number;
    }
  ) => {
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

    if (
      !project
    ) {
      throw new AppError(
        400,
        "The project is no longer open for investment"
      );
    }

    /**
     * Count approved commitments that have not failed
     * or been payment-rejected.
     */
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
        committedAgg[
          0
        ]?.total ||
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
        409,
        `Only ৳${available.toLocaleString(
          "en-BD"
        )} remains available. This payment can no longer be retried because the funding was committed to another investor.`
      );
    }

    return project;
  };

/* ============================================================
   BANK PAYMENT - INVESTOR SUBMISSION
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

    if (
      application.paymentStatus ===
      "PENDING_VERIFICATION"
    ) {
      throw new AppError(
        409,
        "Your bank payment proof is already awaiting Admin verification"
      );
    }

    await ensureApplicationStillFitsAvailableFunding(
      application
    );

    application.senderBankName =
      payload.senderBankName
        .trim();

    application.transactionReference =
      payload.transactionReference
        .trim();

    application.paymentProofUrl =
      payload.paymentProofUrl
        .trim();

    application.paymentStatus =
      "PENDING_VERIFICATION";

    application.paymentAdminNote =
      "";

    await application.save();

    /* ========================================================
       PROJECT OWNER NOTIFICATION
    ======================================================== */

    await NotificationService
      .createNotification(
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

    if (
      !project
    ) {
      throw new AppError(
        404,
        "Investment project is no longer available"
      );
    }

    await ensureApplicationStillFitsAvailableFunding(
      application
    );

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
   CONFIRM PAID APPLICATION
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

    /**
     * Atomic status update prevents the same application
     * from increasing fundedAmount twice.
     */
    const application =
      await InvestmentApplication
        .findOneAndUpdate(
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

              ...(reference
                ?.stripeSessionId
                ? {
                    stripeSessionId:
                      reference
                        .stripeSessionId,
                  }
                : {}),

              ...(reference
                ?.stripePaymentIntentId
                ? {
                    stripePaymentIntentId:
                      reference
                        .stripePaymentIntentId,
                  }
                : {}),
            },
          },

          {
            new:
              true,
          }
        );

    /**
     * Already processed.
     */
    if (
      !application
    ) {
      return null;
    }

    /* ========================================================
       INCREASE PROJECT FUNDING
    ======================================================== */

    const project =
      await InvestmentProject
        .findByIdAndUpdate(
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
      /**
       * Do not display funded amount above goal.
       */
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

    /* ========================================================
       NOTIFICATIONS
    ======================================================== */

    await NotificationService
      .createManyNotifications(
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

/* ============================================================
   STRIPE FAILURE
============================================================ */

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

    return InvestmentApplication
      .findOneAndUpdate(
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
                  stripeSessionId:
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
   VERIFY STRIPE SESSION
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
      await getStripe()
        .checkout
        .sessions
        .retrieve(
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
            typeof session
              .payment_intent ===
            "string"
              ? session
                  .payment_intent
              : undefined,
        }
      );
    }

    return InvestmentApplication
      .findById(
        application._id
      )
      .lean();
  };

/* ============================================================
   ADMIN - INVESTMENT APPLICATIONS
============================================================ */

const getAdminInvestmentApplicationsFromDB =
  async (
    query:
      IInvestmentApplicationQuery
  ) => {
    const filter:
      Record<
        string,
        any
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
        ?.trim()
    ) {
      const search =
        query.search
          .trim();

      filter.$or = [
        {
          applicationCode: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          projectName: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          investorName: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          investorEmail: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          projectOwnerName: {
            $regex:
              search,

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
      await Promise.all(
        [
          /**
           * Only ADMIN list explicitly selects NID.
           */
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
            .skip(
              skip
            )
            .limit(
              limit
            )
            .lean(),

          InvestmentApplication
            .countDocuments(
              filter
            ),
        ]
      );

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
   ADMIN - REVIEW INVESTMENT APPLICATION
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
      !adminNote
        ?.trim()
    ) {
      throw new AppError(
        400,
        "Rejection reason is required"
      );
    }

    /* ========================================================
       PREVENT OVER-COMMITMENT
    ======================================================== */

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

      if (
        !project
      ) {
        throw new AppError(
          400,
          "The project is no longer open for investment"
        );
      }

      const committedAgg =
        await InvestmentApplication
          .aggregate(
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
          committedAgg[
            0
          ]?.total ||
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

    /* ========================================================
       REVIEW RESULT
    ======================================================== */

    application.status =
      status;

    application.adminNote =
      adminNote
        ?.trim() ||
      "";

    application.reviewedAt =
      new Date();

    application.paymentStatus =
      status ===
      "APPROVED"
        ? "AWAITING_PAYMENT"
        : "NOT_STARTED";

    await application.save();

    /* ========================================================
       INVESTOR NOTIFICATION
    ======================================================== */

    const approvalMessage =
      `Your ৳${Number(
        application.amount
      ).toLocaleString(
        "en-BD"
      )} investment request for ${application.projectName} was approved. Complete payment from My Investments.`;

    await NotificationService
      .createNotification(
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

    /* ========================================================
       PROJECT OWNER NOTIFICATION
    ======================================================== */

    if (
      status ===
      "APPROVED"
    ) {
      await NotificationService
        .createNotification(
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
   ADMIN - REVIEW BANK PAYMENT
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

    /* ========================================================
       PAYMENT CONFIRMED
    ======================================================== */

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
      /* ======================================================
         PAYMENT REJECTED
      ====================================================== */

      application.paymentStatus =
        "PAYMENT_REJECTED";

      application.paymentAdminNote =
        paymentAdminNote
          ?.trim() ||
        "";

      application.paymentReviewedAt =
        new Date();

      await application.save();

      await NotificationService
        .createNotification(
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

    return InvestmentApplication
      .findById(
        application._id
      )
      .lean();
  };

/* ============================================================
   EXPORT
============================================================ */

export const InvestmentService = {
  /* ==========================================================
     FARMER PROJECTS
  ========================================================== */

  createInvestmentProjectInDB,

  getMyInvestmentProjectsFromDB,

  getMyInvestmentProjectByIdFromDB,

  updateMyInvestmentProjectInDB,

  deleteMyInvestmentProjectFromDB,

  /* ==========================================================
     PUBLIC
  ========================================================== */

  getApprovedInvestmentProjectsFromDB,

  getApprovedInvestmentProjectByIdFromDB,

  /* ==========================================================
     ADMIN PROJECTS
  ========================================================== */

  getAdminInvestmentProjectsFromDB,

  getAdminInvestmentProjectByIdFromDB,

  reviewInvestmentProjectInDB,

  /* ==========================================================
     INVESTOR
  ========================================================== */

  createInvestmentApplicationInDB,

  getMyInvestmentApplicationsFromDB,

  getMyInvestmentApplicationByIdFromDB,

  submitBankPaymentInDB,

  createStripeCheckoutSessionForInvestment,

  verifyStripeInvestmentSession,

  /* ==========================================================
     ADMIN APPLICATIONS / PAYMENTS
  ========================================================== */

  getAdminInvestmentApplicationsFromDB,

  reviewInvestmentApplicationInDB,

  reviewBankPaymentInDB,


  confirmPaidApplication,

  markInvestmentPaymentFailed,
};