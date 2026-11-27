import {
  Request,
  Response,
} from "express";

import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import AppError from "../../../utils/AppError";

import { FarmServices } from "./farm.service";

const createFarm =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new AppError(
          401,
          "Authentication required"
        );
      }

      const payload = {
        ...req.body,

        farmerId:
          req.user.id,

        farmerEmail:
          req.user.email,
      };

      const result =
        await FarmServices.createFarmIntoDB(
          payload
        );

      sendResponse(res, {
        statusCode: 201,
        success: true,
        message:
          "Farm created successfully",
        data: result,
      });
    }
  );

const getAllFarms =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new AppError(
          401,
          "Authentication required"
        );
      }

      const {
        search,
        location,
        status,
      } = req.query;

      const result =
        await FarmServices.getAllFarmsFromDB(
          req.user.id,
          search as string,
          location as string,
          status as string
        );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Farms retrieved successfully",
        data: result,
      });
    }
  );

const getSingleFarm =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new AppError(
          401,
          "Authentication required"
        );
      }

      const { id } =
        req.params;

      const result =
        await FarmServices.getSingleFarmFromDB(
          id as string,
          req.user.id
        );

      if (!result) {
        throw new AppError(
          404,
          "Farm not found"
        );
      }

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Farm retrieved successfully",
        data: result,
      });
    }
  );

const updateFarm =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new AppError(
          401,
          "Authentication required"
        );
      }

      const { id } =
        req.params;

      const result =
        await FarmServices.updateFarmInDB(
          id as string,
          req.user.id,
          req.body
        );

      if (!result) {
        throw new AppError(
          404,
          "Farm not found"
        );
      }

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Farm updated successfully",
        data: result,
      });
    }
  );

const deleteFarm =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new AppError(
          401,
          "Authentication required"
        );
      }

      const { id } =
        req.params;

      const result =
        await FarmServices.deleteFarmFromDB(
          id as string,
          req.user.id
        );

      if (!result) {
        throw new AppError(
          404,
          "Farm not found"
        );
      }

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Farm deleted successfully",
        data: null,
      });
    }
  );

export const FarmControllers = {
  createFarm,
  getAllFarms,
  getSingleFarm,
  updateFarm,
  deleteFarm,
};