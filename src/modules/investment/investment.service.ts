import { randomBytes } from "crypto";
import { isValidObjectId } from "mongoose";

import AppError from "../../utils/AppError";

import {
  IInvestmentProject,
  IInvestmentQuery,
  TInvestmentStatus,
} from "./investment.interface";

import {
  InvestmentProject,
} from "./investment.model";

const generateProjectCode =
  async (): Promise<string> => {
    for (let i = 0; i < 10; i++) {
      const projectCode =
        `INV-${randomBytes(4)
          .toString("hex")
          .toUpperCase()}`;

      const exists =
        await InvestmentProject.exists({
          projectCode,
        });

      if (!exists) {
        return projectCode;
      }
    }

    throw new AppError(
      500,
      "Failed to generate project code"
    );
  };

const createInvestmentProjectInDB =
  async (
    payload: Omit<
      IInvestmentProject,
      | "projectCode"
      | "farmerId"
      | "farmerName"
      | "farmerEmail"
      | "status"
      | "adminNote"
      | "reviewedAt"
      | "isDeleted"
    >,
    farmer: {
      id: string;
      name?: string;
      email: string;
    }
  ) => {
    const projectCode =
      await generateProjectCode();

    const project =
      await InvestmentProject.create({
        projectCode,

        farmerId: farmer.id,

        farmerName:
          farmer.name || "",

        farmerEmail:
          farmer.email
            .toLowerCase()
            .trim(),

        projectName:
          payload.projectName,

        category:
          payload.category,

        requiredInvestment:
          payload.requiredInvestment,

        ownContribution:
          payload.ownContribution || 0,

        duration:
          payload.duration,

        expectedReturn:
          payload.expectedReturn,

        profitSharing:
          payload.profitSharing,

        estimatedRevenue:
          payload.estimatedRevenue,

        estimatedCost:
          payload.estimatedCost,

        estimatedProfit:
          payload.estimatedProfit,

        division:
          payload.division,

        district:
          payload.district,

        upazila:
          payload.upazila,

        address:
          payload.address,

        description:
          payload.description,

        projectImage:
          payload.projectImage,

        nidNumber:
          payload.nidNumber,

        nidFrontImage:
          payload.nidFrontImage,

        supportingDocument:
          payload.supportingDocument,

        status:
          "PENDING_REVIEW",

        adminNote: "",

        isDeleted: false,
      });

    return project;
  };

const getMyInvestmentProjectsFromDB =
  async (
    farmerId: string
  ) => {
    return InvestmentProject.find({
      farmerId,

      isDeleted: {
        $ne: true,
      },
    })
      .sort({
        createdAt: -1,
      })
      .lean();
  };

const getMyInvestmentProjectByIdFromDB =
  async (
    projectId: string,
    farmerId: string
  ) => {
    if (!isValidObjectId(projectId)) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne({
        _id: projectId,
        farmerId,

        isDeleted: {
          $ne: true,
        },
      }).lean();

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    return project;
  };

const updateMyInvestmentProjectInDB =
  async (
    projectId: string,
    farmerId: string,
    payload: Partial<IInvestmentProject>
  ) => {
    if (!isValidObjectId(projectId)) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne({
        _id: projectId,
        farmerId,

        isDeleted: {
          $ne: true,
        },
      });

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    if (
      project.status !==
      "PENDING_REVIEW"
    ) {
      throw new AppError(
        400,
        "Only pending projects can be edited"
      );
    }

    const allowedFields = [
      "projectName",
      "category",
      "requiredInvestment",
      "ownContribution",
      "duration",
      "expectedReturn",
      "profitSharing",
      "estimatedRevenue",
      "estimatedCost",
      "estimatedProfit",
      "division",
      "district",
      "upazila",
      "address",
      "description",
      "projectImage",
      "nidNumber",
      "nidFrontImage",
      "supportingDocument",
    ];

    for (const field of allowedFields) {
      if (
        payload[field as keyof IInvestmentProject] !==
        undefined
      ) {
        (
          project as unknown as Record<
            string,
            unknown
          >
        )[field] =
          payload[
            field as keyof IInvestmentProject
          ];
      }
    }

    await project.save();

    return project;
  };

const deleteMyInvestmentProjectFromDB =
  async (
    projectId: string,
    farmerId: string
  ) => {
    if (!isValidObjectId(projectId)) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne({
        _id: projectId,
        farmerId,
        isDeleted: {
          $ne: true,
        },
      });

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    if (
      project.status !==
      "PENDING_REVIEW"
    ) {
      throw new AppError(
        400,
        "Only pending projects can be withdrawn"
      );
    }

    project.isDeleted = true;

    await project.save();

    return project;
  };

/*
|--------------------------------------------------------------------------
| PUBLIC APPROVED PROJECTS
|--------------------------------------------------------------------------
*/

const getApprovedInvestmentProjectsFromDB =
  async (
    query: IInvestmentQuery
  ) => {
    const filter: Record<
      string,
      unknown
    > = {
      status: "APPROVED",

      isDeleted: {
        $ne: true,
      },
    };

    if (query.category) {
      filter.category =
        query.category;
    }

    if (query.search) {
      filter.$or = [
        {
          projectName: {
            $regex:
              query.search,
            $options: "i",
          },
        },
        {
          farmerName: {
            $regex:
              query.search,
            $options: "i",
          },
        },
        {
          district: {
            $regex:
              query.search,
            $options: "i",
          },
        },
      ];
    }

    const page =
      Math.max(
        Number(query.page) || 1,
        1
      );

    const limit =
      Math.min(
        Number(query.limit) || 12,
        50
      );

    const skip =
      (page - 1) * limit;

    const [
      data,
      total,
    ] =
      await Promise.all([
        InvestmentProject.find(
          filter
        )
          .select(
            "-nidNumber -nidFrontImage -supportingDocument -farmerEmail -adminNote -reviewedAt"
          )
          .sort({
            createdAt: -1,
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
            total / limit
          ),
      },

      data,
    };
  };

const getApprovedInvestmentProjectByIdFromDB =
  async (
    projectId: string
  ) => {
    if (!isValidObjectId(projectId)) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne({
        _id: projectId,

        status: "APPROVED",

        isDeleted: {
          $ne: true,
        },
      })
        .select(
          "-nidNumber -nidFrontImage -supportingDocument -farmerEmail -adminNote -reviewedAt"
        )
        .lean();

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    return project;
  };

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
*/

const getAdminInvestmentProjectsFromDB =
  async (
    query: IInvestmentQuery
  ) => {
    const filter: Record<
      string,
      unknown
    > = {
      isDeleted: {
        $ne: true,
      },
    };

    if (query.status) {
      filter.status =
        query.status;
    }

    if (query.category) {
      filter.category =
        query.category;
    }

    if (query.search) {
      filter.$or = [
        {
          projectName: {
            $regex:
              query.search,
            $options: "i",
          },
        },
        {
          farmerName: {
            $regex:
              query.search,
            $options: "i",
          },
        },
        {
          district: {
            $regex:
              query.search,
            $options: "i",
          },
        },
      ];
    }

    const page =
      Math.max(
        Number(query.page) || 1,
        1
      );

    const limit =
      Math.min(
        Number(query.limit) || 20,
        50
      );

    const skip =
      (page - 1) * limit;

    const [
      data,
      total,
    ] =
      await Promise.all([
        InvestmentProject.find(
          filter
        )
          .sort({
            createdAt: -1,
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
            total / limit
          ),
      },

      data,
    };
  };

const getAdminInvestmentProjectByIdFromDB =
  async (
    projectId: string
  ) => {
    if (!isValidObjectId(projectId)) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    const project =
      await InvestmentProject.findOne({
        _id: projectId,

        isDeleted: {
          $ne: true,
        },
      }).lean();

    if (!project) {
      throw new AppError(
        404,
        "Investment project not found"
      );
    }

    return project;
  };

const reviewInvestmentProjectInDB =
  async (
    projectId: string,
    status: TInvestmentStatus,
    adminNote?: string
  ) => {
    if (!isValidObjectId(projectId)) {
      throw new AppError(
        400,
        "Invalid investment project id"
      );
    }

    if (
      status !== "APPROVED" &&
      status !== "REJECTED"
    ) {
      throw new AppError(
        400,
        "Only APPROVED or REJECTED is allowed"
      );
    }

    const project =
      await InvestmentProject.findById(
        projectId
      );

    if (!project) {
      throw new AppError(
        404,
        "Project not found"
      );
    }

    if (
      project.isDeleted
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
      status === "REJECTED" &&
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
      adminNote?.trim() || "";

    project.reviewedAt =
      new Date();

    await project.save();

    return project;
  };

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
};