import mongoose from "mongoose";

const getMainDb = () => mongoose.connection.useDb("agrinova", { useCache: true });

export const ConsultationService = {
  async getAdminConsultationsFromDB(query: Record<string, unknown>) {
    const consultationCollection = getMainDb().collection("consultations");
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status && query.status !== "") filter.status = query.status;

    const data = await consultationCollection.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).toArray().catch(() => []);
    const total = await consultationCollection.countDocuments(filter).catch(() => 0);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getAdminConsultationByIdFromDB(consultationId: string) {
    const consultationCollection = getMainDb().collection("consultations");
    if (!mongoose.Types.ObjectId.isValid(consultationId)) return null;
    return await consultationCollection.findOne({ _id: new mongoose.Types.ObjectId(consultationId) }).catch(() => null);
  }
};