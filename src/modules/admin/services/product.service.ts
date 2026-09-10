import mongoose from "mongoose";

const getMainDb = () => mongoose.connection.useDb("agrinova", { useCache: true });

export const ProductService = {
  async getAdminProductsFromDB(query: Record<string, unknown>) {
    const productCollection = getMainDb().collection("products");
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status && query.status !== "") filter.status = query.status;
    if (query.category && query.category !== "") filter.category = query.category;
    if (query.search) {
      filter.title = { $regex: query.search, $options: "i" };
    }

    const data = await productCollection.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).toArray();
    const total = await productCollection.countDocuments(filter);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getAdminProductByIdFromDB(productId: string) {
    const productCollection = getMainDb().collection("products");
    if (!mongoose.Types.ObjectId.isValid(productId)) return null;
    return await productCollection.findOne({ _id: new mongoose.Types.ObjectId(productId) });
  },

  async updateProductStatusInDB(productId: string, status: "ACTIVE" | "DISABLED" | "REMOVED") {
    const productCollection = getMainDb().collection("products");
    if (!mongoose.Types.ObjectId.isValid(productId)) return null;

    const result = await productCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(productId) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result;
  }
};