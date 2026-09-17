import mongoose from "mongoose";

import {
  Farm,
} from "../../../app/modules/farm/farm.model";

const getUserModel =
  () =>
    mongoose.connection
      .useDb(
        "AgriNove-auth",
        {
          useCache:
            true,
        }
      )
      .collection(
        "user"
      );

const getMainDb =
  () =>
    mongoose.connection.useDb(
      "agrinova",
      {
        useCache:
          true,
      }
    );

export const AnalyticsService =
  {


    async getDashboardStatsFromDB() {
      const userCollection =
        getUserModel();

      const mainConn =
        getMainDb();

      const productCollection =
        mainConn.collection(
          "products"
        );

      const consultationCollection =
        mainConn.collection(
          "consultations"
        );

      const [
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
      ] =
        await Promise.all([
          userCollection.countDocuments(
            {
              role:
                "FARMER",
            }
          ),

          userCollection.countDocuments(
            {
              role:
                "EXPERT",
            }
          ),

          userCollection.countDocuments(
            {
              role:
                "EXPERT",

              status:
                "PENDING",
            }
          ),


          Farm.countDocuments(),

          productCollection
            .countDocuments(
              {
                status:
                  "ACTIVE",
              }
            )
            .catch(
              () => 0
            ),

          consultationCollection
            .countDocuments()
            .catch(
              () => 0
            ),

          userCollection
            .find({})
            .sort({
              createdAt:
                -1,
            })
            .limit(
              5
            )
            .project({
              password:
                0,
            })
            .toArray(),

          userCollection
            .find({
              role:
                "EXPERT",

              status:
                "PENDING",
            })
            .sort({
              createdAt:
                -1,
            })
            .limit(
              5
            )
            .project({
              password:
                0,
            })
            .toArray(),

          productCollection
            .find({})
            .sort({
              createdAt:
                -1,
            })
            .limit(
              5
            )
            .toArray()
            .catch(
              () => []
            ),

          consultationCollection
            .find({})
            .sort({
              createdAt:
                -1,
            })
            .limit(
              5
            )
            .toArray()
            .catch(
              () => []
            ),
        ]);

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
      const userCollection =
        getUserModel();

      const mainConn =
        getMainDb();

      const productCollection =
        mainConn.collection(
          "products"
        );

      const consultationCollection =
        mainConn.collection(
          "consultations"
        );

      const [
        farmers,

        experts,

        admins,

        totalFarms,

        activeProducts,

        disabledProducts,

        pendingConsultations,

        acceptedConsultations,

        ongoingConsultations,

        completedConsultations,

        pendingApprovals,

        approvedExperts,

        rejectedExperts,
      ] =
        await Promise.all([
          userCollection.countDocuments(
            {
              role:
                "FARMER",
            }
          ),

          userCollection.countDocuments(
            {
              role:
                "EXPERT",
            }
          ),

          userCollection.countDocuments(
            {
              role:
                "ADMIN",
            }
          ),

          /**
           * Same Farm model.
           */
          Farm.countDocuments(),

          productCollection
            .countDocuments(
              {
                status:
                  "ACTIVE",
              }
            )
            .catch(
              () => 0
            ),

          productCollection
            .countDocuments(
              {
                status:
                  "DISABLED",
              }
            )
            .catch(
              () => 0
            ),

          consultationCollection
            .countDocuments(
              {
                status:
                  "PENDING",
              }
            )
            .catch(
              () => 0
            ),

          consultationCollection
            .countDocuments(
              {
                status:
                  "ACCEPTED",
              }
            )
            .catch(
              () => 0
            ),

          consultationCollection
            .countDocuments(
              {
                status:
                  "ONGOING",
              }
            )
            .catch(
              () => 0
            ),

          consultationCollection
            .countDocuments(
              {
                status:
                  "COMPLETED",
              }
            )
            .catch(
              () => 0
            ),

          userCollection.countDocuments(
            {
              role:
                "EXPERT",

              status:
                "PENDING",
            }
          ),

          userCollection.countDocuments(
            {
              role:
                "EXPERT",

              status:
                "APPROVED",
            }
          ),

          userCollection.countDocuments(
            {
              role:
                "EXPERT",

              status:
                "REJECTED",
            }
          ),
        ]);

      return {
        users: {
          farmers,

          experts,

          admins,
        },

        farms: {
          total:
            totalFarms,
        },

        marketplace: {
          active:
            activeProducts,

          disabled:
            disabledProducts,
        },

        consultations: {
          pending:
            pendingConsultations,

          accepted:
            acceptedConsultations,

          ongoing:
            ongoingConsultations,

          completed:
            completedConsultations,
        },

        expertApprovals: {
          pending:
            pendingApprovals,

          approved:
            approvedExperts,

          rejected:
            rejectedExperts,
        },
      };
    },
  };