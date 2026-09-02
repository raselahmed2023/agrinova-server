import mongoose from "mongoose";

const getUserModel = () => {
  const authConn = mongoose.connection.useDb("AgriNove-auth", { useCache: true });
  return authConn.collection("user");
};

export const UserService = {
  async getUsersFromDB(query: Record<string, unknown>) {
    const userCollection = getUserModel();
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.role && query.role !== "") filter.role = query.role;
    if (query.status && query.status !== "") filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
      ];
    }

    const data = await userCollection.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).project({ password: 0 }).toArray();
    const total = await userCollection.countDocuments(filter);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getUserByIdFromDB(userId: string) {
    const userCollection = getUserModel();
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await userCollection.findOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { projection: { password: 0 } }
    );
  },

  async updateUserStatusInDB(userId: string, status: "ACTIVE" | "BLOCKED") {
    const userCollection = getUserModel();
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    
    const result = await userCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after", projection: { password: 0 } }
    );
    return result;
  },

  async getAdminProfileFromDB(adminId: string) {
    const userCollection = getUserModel();
    if (!mongoose.Types.ObjectId.isValid(adminId)) return null;
    return await userCollection.findOne(
      { _id: new mongoose.Types.ObjectId(adminId) },
      { projection: { password: 0 } }
    );
  },

  async updateAdminProfileInDB(adminId: string, payload: { name?: string; phone?: string }) {
    const userCollection = getUserModel();
    if (!mongoose.Types.ObjectId.isValid(adminId)) return null;

    const result = await userCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(adminId) },
      { $set: { ...payload, updatedAt: new Date() } },
      { returnDocument: "after", projection: { password: 0 } }
    );
    return result;
  }
};