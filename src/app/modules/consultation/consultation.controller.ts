import type { Request, Response } from "express";
import AppError from "../../../utils/AppError";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { ConsultationServices } from "./consultation.service";

const createConsultation = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const result = await ConsultationServices.createConsultationIntoDB(
    req.user,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Consultation request created successfully",
    data: result,
  });
});

const getAllConsultations = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const result = await ConsultationServices.getAllConsultationsFromDB(
    req.user,
    req.query
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultations retrieved successfully",
    data: result,
  });
});

const getExpertConsultations = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const result = await ConsultationServices.getExpertConsultationsFromDB(
      req.user,
      req.query
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expert consultations retrieved successfully",
      data: result,
    });
  }
);

const getSingleConsultation = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const { consultationId, id } = req.params;
    const targetId = (consultationId || id) as string;

    const result = await ConsultationServices.getSingleConsultationFromDB(
      targetId,
      req.user
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Consultation retrieved successfully",
      data: result,
    });
  }
);

const acceptConsultation = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const { consultationId, id } = req.params;
  const targetId = (consultationId || id) as string;

  const result = await ConsultationServices.acceptConsultationInDB(
    targetId,
    req.user
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultation request accepted successfully",
    data: result,
  });
});

const rejectConsultation = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const { consultationId, id } = req.params;
  const targetId = (consultationId || id) as string;
  const reason = req.body?.reason;

  const result = await ConsultationServices.rejectConsultationInDB(
    targetId,
    reason,
    req.user
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultation request rejected successfully",
    data: result,
  });
});

const scheduleConsultation = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const { consultationId, id } = req.params;
  const targetId = (consultationId || id) as string;

  const result = await ConsultationServices.scheduleConsultationInDB(
    targetId,
    req.body,
    req.user
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultation scheduled successfully",
    data: result,
  });
});

const updateConsultationStatus = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const { consultationId, id } = req.params;
    const targetId = (consultationId || id) as string;
    const { status, reason } = req.body;

    const result = await ConsultationServices.updateConsultationStatusInDB(
      targetId,
      status,
      reason
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Consultation status updated successfully",
      data: result,
    });
  }
);

const addRecommendation = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const { consultationId, id } = req.params;
  const targetId = (consultationId || id) as string;

  const result = await ConsultationServices.addRecommendationInDB(
    targetId,
    req.body,
    req.user
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultation recommendation submitted successfully",
    data: result,
  });
});

const getExpertStats = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const result = await ConsultationServices.getExpertConsultationStatsFromDB(
    req.user
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Expert consultation stats retrieved successfully",
    data: result,
  });
});

export const ConsultationControllers = {
  createConsultation,
  getAllConsultations,
  getExpertConsultations,
  getSingleConsultation,
  acceptConsultation,
  rejectConsultation,
  scheduleConsultation,
  updateConsultationStatus,
  addRecommendation,
  getExpertStats,
};
