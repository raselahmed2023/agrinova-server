import {
  Farm,
  IFarm,
} from "./farm.model";

const createFarmIntoDB =
  async (
    payload: IFarm
  ) => {
    return await Farm.create(
      payload
    );
  };

const getAllFarmsFromDB =
  async (
    farmerId: string,
    search?: string,
    location?: string,
    status?: string
  ) => {
    const query: Record<
      string,
      unknown
    > = {
      farmerId,
    };

    if (search) {
      query.name = {
        $regex: search,
        $options: "i",
      };
    }

    if (
      location &&
      location !==
        "All Locations"
    ) {
      query.district = {
        $regex: location,
        $options: "i",
      };
    }

    if (
      status &&
      status !==
        "All Statuses"
    ) {
      query.status = status;
    }

    return await Farm.find(
      query
    ).sort({
      createdAt: -1,
    });
  };

const getSingleFarmFromDB =
  async (
    id: string,
    farmerId: string
  ) => {
    return await Farm.findOne({
      _id: id,
      farmerId,
    });
  };

const updateFarmInDB =
  async (
    id: string,
    farmerId: string,
    payload: Partial<IFarm>
  ) => {
    const {
      farmerId:
        _ignoredFarmerId,
      farmerEmail:
        _ignoredFarmerEmail,
      ...safePayload
    } = payload;

    return await Farm.findOneAndUpdate(
      {
        _id: id,
        farmerId,
      },
      safePayload,
      {
        new: true,
        runValidators: true,
      }
    );
  };

const deleteFarmFromDB =
  async (
    id: string,
    farmerId: string
  ) => {
    return await Farm.findOneAndDelete({
      _id: id,
      farmerId,
    });
  };

export const FarmServices = {
  createFarmIntoDB,
  getAllFarmsFromDB,
  getSingleFarmFromDB,
  updateFarmInDB,
  deleteFarmFromDB,
};