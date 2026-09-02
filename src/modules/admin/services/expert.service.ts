import mongoose from "mongoose";

const getUserModel = () => {
  const authConn = mongoose.connection.useDb("AgriNove-auth", { useCache: true });
  return authConn.collection("user");
};

export const ExpertService = {
  async getPendingExpertsFromDB() {
    const userCollection = getUserModel();
    return await userCollection.find({ role: "EXPERT", status: "PENDING" }).sort({ createdAt: -1 }).project({ password: 0 }).toArray();
  },

  async getExpertByIdFromDB(expertId: string) {
    const userCollection = getUserModel();
    if (!mongoose.Types.ObjectId.isValid(expertId)) return null;
    return await userCollection.findOne(
      { _id: new mongoose.Types.ObjectId(expertId), role: "EXPERT" },
      { projection: { password: 0 } }
    );
  },

  async approveExpertInDB(expertId: string) {
    const userCollection = getUserModel();
    if (!mongoose.Types.ObjectId.isValid(expertId)) throw new Error("Invalid expert ID");

    const expert = await userCollection.findOne({ _id: new mongoose.Types.ObjectId(expertId), role: "EXPERT" });
    if (!expert) throw new Error("Expert not found");

    if (expert.status === "APPROVED" || expert.status === "ACTIVE") {
      throw new Error("Expert is already approved");
    }

    const result = await userCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(expertId) },
      { $set: { status: "APPROVED", updatedAt: new Date() } },
      { returnDocument: "after", projection: { password: 0 } }
    );
    return result;
  },

  async rejectExpertInDB(expertId: string, reason?: string) {
    const userCollection = getUserModel();
    if (!mongoose.Types.ObjectId.isValid(expertId)) throw new Error("Invalid expert ID");

    const expert = await userCollection.findOne({ _id: new mongoose.Types.ObjectId(expertId), role: "EXPERT" });
    if (!expert) throw new Error("Expert not found");

    if (expert.status === "REJECTED") {
      throw new Error("Expert application is already rejected");
    }

    const result = await userCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(expertId) },
      { $set: { status: "REJECTED", rejectionReason: reason || "", updatedAt: new Date() } },
      { returnDocument: "after", projection: { password: 0 } }
    );
    return result;
  }
};