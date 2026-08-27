import { Farm, IFarm } from './farm.model';

const createFarmIntoDB = async (payload: IFarm) => {
  return await Farm.create(payload);
};

const getAllFarmsFromDB = async (
  search?: string,
  location?: string,
  status?: string
) => {
  const query: Record<string, unknown> = {};

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }
  if (location && location !== 'All Locations') {
    query.district = { $regex: location, $options: 'i' };
  }
  if (status && status !== 'All Statuses') {
    query.status = status;
  }

  return await Farm.find(query).sort({ createdAt: -1 });
};

const getSingleFarmFromDB = async (id: string) => {
  return await Farm.findById(id);
};

const updateFarmInDB = async (id: string, payload: Partial<IFarm>) => {
  return await Farm.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
};

const deleteFarmFromDB = async (id: string) => {
  return await Farm.findByIdAndDelete(id);
};

export const FarmServices = {
  createFarmIntoDB,
  getAllFarmsFromDB,
  getSingleFarmFromDB,
  updateFarmInDB,
  deleteFarmFromDB,
};