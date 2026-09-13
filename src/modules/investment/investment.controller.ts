import type { Request, Response } from "express";

import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

import {
  TInvestmentApplicationStatus,
  TInvestmentPaymentStatus,
  TInvestmentStatus,
} from "./investment.interface";
import { InvestmentService } from "./investment.service";

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "Authentication required");
  return req.user;
};

const createInvestmentProject = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.createInvestmentProjectInDB(req.body, {
    id: user.id,
    name: user.name,
    email: user.email,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Investment project submitted for admin review",
    data: result,
  });
});

const getMyInvestmentProjects = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.getMyInvestmentProjectsFromDB(user.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Investment projects retrieved successfully", data: result });
});

const getMyInvestmentProjectById = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.getMyInvestmentProjectByIdFromDB(String(req.params.projectId), user.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Investment project retrieved successfully", data: result });
});

const updateMyInvestmentProject = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.updateMyInvestmentProjectInDB(String(req.params.projectId), user.id, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Investment project updated successfully", data: result });
});

const deleteMyInvestmentProject = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.deleteMyInvestmentProjectFromDB(String(req.params.projectId), user.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Investment project withdrawn successfully", data: result });
});

const getApprovedInvestmentProjects = catchAsync(async (req: Request, res: Response) => {
  const result = await InvestmentService.getApprovedInvestmentProjectsFromDB(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Approved investment projects retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getApprovedInvestmentProjectById = catchAsync(async (req: Request, res: Response) => {
  const result = await InvestmentService.getApprovedInvestmentProjectByIdFromDB(String(req.params.projectId));
  sendResponse(res, { statusCode: 200, success: true, message: "Investment project retrieved successfully", data: result });
});

const createInvestmentApplication = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.createInvestmentApplicationInDB(
    String(req.params.projectId),
    req.body,
    { id: user.id, name: user.name, email: user.email }
  );
  sendResponse(res, { statusCode: 201, success: true, message: "Investment request submitted for admin review", data: result });
});

const getMyInvestmentApplications = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.getMyInvestmentApplicationsFromDB(user.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Your investments retrieved successfully", data: result });
});

const getMyInvestmentApplication = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.getMyInvestmentApplicationByIdFromDB(String(req.params.applicationId), user.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Investment retrieved successfully", data: result });
});

const submitBankPayment = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.submitBankPaymentInDB(String(req.params.applicationId), user.id, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Bank payment proof submitted for verification", data: result });
});

const createStripeCheckout = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await InvestmentService.createStripeCheckoutSessionForInvestment(
    String(req.params.applicationId),
    { id: user.id, email: user.email }
  );
  sendResponse(res, { statusCode: 200, success: true, message: "Stripe checkout session created", data: result });
});

const verifyStripeCheckout = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
  if (!sessionId) throw new AppError(400, "sessionId is required");
  const result = await InvestmentService.verifyStripeInvestmentSession(String(req.params.applicationId), user.id, sessionId);
  sendResponse(res, { statusCode: 200, success: true, message: "Stripe payment checked successfully", data: result });
});

const getAdminInvestmentProjects = catchAsync(async (req: Request, res: Response) => {
  const result = await InvestmentService.getAdminInvestmentProjectsFromDB(req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Investment projects retrieved successfully", meta: result.meta, data: result.data });
});

const getAdminInvestmentProjectById = catchAsync(async (req: Request, res: Response) => {
  const result = await InvestmentService.getAdminInvestmentProjectByIdFromDB(String(req.params.projectId));
  sendResponse(res, { statusCode: 200, success: true, message: "Investment project retrieved successfully", data: result });
});

const reviewInvestmentProject = catchAsync(async (req: Request, res: Response) => {
  const result = await InvestmentService.reviewInvestmentProjectInDB(
    String(req.params.projectId),
    req.body.status as TInvestmentStatus,
    req.body.adminNote
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: req.body.status === "APPROVED" ? "Investment project approved successfully" : "Investment project rejected successfully",
    data: result,
  });
});

const getAdminInvestmentApplications = catchAsync(async (req: Request, res: Response) => {
  const result = await InvestmentService.getAdminInvestmentApplicationsFromDB(req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Investment applications retrieved successfully", meta: result.meta, data: result.data });
});

const reviewInvestmentApplication = catchAsync(async (req: Request, res: Response) => {
  const result = await InvestmentService.reviewInvestmentApplicationInDB(
    String(req.params.applicationId),
    req.body.status as TInvestmentApplicationStatus,
    req.body.adminNote
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: req.body.status === "APPROVED" ? "Investment application approved" : "Investment application rejected",
    data: result,
  });
});

const reviewBankPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await InvestmentService.reviewBankPaymentInDB(
    String(req.params.applicationId),
    req.body.paymentStatus as TInvestmentPaymentStatus,
    req.body.paymentAdminNote
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: req.body.paymentStatus === "PAID" ? "Bank payment confirmed" : "Bank payment rejected",
    data: result,
  });
});

export const InvestmentController = {
  createInvestmentProject,
  getMyInvestmentProjects,
  getMyInvestmentProjectById,
  updateMyInvestmentProject,
  deleteMyInvestmentProject,
  getApprovedInvestmentProjects,
  getApprovedInvestmentProjectById,
  createInvestmentApplication,
  getMyInvestmentApplications,
  getMyInvestmentApplication,
  submitBankPayment,
  createStripeCheckout,
  verifyStripeCheckout,
  getAdminInvestmentProjects,
  getAdminInvestmentProjectById,
  reviewInvestmentProject,
  getAdminInvestmentApplications,
  reviewInvestmentApplication,
  reviewBankPayment,
};