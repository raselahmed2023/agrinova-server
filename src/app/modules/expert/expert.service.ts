import mongoose, {
  Schema,
  type QueryFilter,
} from "mongoose";

import AppError from "../../../utils/AppError";

import type {
  IAvailabilitySlot,
  IExpertAvailability,
  IExpertDashboardData,
  IExpertProfile,
  WeekDay,
} from "./expert.interface";

import type {
  IConsultation,
} from "../consultation/consultation.interface";

import {
  Consultation,
} from "../consultation/consultation.model";

interface UserContext {
  id: string;
  email: string;
  name?: string;

  role:
    | "FARMER"
    | "EXPERT"
    | "ADMIN";
}

interface IUserDocument {
  _id:
    | string
    | mongoose.Types.ObjectId;

  name: string;

  email: string;

  image?: string;

  avatar?: string;

  phone?: string;

  role?: string;

  status?: string;

  title?: string;

  specialization?:
    | string
    | string[];

  bio?: string;

  experienceYears?: number;

  qualification?: string;

  institution?: string;

  rating?: number;

  ratingCount?: number;

  totalConsultations?: number;

  consultationFee?: number;

  languages?: string[];

  location?: string;

  isVerified?: boolean;

  availabilityStatus?:
    | "AVAILABLE"
    | "UNAVAILABLE";

  availabilitySlots?:
    IAvailabilitySlot[];

  createdAt?: Date;

  updatedAt?: Date;
}

const DEFAULT_CONSULTATION_FEE = 500;

/* ============================================================
   USER MODEL
============================================================ */

const userSchema =
  new Schema<IUserDocument>(
    {
      name: {
        type:
          String,

        required:
          true,
      },

      email: {
        type:
          String,

        required:
          true,
      },

      image: {
        type:
          String,
      },

      avatar: {
        type:
          String,
      },

      phone: {
        type:
          String,
      },

      role: {
        type:
          String,

        default:
          "FARMER",
      },

      status: {
        type:
          String,

        default:
          "APPROVED",
      },

      title: {
        type:
          String,
      },

      specialization: {
        type:
          Schema.Types.Mixed,
      },

      bio: {
        type:
          String,
      },

      experienceYears: {
        type:
          Number,

        default:
          0,
      },

      qualification: {
        type:
          String,
      },

      institution: {
        type:
          String,
      },

      rating: {
        type:
          Number,

        default:
          0,
      },

      ratingCount: {
        type:
          Number,

        default:
          0,
      },

      totalConsultations: {
        type:
          Number,

        default:
          0,
      },

      consultationFee: {
        type:
          Number,

        default:
          DEFAULT_CONSULTATION_FEE,

        validate: {
          validator: (
            value: number
          ) =>
            Number.isFinite(
              value
            ) && value > 0,

          message:
            "Consultation fee must be greater than 0",
        },
      },

      languages: {
        type: [
          String,
        ],

        default: [
          "Bengali",
          "English",
        ],
      },

      location: {
        type:
          String,
      },

      isVerified: {
        type:
          Boolean,

        default:
          false,
      },

      availabilityStatus: {
        type:
          String,

        enum: [
          "AVAILABLE",
          "UNAVAILABLE",
        ],

        default:
          "AVAILABLE",
      },

      availabilitySlots: {
        type: [
          {
            day: {
              type:
                String,

              enum: [
                "SATURDAY",
                "SUNDAY",
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
              ],

              required:
                true,
            },

            enabled: {
              type:
                Boolean,

              default:
                false,
            },

            startTime: {
              type:
                String,
            },

            endTime: {
              type:
                String,
            },
          },
        ],

        default:
          [],
      },
    },

    {
      timestamps:
        true,

      strict:
        false,

      collection:
        "user",
    }
  );

const authDb =
  mongoose.connection.useDb(
    "AgriNove-auth",
    {
      useCache:
        true,
    }
  );

export const UserModel =
  authDb.models.User ||
  authDb.model<IUserDocument>(
    "User",
    userSchema,
    "user"
  );

/* ============================================================
   DEFAULT AVAILABILITY
============================================================ */

export const defaultAvailabilitySlots:
  IAvailabilitySlot[] = [
    {
      day:
        "SATURDAY",

      enabled:
        false,

      startTime:
        "18:00",

      endTime:
        "21:00",
    },

    {
      day:
        "SUNDAY",

      enabled:
        false,

      startTime:
        "18:00",

      endTime:
        "21:00",
    },

    {
      day:
        "MONDAY",

      enabled:
        false,

      startTime:
        "18:00",

      endTime:
        "21:00",
    },

    {
      day:
        "TUESDAY",

      enabled:
        false,

      startTime:
        "17:00",

      endTime:
        "20:00",
    },

    {
      day:
        "WEDNESDAY",

      enabled:
        false,

      startTime:
        "18:00",

      endTime:
        "21:00",
    },

    {
      day:
        "THURSDAY",

      enabled:
        false,

      startTime:
        "18:00",

      endTime:
        "21:00",
    },

    {
      day:
        "FRIDAY",

      enabled:
        false,

      startTime:
        "18:00",

      endTime:
        "21:00",
    },
  ];

/* ============================================================
   HELPERS
============================================================ */

const normalizeEmail =
  (
    email:
      string
  ) =>
    email
      .toLowerCase()
      .trim();

const getUserLookup =
  (
    user:
      UserContext
  ) => {
    const or:
      Record<
        string,
        unknown
      >[] = [
        {
          email:
            normalizeEmail(
              user.email
            ),
        },
      ];

    if (
      mongoose.isValidObjectId(
        user.id
      )
    ) {
      or.unshift(
        {
          _id:
            user.id,
        }
      );
    }

    return {
      $or:
        or,
    };
  };

const getExpertAssignmentConditions =
  (
    expertUser:
      UserContext
  ): QueryFilter<IConsultation>[] => {
    const email =
      normalizeEmail(
        expertUser.email
      );

    return [
      {
        expertId:
          expertUser.id,
      },

      {
        expertEmail:
          email,
      },

      {
        "expert.id":
          expertUser.id,
      },

      {
        "expert.email":
          email,
      },
    ];
  };

const getAssignedExpertFilter =
  (
    expertUser:
      UserContext
  ): QueryFilter<IConsultation> => ({
    $or:
      getExpertAssignmentConditions(
        expertUser
      ),
  });

const getUnassignedConsultationFilter =
  (): QueryFilter<IConsultation> => ({
    $and: [
      {
        $or: [
          {
            expertId: {
              $exists:
                false,
            },
          },

          {
            expertId:
              null,
          },

          {
            expertId:
              "",
          },
        ],
      },

      {
        $or: [
          {
            expertEmail: {
              $exists:
                false,
            },
          },

          {
            expertEmail:
              null,
          },

          {
            expertEmail:
              "",
          },
        ],
      },

      {
        $or: [
          {
            "expert.id": {
              $exists:
                false,
            },
          },

          {
            "expert.id":
              null,
          },

          {
            "expert.id":
              "",
          },
        ],
      },

      {
        $or: [
          {
            "expert.email": {
              $exists:
                false,
            },
          },

          {
            "expert.email":
              null,
          },

          {
            "expert.email":
              "",
          },
        ],
      },
    ],
  });

const getPendingVisibleToExpertFilter =
  (
    expertUser:
      UserContext
  ): QueryFilter<IConsultation> => ({
    $and: [
      {
        status:
          "PENDING",
      },

      {
        $or: [
          ...getExpertAssignmentConditions(
            expertUser
          ),

          getUnassignedConsultationFilter(),
        ],
      },
    ],
  });

const normalizeConsultationFee =
  (
    value:
      unknown
  ): number =>
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value > 0
      ? value
      : DEFAULT_CONSULTATION_FEE;

const normalizeSpecialization =
  (
    value:
      unknown
  ): string[] => {
    if (
      Array.isArray(
        value
      )
    ) {
      return value
        .filter(
          (
            item
          ): item is string =>
            typeof item ===
            "string"
        )
        .map(
          (
            item
          ) =>
            item.trim()
        )
        .filter(
          Boolean
        );
    }

    if (
      typeof value ===
      "string"
    ) {
      return value
        .split(
          ","
        )
        .map(
          (
            item
          ) =>
            item.trim()
        )
        .filter(
          Boolean
        );
    }

    return [];
  };

const mapExpertProfile =
  (
    userDoc:
      IUserDocument,

    fallbackName =
      "Specialist"
  ):
    IExpertProfile => {
    const id =
      String(
        userDoc._id
      );

    const specialization =
      normalizeSpecialization(
        userDoc.specialization
      );

    return {
      id,

      _id:
        id,

      name:
        userDoc.name ||
        fallbackName,

      email:
        userDoc.email,

      phone:
        userDoc.phone ||
        "",

      avatar:
        userDoc.avatar ||
        userDoc.image ||
        "/images/default-avatar.png",

      title:
        userDoc.title ||
        "Agricultural Expert",

      specialization,

      bio:
        userDoc.bio ||
        "",

      experienceYears:
        typeof userDoc.experienceYears ===
        "number"
          ? userDoc.experienceYears
          : 0,

      qualification:
        userDoc.qualification ||
        "",

      institution:
        userDoc.institution ||
        "",

      rating:
        typeof userDoc.rating ===
        "number"
          ? userDoc.rating
          : 0,

      ratingCount:
        typeof userDoc.ratingCount ===
        "number"
          ? userDoc.ratingCount
          : 0,

      totalConsultations:
        typeof userDoc.totalConsultations ===
        "number"
          ? userDoc.totalConsultations
          : 0,

      consultationFee:
        normalizeConsultationFee(
          userDoc.consultationFee
        ),

      languages:
        Array.isArray(
          userDoc.languages
        ) &&
        userDoc.languages.length >
          0
          ? userDoc.languages
          : [
              "Bengali",
              "English",
            ],

      location:
        userDoc.location ||
        "",

      isVerified:
        userDoc.isVerified ===
        true,
    };
  };

/* ============================================================
   EXPERT DASHBOARD
============================================================ */

const getExpertDashboardFromDB =
  async (
    expertUser:
      UserContext
  ):
    Promise<IExpertDashboardData> => {
    const assignedFilter =
      getAssignedExpertFilter(
        expertUser
      );

    const pendingFilter =
      getPendingVisibleToExpertFilter(
        expertUser
      );

    const [
      newRequests,
      accepted,
      scheduled,
      ongoing,
      completed,
      recentRequests,
      upcomingConsultations,
      ongoingConsultations,
      userDoc,
    ] =
      await Promise.all([
        Consultation.countDocuments(
          pendingFilter
        ),

        Consultation.countDocuments(
          {
            $and: [
              {
                status:
                  "ACCEPTED",
              },

              assignedFilter,
            ],
          }
        ),

        Consultation.countDocuments(
          {
            $and: [
              {
                status:
                  "SCHEDULED",
              },

              assignedFilter,
            ],
          }
        ),

        Consultation.countDocuments(
          {
            $and: [
              {
                status:
                  "ONGOING",
              },

              assignedFilter,
            ],
          }
        ),

        Consultation.countDocuments(
          {
            $and: [
              {
                status:
                  "COMPLETED",
              },

              assignedFilter,
            ],
          }
        ),

        Consultation.find(
          pendingFilter
        )
          .sort(
            {
              createdAt:
                -1,
            }
          )
          .limit(
            10
          ),

        Consultation.find(
          {
            $and: [
              {
                status:
                  "SCHEDULED",
              },

              assignedFilter,
            ],
          }
        )
          .sort(
            {
              scheduledAt:
                1,

              scheduledDate:
                1,

              createdAt:
                -1,
            }
          )
          .limit(
            10
          ),

        Consultation.find(
          {
            $and: [
              {
                status:
                  "ONGOING",
              },

              assignedFilter,
            ],
          }
        )
          .sort(
            {
              updatedAt:
                -1,
            }
          )
          .limit(
            5
          ),

        UserModel.findOne(
          getUserLookup(
            expertUser
          )
        ),
      ]);

    const availabilityStatus =
      userDoc
        ?.availabilityStatus ===
      "UNAVAILABLE"
        ? "UNAVAILABLE"
        : "AVAILABLE";

    return {
      newRequests,

      accepted,

      scheduled,

      ongoing,

      completed,

      recentRequests,

      upcomingConsultations,

      ongoingConsultations,

      availabilityStatus,
    };
  };

/* ============================================================
   EXPERT PROFILE
============================================================ */

const getExpertProfileFromDB =
  async (
    expertUser:
      UserContext
  ):
    Promise<IExpertProfile> => {
    const userDoc =
      await UserModel.findOne(
        getUserLookup(
          expertUser
        )
      );

    if (
      !userDoc
    ) {
      return {
        id:
          expertUser.id,

        _id:
          expertUser.id,

        name:
          expertUser.name ||
          "Specialist",

        email:
          normalizeEmail(
            expertUser.email
          ),

        phone:
          "",

        avatar:
          "/images/default-avatar.png",

        title:
          "Agricultural Expert",

        specialization:
          [],

        bio:
          "",

        experienceYears:
          0,

        qualification:
          "",

        institution:
          "",

        rating:
          0,

        ratingCount:
          0,

        totalConsultations:
          0,

        consultationFee:
          DEFAULT_CONSULTATION_FEE,

        languages: [
          "Bengali",
          "English",
        ],

        location:
          "",

        isVerified:
          false,
      };
    }

    return mapExpertProfile(
      userDoc,

      expertUser.name ||
        "Specialist"
    );
  };

/* ============================================================
   UPDATE PROFILE
============================================================ */

const updateExpertProfileInDB =
  async (
    expertUser:
      UserContext,

    payload:
      Partial<IExpertProfile>
  ):
    Promise<IExpertProfile> => {
    const updateData:
      Record<
        string,
        unknown
      > = {
        ...payload,
      };

    delete updateData.email;
    delete updateData.role;
    delete updateData.status;
    delete updateData._id;
    delete updateData.id;

    if (
      payload.avatar !==
      undefined
    ) {
      updateData.image =
        payload.avatar;

      updateData.avatar =
        payload.avatar;
    }

    if (
      (payload as any)
        .image !==
      undefined
    ) {
      const image =
        (payload as any)
          .image;

      updateData.image =
        image;

      updateData.avatar =
        image;
    }

    if (
      (payload as any)
        .profileImage !==
      undefined
    ) {
      const profileImage =
        (payload as any)
          .profileImage;

      updateData.image =
        profileImage;

      updateData.avatar =
        profileImage;
    }

    const updated =
      await UserModel.findOneAndUpdate(
        getUserLookup(
          expertUser
        ),

        {
          $set:
            updateData,
        },

        {
          new:
            true,

          runValidators:
            true,
        }
      );

    if (
      !updated
    ) {
      throw new AppError(
        404,
        "Expert account not found"
      );
    }

    return mapExpertProfile(
      updated,

      expertUser.name ||
        "Specialist"
    );
  };

/* ============================================================
   GET AVAILABILITY
============================================================ */

const getExpertAvailabilityFromDB =
  async (
    expertUser:
      UserContext
  ):
    Promise<IExpertAvailability> => {
    const userDoc =
      await UserModel.findOne(
        getUserLookup(
          expertUser
        )
      );

    const slots =
      userDoc
        ?.availabilitySlots &&
      Array.isArray(
        userDoc.availabilitySlots
      ) &&
      userDoc
        .availabilitySlots
        .length >
        0
        ? userDoc.availabilitySlots
        : defaultAvailabilitySlots;

    return {
      expertId:
        expertUser.id,

      availabilityStatus:
        userDoc
          ?.availabilityStatus ===
        "UNAVAILABLE"
          ? "UNAVAILABLE"
          : "AVAILABLE",

      availabilitySlots:
        slots as IAvailabilitySlot[],
    };
  };

/* ============================================================
   UPDATE AVAILABILITY
============================================================ */

const updateExpertAvailabilityInDB =
  async (
    expertUser:
      UserContext,

    payload: {
      availabilityStatus:
        | "AVAILABLE"
        | "UNAVAILABLE";

      availabilitySlots:
        IAvailabilitySlot[];
    }
  ):
    Promise<IExpertAvailability> => {
    const {
      availabilityStatus,
      availabilitySlots,
    } =
      payload;

    if (
      ![
        "AVAILABLE",
        "UNAVAILABLE",
      ].includes(
        availabilityStatus
      )
    ) {
      throw new AppError(
        400,
        "Invalid availability status"
      );
    }

    if (
      !Array.isArray(
        availabilitySlots
      )
    ) {
      throw new AppError(
        400,
        "availabilitySlots must be an array"
      );
    }

    const validDays =
      new Set<WeekDay>(
        [
          "SATURDAY",
          "SUNDAY",
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
        ]
      );

    const seenDays =
      new Set<WeekDay>();

    for (
      const slot of
      availabilitySlots
    ) {
      if (
        !validDays.has(
          slot.day
        )
      ) {
        throw new AppError(
          400,

          `Invalid weekday '${slot.day}'`
        );
      }

      if (
        seenDays.has(
          slot.day
        )
      ) {
        throw new AppError(
          400,

          `Duplicate weekday '${slot.day}' is not allowed in availability slots.`
        );
      }

      seenDays.add(
        slot.day
      );

      if (
        slot.enabled
      ) {
        if (
          !slot.startTime ||
          !slot.endTime
        ) {
          throw new AppError(
            400,

            `startTime and endTime are required for enabled day '${slot.day}'.`
          );
        }

        if (
          slot.startTime >=
          slot.endTime
        ) {
          throw new AppError(
            400,

            `startTime (${slot.startTime}) must be earlier than endTime (${slot.endTime}) for '${slot.day}'.`
          );
        }
      }
    }

    const updated =
      await UserModel.findOneAndUpdate(
        getUserLookup(
          expertUser
        ),

        {
          $set: {
            availabilityStatus,

            availabilitySlots,
          },
        },

        {
          new:
            true,

          runValidators:
            true,
        }
      );

    if (
      !updated
    ) {
      throw new AppError(
        404,
        "Expert account not found"
      );
    }

    return {
      expertId:
        expertUser.id,

      availabilityStatus:
        updated
          .availabilityStatus ===
        "UNAVAILABLE"
          ? "UNAVAILABLE"
          : "AVAILABLE",

      availabilitySlots:
        updated
          .availabilitySlots &&
        updated
          .availabilitySlots
          .length >
          0
          ? updated.availabilitySlots
          : defaultAvailabilitySlots,
    };
  };

/* ============================================================
   PUBLIC APPROVED EXPERTS

   IMPORTANT:
   No mock/fake experts are returned.
============================================================ */

const getAllExpertsFromDB =
  async () => {
    /*
     * Public specialist directory.
     * Return only approved Experts and explicitly whitelist public fields.
     * Do not spread the raw auth user document into a public response.
     */
    const dbExperts =
      await UserModel.find(
        {
          role:
            "EXPERT",

          status:
            "APPROVED",
        }
      )
        .select(
          [
            "_id",
            "name",
            "image",
            "avatar",
            "title",
            "specialization",
            "bio",
            "experienceYears",
            "qualification",
            "institution",
            "rating",
            "ratingCount",
            "totalConsultations",
            "consultationFee",
            "languages",
            "location",
            "isVerified",
            "availabilityStatus",
            "availabilitySlots",
          ].join(" ")
        )
        .sort(
          {
            createdAt:
              -1,
          }
        )
        .lean();

    return dbExperts.map(
      (
        expert:
          any
      ) => {
        const id =
          String(
            expert._id ||
              ""
          );

        const specialization =
          normalizeSpecialization(
            expert.specialization
          );

        const availabilitySlots =
          Array.isArray(
            expert.availabilitySlots
          )
            ? expert.availabilitySlots
            : [];

        return {
          _id:
            id,

          id,

          name:
            expert.name ||
            "Registered Specialist",

          avatar:
            expert.avatar ||
            expert.image ||
            "/images/default-avatar.png",

          image:
            expert.image ||
            expert.avatar ||
            "/images/default-avatar.png",

          title:
            expert.title ||
            "Agricultural Expert",

          specialization,

          bio:
            expert.bio ||
            "",

          experienceYears:
            typeof expert.experienceYears ===
            "number"
              ? expert.experienceYears
              : 0,

          qualification:
            expert.qualification ||
            "",

          institution:
            expert.institution ||
            "",

          rating:
            typeof expert.rating ===
            "number"
              ? expert.rating
              : 0,

          ratingCount:
            typeof expert.ratingCount ===
            "number"
              ? expert.ratingCount
              : 0,

          totalConsultations:
            typeof expert.totalConsultations ===
            "number"
              ? expert.totalConsultations
              : 0,

          consultationFee:
            normalizeConsultationFee(
              expert.consultationFee
            ),

          languages:
            Array.isArray(
              expert.languages
            )
              ? expert.languages
              : [],

          location:
            expert.location ||
            "",

          isVerified:
            expert.isVerified ===
            true,

          availabilityStatus:
            expert.availabilityStatus ===
            "UNAVAILABLE"
              ? "UNAVAILABLE"
              : "AVAILABLE",

          /*
           * No fake fallback schedule here.
           * If the Expert has not configured availability, the client should
           * display that truth instead of inventing evening/weekend slots.
           */
          availabilitySlots,
        };
      }
    );
  };

/* ============================================================
   EXPORT
============================================================ */

export const ExpertServices =
  {
    getExpertDashboardFromDB,

    getExpertProfileFromDB,

    updateExpertProfileInDB,

    getExpertAvailabilityFromDB,

    updateExpertAvailabilityInDB,

    getAllExpertsFromDB,
  };