import { Request, Response } from 'express';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import { FarmServices } from './farm.service';

const createFarm = catchAsync(async (req: Request, res: Response) => {
  const result = await FarmServices.createFarmIntoDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Farm created successfully',
    data: result,
  });
});

const getAllFarms = catchAsync(async (req: Request, res: Response) => {
  const { search, location, status } = req.query;
  const result = await FarmServices.getAllFarmsFromDB(
    search as string,
    location as string,
    status as string
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Farms retrieved successfully',
    data: result,
  });
});

const getSingleFarm = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FarmServices.getSingleFarmFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Farm retrieved successfully',
    data: result,
  });
});

const updateFarm = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FarmServices.updateFarmInDB(id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Farm updated successfully',
    data: result,
  });
});

const deleteFarm = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await FarmServices.deleteFarmFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Farm deleted successfully',
    data: null,
  });
});

export const FarmControllers = {
  createFarm,
  getAllFarms,
  getSingleFarm,
  updateFarm,
  deleteFarm,
};