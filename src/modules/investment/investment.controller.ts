import type { Request, Response } from "express";
import { InvestmentProject } from "./investment.model.js";
import { createInvestmentProjectSchema } from "./investment.validation.js";

const getUserId = (req: Request) => {
  const user = (req as any).user;

  return user?.id || user?._id || user?.userId;
};

export const createInvestmentProject = async (
  req: Request,
  res: Response
) => {
  try {
    const farmerId = getUserId(req);

    if (!farmerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const parsedData = createInvestmentProjectSchema.safeParse(
      req.body
    );

    if (!parsedData.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsedData.error.flatten().fieldErrors,
      });
    }

    const project = await InvestmentProject.create({
      farmerId,
      ...parsedData.data,
      receivedInvestment: 0,
      status: "Pending Review",
    });

    const safeProject = {
      _id: project._id,
      farmerId: project.farmerId,
      projectTitle: project.projectTitle,
      category: project.category,
      requiredInvestment: project.requiredInvestment,
      projectedProfit: project.projectedProfit,
      duration: project.duration,
      location: project.location,
      projectImage: project.projectImage,
      description: project.description,
      receivedInvestment: project.receivedInvestment,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    return res.status(201).json({
      success: true,
      message: "Investment project submitted for admin review",
      data: safeProject,
    });
  } catch (error) {
    console.error("Create investment project error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create investment project",
    });
  }
};

export const getMyInvestmentProjects = async (
  req: Request,
  res: Response
) => {
  try {
    const farmerId = getUserId(req);

    if (!farmerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const projects = await InvestmentProject.find({
      farmerId,
    })
      .select("-nidNumber -supportingDocument")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      message: "Investment projects retrieved successfully",
      data: projects,
    });
  } catch (error) {
    console.error("Get investment projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve investment projects",
    });
  }
};