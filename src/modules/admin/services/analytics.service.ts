import mongoose from "mongoose";

import {
  Farm,
} from "../../../app/modules/farm/farm.model";

import {
  Consultation,
} from "../../../app/modules/consultation/consultation.model";

import {
  Product,
} from "../../product/product.model";

const getUserCollection =
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

export const AnalyticsService =
  {
    async getDashboardStatsFromDB() {
      const userCollection =
        getUserCollection();

      const [
        totalFarmers,

        totalExperts,

        pendingExpertApprovals,

        totalFarms,

        activeListings,

        totalConsultations,

        recentUsers,
      ] =
        await Promise.all(
          [
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

           
            Product.countDocuments(
              {
                status:
                  "available",

                isDeleted: {
                  $ne:
                    true,
                },
              }
            ),

            Consultation.countDocuments(),

            
            userCollection
              .find({})
              .sort({
                createdAt:
                  -1,
              })
              .limit(5)
              .project({
                _id: 1,

                name: 1,

                email: 1,

                role: 1,

                status: 1,

                createdAt:
                  1,
              })
              .toArray(),
          ]
        );

      return {
        totalFarmers,

        totalExperts,

        pendingExpertApprovals,

        totalFarms,

        activeListings,

        totalConsultations,

        recentUsers,
      };
    },

    async getAdminAnalyticsFromDB() {
      const userCollection =
        getUserCollection();

      const [
        farmers,

        experts,

        admins,

        totalFarms,

        activeFarms,

        inactiveFarms,

        activeProducts,

        pendingProducts,

        outOfStockProducts,

        disabledProducts,

        removedProducts,

        pendingConsultations,

        acceptedConsultations,

        scheduledConsultations,

        ongoingConsultations,

        completedConsultations,

        rejectedConsultations,

        cancelledConsultations,

        pendingExpertApprovals,

        approvedExperts,

        rejectedExperts,

        blockedExperts,
      ] =
        await Promise.all(
          [
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

            Farm.countDocuments(),

            Farm.countDocuments(
              {
                status:
                  "Active",
              }
            ),

            Farm.countDocuments(
              {
                status:
                  "Inactive",
              }
            ),

            
            Product.countDocuments(
              {
                status:
                  "available",

                isDeleted: {
                  $ne:
                    true,
                },
              }
            ),

           
            Product.countDocuments(
              {
                status:
                  "pending",

                isDeleted: {
                  $ne:
                    true,
                },
              }
            ),

            Product.countDocuments(
              {
                status:
                  "out_of_stock",

                isDeleted: {
                  $ne:
                    true,
                },
              }
            ),

            Product.countDocuments(
              {
                status:
                  "disabled",

                isDeleted: {
                  $ne:
                    true,
                },
              }
            ),

            Product.countDocuments(
              {
                isDeleted:
                  true,
              }
            ),

            Consultation.countDocuments(
              {
                status:
                  "PENDING",
              }
            ),

            Consultation.countDocuments(
              {
                status:
                  "ACCEPTED",
              }
            ),

            Consultation.countDocuments(
              {
                status:
                  "SCHEDULED",
              }
            ),

            Consultation.countDocuments(
              {
                status:
                  "ONGOING",
              }
            ),

            Consultation.countDocuments(
              {
                status:
                  "COMPLETED",
              }
            ),

            Consultation.countDocuments(
              {
                status:
                  "REJECTED",
              }
            ),

            Consultation.countDocuments(
              {
                status:
                  "CANCELLED",
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

            userCollection.countDocuments(
              {
                role:
                  "EXPERT",

                status:
                  "BLOCKED",
              }
            ),
          ]
        );

      return {
        users: {
          farmers,

          experts,

          admins,
        },

        farms: {
          total:
            totalFarms,

          active:
            activeFarms,

          inactive:
            inactiveFarms,
        },

        marketplace: {
          active:
            activeProducts,

          pending:
            pendingProducts,

          outOfStock:
            outOfStockProducts,

          disabled:
            disabledProducts,

          removed:
            removedProducts,
        },

        consultations: {
          pending:
            pendingConsultations,

          accepted:
            acceptedConsultations,

          scheduled:
            scheduledConsultations,

          ongoing:
            ongoingConsultations,

          completed:
            completedConsultations,

          rejected:
            rejectedConsultations,

          cancelled:
            cancelledConsultations,
        },

        expertApprovals: {
          pending:
            pendingExpertApprovals,

          approved:
            approvedExperts,

          rejected:
            rejectedExperts,

          blocked:
            blockedExperts,
        },
      };
    },
  };