import mongoose from "mongoose";

const getUserModel = () => mongoose.connection.useDb("AgriNove-auth", { useCache: true }).collection("user");
const getMainDb = () => mongoose.connection.useDb("agrinova", { useCache: true });

export const AnalyticsService = {
  async getDashboardStatsFromDB() {
    const userCollection = getUserModel();
    const mainConn = getMainDb();
    const farmCollection = mainConn.collection("farms");
    const productCollection = mainConn.collection("products");
    const consultationCollection = mainConn.collection("consultations");

    const totalFarmers = await userCollection.countDocuments({ role: "FARMER" });
    const totalExperts = await userCollection.countDocuments({ role: "EXPERT" });
    const pendingExpertApprovals = await userCollection.countDocuments({ role: "EXPERT", status: "PENDING" });
    
    const totalFarms = await farmCollection.countDocuments().catch(() => 0);
    // Fix: "available" এর বদলে "ACTIVE" করা হয়েছে
    const activeListings = await productCollection.countDocuments({ status: "ACTIVE" }).catch(() => 0);
    const totalConsultations = await consultationCollection.countDocuments().catch(() => 0);

    const recentUsers = await userCollection.find({}).sort({ createdAt: -1 }).limit(5).project({ password: 0 }).toArray();
    const recentExperts = await userCollection.find({ role: "EXPERT", status: "PENDING" }).sort({ createdAt: -1 }).limit(5).project({ password: 0 }).toArray();
    const recentListings = await productCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray().catch(() => []);
    const recentConsultations = await consultationCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray().catch(() => []);

    return {
      totalFarmers,
      totalExperts,
      pendingExpertApprovals,
      totalFarms,
      activeListings,
      totalConsultations,
      recentUsers,
      recentExperts,
      recentListings,
      recentConsultations,
    };
  },

  async getAdminAnalyticsFromDB() {
    const userCollection = getUserModel();
    const mainConn = getMainDb();
    const farmCollection = mainConn.collection("farms");
    const productCollection = mainConn.collection("products");
    const consultationCollection = mainConn.collection("consultations");

    const farmers = await userCollection.countDocuments({ role: "FARMER" });
    const experts = await userCollection.countDocuments({ role: "EXPERT" });
    const admins = await userCollection.countDocuments({ role: "ADMIN" });

    const totalFarms = await farmCollection.countDocuments().catch(() => 0);
    // Fix: "available" এর বদলে "ACTIVE" করা হয়েছে
    const activeProducts = await productCollection.countDocuments({ status: "ACTIVE" }).catch(() => 0);
    const disabledProducts = await productCollection.countDocuments({ status: "DISABLED" }).catch(() => 0);

    const pendingConsultations = await consultationCollection.countDocuments({ status: "PENDING" }).catch(() => 0);
    const acceptedConsultations = await consultationCollection.countDocuments({ status: "ACCEPTED" }).catch(() => 0);
    const ongoingConsultations = await consultationCollection.countDocuments({ status: "ONGOING" }).catch(() => 0);
    const completedConsultations = await consultationCollection.countDocuments({ status: "COMPLETED" }).catch(() => 0);

    const pendingApprovals = await userCollection.countDocuments({ role: "EXPERT", status: "PENDING" });
    const approvedExperts = await userCollection.countDocuments({ role: "EXPERT", status: "APPROVED" });
    const rejectedExperts = await userCollection.countDocuments({ role: "EXPERT", status: "REJECTED" });

    return {
      users: { farmers, experts, admins },
      farms: { total: totalFarms },
      marketplace: { active: activeProducts, disabled: disabledProducts },
      consultations: {
        pending: pendingConsultations,
        accepted: acceptedConsultations,
        ongoing: ongoingConsultations,
        completed: completedConsultations,
      },
      expertApprovals: {
        pending: pendingApprovals,
        approved: approvedExperts,
        rejected: rejectedExperts,
      },
    };
  }
};