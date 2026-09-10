import mongoose from "mongoose";

const getMainDb = () => mongoose.connection.useDb("agrinova", { useCache: true });

export const FarmService = {
  async getAdminFarmsFromDB(query: Record<string, unknown>) {
    const farmCollection = getMainDb().collection("farms");
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.district && query.district !== "") filter.district = { $regex: query.district, $options: "i" };
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { soilType: { $regex: query.search, $options: "i" } },
      ];
    }

    const data = await farmCollection.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).toArray();
    const total = await farmCollection.countDocuments(filter);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getAdminFarmByIdFromDB(farmId: string) {
    const farmCollection = getMainDb().collection("farms");
    if (!mongoose.Types.ObjectId.isValid(farmId)) return null;
    return await farmCollection.findOne({ _id: new mongoose.Types.ObjectId(farmId) });
  }
};