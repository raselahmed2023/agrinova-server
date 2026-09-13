import mongoose from "mongoose";

import AppError from "../../../utils/AppError";

const getUserModel = () => {
  const authConn = mongoose.connection.useDb("AgriNove-auth", { useCache: true });
  return authConn.collection("user");
};

const objectId = (value: string) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : null;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const UserService = {
  async getUsersFromDB(query: Record<string, unknown>) {
    const userCollection = getUserModel();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (typeof query.role === "string" && query.role.trim()) {
      filter.role = query.role.trim().toUpperCase();
    }

    if (typeof query.status === "string" && query.status.trim()) {
      filter.status = query.status.trim().toUpperCase();
    }

    if (typeof query.search === "string" && query.search.trim()) {
      const rx = new RegExp(escapeRegex(query.search.trim()), "i");
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const [data, total] = await Promise.all([
      userCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({ password: 0, statusBeforeBlock: 0 })
        .toArray(),
      userCollection.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  },

  async getUserByIdFromDB(userId: string) {
    const _id = objectId(userId);
    if (!_id) return null;

    return getUserModel().findOne(
      { _id },
      { projection: { password: 0, statusBeforeBlock: 0 } }
    );
  },

  async blockUserInDB(userId: string) {
    const _id = objectId(userId);
    if (!_id) return null;

    const userCollection = getUserModel();
    const user = await userCollection.findOne({ _id });

    if (!user) return null;

    if (String(user.role || "").toUpperCase() === "ADMIN") {
      throw new AppError(403, "Admin accounts cannot be blocked from this screen");
    }

    if (String(user.status || "").toUpperCase() === "BLOCKED") {
      return userCollection.findOne(
        { _id },
        { projection: { password: 0, statusBeforeBlock: 0 } }
      );
    }

    const previousStatus = String(user.status || "APPROVED").toUpperCase();

    return userCollection.findOneAndUpdate(
      { _id },
      {
        $set: {
          status: "BLOCKED",
          statusBeforeBlock: previousStatus,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        projection: { password: 0, statusBeforeBlock: 0 },
      }
    );
  },

  async unblockUserInDB(userId: string) {
    const _id = objectId(userId);
    if (!_id) return null;

    const userCollection = getUserModel();
    const user = await userCollection.findOne({ _id });

    if (!user) return null;

    if (String(user.role || "").toUpperCase() === "ADMIN") {
      throw new AppError(403, "Admin accounts cannot be changed from this screen");
    }

    const previous = String(user.statusBeforeBlock || "APPROVED").toUpperCase();
    const restoreStatus = ["ACTIVE", "APPROVED", "PENDING", "REJECTED"].includes(previous)
      ? previous
      : "APPROVED";

    return userCollection.findOneAndUpdate(
      { _id },
      {
        $set: {
          status: restoreStatus,
          updatedAt: new Date(),
        },
        $unset: {
          statusBeforeBlock: "",
        },
      },
      {
        returnDocument: "after",
        projection: { password: 0, statusBeforeBlock: 0 },
      }
    );
  },

  async getAdminProfileFromDB(adminId: string) {
    const _id = objectId(adminId);
    if (!_id) return null;

    return getUserModel().findOne(
      { _id, role: "ADMIN" },
      { projection: { password: 0, statusBeforeBlock: 0 } }
    );
  },

  async updateAdminProfileInDB(
    adminId: string,
    payload: { name?: string; phone?: string }
  ) {
    const _id = objectId(adminId);
    if (!_id) return null;

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof payload.name === "string") {
      const name = payload.name.trim();
      if (!name) throw new AppError(400, "Name cannot be empty");
      updates.name = name.slice(0, 120);
    }

    if (typeof payload.phone === "string") {
      updates.phone = payload.phone.trim().slice(0, 50);
    }

    return getUserModel().findOneAndUpdate(
      { _id, role: "ADMIN" },
      { $set: updates },
      {
        returnDocument: "after",
        projection: { password: 0, statusBeforeBlock: 0 },
      }
    );
  },
};