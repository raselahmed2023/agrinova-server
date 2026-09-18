
import AppError from "../../../utils/AppError";
import type {
  IConsultation,
  TConsultationStatus,
  TConsultationUrgency,
} from "./consultation.interface";
import { Consultation } from "./consultation.model";
import {
  UserModel,
  defaultAvailabilitySlots,
} from "../expert/expert.service";
import type {
  WeekDay,
  IAvailabilitySlot,
} from "../expert/expert.interface";

import {
  isValidObjectId,
  type QueryFilter,
} from "mongoose";

/* ============================================================
   CONSTANTS
============================================================ */

const EARLY_JOIN_MINUTES = 15;
const CONSULTATION_DURATION_MINUTES = 30;
const LATE_JOIN_GRACE_MINUTES = 30;

/* ============================================================
   TYPES
============================================================ */

interface UserContext {
  id: string;
  email: string;
  name?: string;
  role: "FARMER" | "EXPERT" | "ADMIN";
}

interface CreateConsultationPayload {
  cropType: string;
  cropName?: string;
  problemTitle: string;
  problemDescription: string;

  farmId?: string;
  farmName?: string;
  district?: string;

  images?: string[];

  urgency?: TConsultationUrgency;

  preferredDate?: string;
  preferredTime?: string;

  expertId?: string;
  expertName?: string;
  expertEmail?: string;

  scheduledDate?: string;
  scheduledTime?: string;

  meetingLink?: string;
  notes?: string;
}

interface ScheduleConsultationPayload {
  scheduledAt?: string | Date;
  scheduledDate?: string;
  scheduledTime?: string;
  meetingLink?: string;
  notes?: string;
}

interface RecommendationPayload {
  diagnosis?: string;
  recommendation?: string;
  prescriptions?: string[];
  treatmentSteps?: string[];
  followUpDate?: string;
  additionalNotes?: string;
}

/* ============================================================
   WEEKDAY MAP
============================================================ */

const weekDayMap: WeekDay[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/* ============================================================
   BASIC HELPERS
============================================================ */

const normalizeEmail = (email?: string) => {
  return (email || "").toLowerCase().trim();
};

/* ============================================================
   FARMER FILTER HELPERS
============================================================ */

const getFarmerConditions = (
  user: UserContext
): QueryFilter<IConsultation>[] => {
  const email = normalizeEmail(
    user.email
  );

  return [
    {
      farmerId: user.id,
    },
    {
      farmerEmail: email,
    },
    {
      "farmer.id": user.id,
    },
    {
      "farmer.email": email,
    },
  ];
};

/* ============================================================
   EXPERT FILTER HELPERS
============================================================ */

const getExpertAssignmentConditions = (
  expertUser: UserContext
): QueryFilter<IConsultation>[] => {
  const email = normalizeEmail(
    expertUser.email
  );

  return [
    {
      expertId: expertUser.id,
    },
    {
      expertEmail: email,
    },
    {
      "expert.id": expertUser.id,
    },
    {
      "expert.email": email,
    },
  ];
};

/**
 * New Stripe consultations are visible to Experts only after payment.
 * Existing legacy consultations (created before paymentStatus existed)
 * remain visible so historical data is not hidden.
 */
const getPaidOrLegacyConsultationFilter =
  (): QueryFilter<IConsultation> => {
    return {
      $or: [
        {
          paymentStatus: "PAID",
        },
        {
          paymentStatus: {
            $exists: false,
          },
        },
      ],
    };
  };

const getAssignedExpertFilter = (
  expertUser: UserContext
): QueryFilter<IConsultation> => {
  return {
    $and: [
      {
        $or:
          getExpertAssignmentConditions(
            expertUser
          ),
      },

      getPaidOrLegacyConsultationFilter(),
    ],
  };
};

/**
 * A consultation is considered unassigned only when
 * no expert id/email exists in either the top-level
 * fields or the nested expert object.
 */
const getUnassignedExpertFilter =
  (): QueryFilter<IConsultation> => {
    return {
      $and: [
        {
          $or: [
            {
              expertId: {
                $exists: false,
              },
            },
            {
              expertId: null,
            },
            {
              expertId: "",
            },
          ],
        },

        {
          $or: [
            {
              expertEmail: {
                $exists: false,
              },
            },
            {
              expertEmail: null,
            },
            {
              expertEmail: "",
            },
          ],
        },

        {
          $or: [
            {
              "expert.id": {
                $exists: false,
              },
            },
            {
              "expert.id": null,
            },
            {
              "expert.id": "",
            },
          ],
        },

        {
          $or: [
            {
              "expert.email": {
                $exists: false,
              },
            },
            {
              "expert.email": null,
            },
            {
              "expert.email": "",
            },
          ],
        },
      ],
    };
  };

/**
 * Expert can see:
 *
 * 1. PENDING consultation assigned to them
 * 2. PENDING consultation which currently has no expert
 *
 * They cannot see PENDING requests explicitly assigned
 * to a different expert.
 */
const getPendingVisibleToExpertFilter = (
  expertUser: UserContext
): QueryFilter<IConsultation> => {
  return {
    $and: [
      {
        status: "PENDING",
      },

      getPaidOrLegacyConsultationFilter(),

      {
        $or: [
          ...getExpertAssignmentConditions(
            expertUser
          ),

          getUnassignedExpertFilter(),
        ],
      },
    ],
  };
};

/**
 * ALL consultation data visible to an Expert:
 *
 * - Anything assigned to that Expert
 * - Unassigned PENDING requests
 */
const getAllVisibleToExpertFilter = (
  expertUser: UserContext
): QueryFilter<IConsultation> => {
  return {
    $or: [
      getAssignedExpertFilter(
        expertUser
      ),

      getPendingVisibleToExpertFilter(
        expertUser
      ),
    ],
  };
};

/* ============================================================
   OWNERSHIP HELPERS
============================================================ */

const isFarmerOwner = (
  consultation: IConsultation,
  user: UserContext
) => {
  const email = normalizeEmail(
    user.email
  );

  return Boolean(
    consultation.farmerId ===
      user.id ||

      normalizeEmail(
        consultation.farmerEmail
      ) === email ||

      consultation.farmer?.id ===
        user.id ||

      normalizeEmail(
        consultation.farmer?.email
      ) === email
  );
};

const isAssignedExpert = (
  consultation: IConsultation,
  user: UserContext
) => {
  const email = normalizeEmail(
    user.email
  );

  return Boolean(
    consultation.expertId ===
      user.id ||

      normalizeEmail(
        consultation.expertEmail
      ) === email ||

      consultation.expert?.id ===
        user.id ||

      normalizeEmail(
        consultation.expert?.email
      ) === email
  );
};

const isUnassignedConsultation = (
  consultation: IConsultation
) => {
  return Boolean(
    !consultation.expertId &&
      !consultation.expertEmail &&
      !consultation.expert?.id &&
      !consultation.expert?.email
  );
};

const canExpertViewConsultation = (
  consultation: IConsultation,
  expertUser: UserContext
) => {
  // Stripe-backed consultations are private from Experts until paid.
  // Legacy records have no paymentStatus and remain accessible.
  if (
    consultation.paymentStatus &&
    consultation.paymentStatus !== "PAID"
  ) {
    return false;
  }

  if (
    isAssignedExpert(
      consultation,
      expertUser
    )
  ) {
    return true;
  }

  return Boolean(
    consultation.status ===
      "PENDING" &&
      isUnassignedConsultation(
        consultation
      )
  );
};

/* ============================================================
   FIND CONSULTATION
============================================================ */

const findConsultationById = async (
  consultationId: string
) => {
  if (
    !consultationId?.trim()
  ) {
    return null;
  }

  if (
    isValidObjectId(
      consultationId
    )
  ) {
    return Consultation.findById(
      consultationId
    );
  }

  /**
   * Legacy support.
   * Some old records may contain their own id field.
   */
  return Consultation.findOne({
    id: consultationId,
  });
};

/* ============================================================
   DATE HELPERS
============================================================ */

/**
 * Convert either 24-hour time (18:00) or the 12-hour format used by
 * ConsultantBookingModal (06:00 PM) into HH:mm.
 */
const normalizeConsultationTime = (
  time?: string
) => {
  if (!time) {
    return null;
  }

  const value =
    time.trim();

  const twentyFourHour =
    value.match(
      /^([01]?\d|2[0-3]):([0-5]\d)$/
    );

  if (twentyFourHour) {
    const hour =
      String(
        Number(
          twentyFourHour[1]
        )
      ).padStart(
        2,
        "0"
      );

    return `${hour}:${twentyFourHour[2]}`;
  }

  const twelveHour =
    value.match(
      /^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i
    );

  if (!twelveHour) {
    return null;
  }

  let hour =
    Number(
      twelveHour[1]
    );

  const minute =
    twelveHour[2];

  const period =
    twelveHour[3].toUpperCase();

  if (
    hour < 1 ||
    hour > 12
  ) {
    return null;
  }

  if (period === "AM") {
    if (hour === 12) {
      hour = 0;
    }
  } else if (hour !== 12) {
    hour += 12;
  }

  return `${String(hour).padStart(
    2,
    "0"
  )}:${minute}`;
};

const createScheduledAt = (
  scheduledAt?: string | Date,
  scheduledDate?: string,
  scheduledTime?: string
) => {
  if (scheduledAt) {
    const parsed =
      new Date(
        scheduledAt
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return parsed;
  }

  if (
    scheduledDate &&
    scheduledTime
  ) {
    const normalizedTime =
      normalizeConsultationTime(
        scheduledTime
      );

    if (!normalizedTime) {
      return null;
    }

    const parsed =
      new Date(
        `${scheduledDate}T${normalizedTime}:00`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return parsed;
  }

  if (scheduledDate) {
    const parsed =
      new Date(
        `${scheduledDate}T00:00:00`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return parsed;
  }

  return null;
};

const toDateInputValue = (
  date: Date
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (
  date: Date
) => {
  const hours =
    String(
      date.getHours()
    ).padStart(
      2,
      "0"
    );

  const minutes =
    String(
      date.getMinutes()
    ).padStart(
      2,
      "0"
    );

  return `${hours}:${minutes}`;
};

/* ============================================================
   EXPERT LOOKUP
============================================================ */

const getExpertLookup = (
  consultation: IConsultation,
  fallbackUser?: UserContext
) => {
  const expertId =
    consultation.expertId ||
    consultation.expert?.id ||
    fallbackUser?.id;

  const expertEmail =
    normalizeEmail(
      consultation.expertEmail ||
        consultation.expert
          ?.email ||
        fallbackUser?.email
    );

  const conditions:
    Record<
      string,
      unknown
    >[] = [];

  if (
    expertId &&
    isValidObjectId(
      expertId
    )
  ) {
    conditions.push({
      _id: expertId,
    });
  }

  if (expertEmail) {
    conditions.push({
      email:
        expertEmail,
    });
  }

  if (
    conditions.length ===
    0
  ) {
    return null;
  }

  return {
    $or: conditions,
  };
};

const getConsultationExpertConditions =
  (
    consultation: IConsultation,
    fallbackUser?: UserContext
  ) => {
    const expertId =
      consultation.expertId ||
      consultation.expert?.id ||
      fallbackUser?.id;

    const expertEmail =
      normalizeEmail(
        consultation.expertEmail ||
          consultation.expert
            ?.email ||
          fallbackUser?.email
      );

    const conditions:
      Record<
        string,
        unknown
      >[] = [];

    if (expertId) {
      conditions.push(
        {
          expertId,
        },
        {
          "expert.id":
            expertId,
        }
      );
    }

    if (expertEmail) {
      conditions.push(
        {
          expertEmail,
        },
        {
          "expert.email":
            expertEmail,
        }
      );
    }

    return conditions;
  };

/* ============================================================
   EXPERT ACTION AUTHORIZATION
============================================================ */

const assertExpertCanAct = (
  consultation: IConsultation,
  user: UserContext,
  options?: {
    allowUnassignedPending?: boolean;
  }
) => {
  if (
    user.role === "ADMIN"
  ) {
    return;
  }

  if (
    user.role !== "EXPERT"
  ) {
    throw new AppError(
      403,
      "Expert access is required for this action."
    );
  }

  if (
    consultation.paymentStatus &&
    consultation.paymentStatus !== "PAID"
  ) {
    throw new AppError(
      409,
      "This consultation is not available to the expert until payment is completed."
    );
  }

  if (
    isAssignedExpert(
      consultation,
      user
    )
  ) {
    return;
  }

  if (
    options
      ?.allowUnassignedPending &&
    consultation.status ===
      "PENDING" &&
    isUnassignedConsultation(
      consultation
    )
  ) {
    return;
  }

  throw new AppError(
    403,
    "You are not assigned to this consultation."
  );
};

/* ============================================================
   ASSIGN CONSULTATION TO EXPERT
============================================================ */

const assignConsultationToExpert =
  async (
    consultation: any,
    expertUser: UserContext
  ) => {
    const email =
      normalizeEmail(
        expertUser.email
      );

    let expertDoc:
      any = null;

    try {
      const lookupConditions:
        Record<
          string,
          unknown
        >[] = [];

      if (
        isValidObjectId(
          expertUser.id
        )
      ) {
        lookupConditions.push({
          _id:
            expertUser.id,
        });
      }

      if (email) {
        lookupConditions.push({
          email,
        });
      }

      if (
        lookupConditions.length >
        0
      ) {
        expertDoc =
          await UserModel.findOne(
            {
              $or:
                lookupConditions,
            }
          );
      }
    } catch {
      expertDoc =
        null;
    }

    consultation.expertId =
      expertUser.id;

    consultation.expertName =
      expertDoc?.name ||
      expertUser.name ||
      "AgriNova Specialist";

    consultation.expertEmail =
      normalizeEmail(
        expertDoc?.email ||
          expertUser.email
      );

    consultation.expert = {
      id:
        expertUser.id,

      name:
        expertDoc?.name ||
        expertUser.name ||
        "AgriNova Specialist",

      email:
        normalizeEmail(
          expertDoc?.email ||
            expertUser.email
        ),

      title:
        expertDoc?.title ||
        "Agricultural Specialist",

      avatar:
        expertDoc?.avatar ||
        expertDoc?.image,

      phone:
        expertDoc?.phone,
    };
  };

/* ============================================================
   CREATE CONSULTATION
============================================================ */

const createConsultationIntoDB =
  async (
    user: UserContext,
    payload:
      CreateConsultationPayload
  ) => {
    const farmerEmail =
      normalizeEmail(
        user.email
      );

    const expertId =
      payload.expertId
        ?.trim() ||
      undefined;

    const expertEmail =
      payload.expertEmail
        ? normalizeEmail(
            payload.expertEmail
          )
        : undefined;

    /* --------------------------------------------------------
       Prevent multiple active requests to same Expert
    -------------------------------------------------------- */

    if (
      expertId ||
      expertEmail
    ) {
      const expertConditions:
        Record<
          string,
          unknown
        >[] = [];

      if (expertId) {
        expertConditions.push(
          {
            expertId,
          },
          {
            "expert.id":
              expertId,
          }
        );
      }

      if (expertEmail) {
        expertConditions.push(
          {
            expertEmail,
          },
          {
            "expert.email":
              expertEmail,
          }
        );
      }

      const existingActiveWithExpert =
        await Consultation.findOne(
          {
            $and: [
              {
                $or:
                  getFarmerConditions(
                    user
                  ),
              },

              {
                $or:
                  expertConditions,
              },

              {
                status: {
                  $in: [
                    "PENDING",
                    "ACCEPTED",
                    "SCHEDULED",
                    "ONGOING",
                  ],
                },
              },

              getPaidOrLegacyConsultationFilter(),
            ],
          }
        );

      if (
        existingActiveWithExpert
      ) {
        throw new AppError(
          400,
          `You already have an active consultation (${existingActiveWithExpert.status.toLowerCase()}) with specialist ${
            existingActiveWithExpert.expertName ||
            "this specialist"
          }. A farmer can schedule only one request to the same expert at a time.`
        );
      }
    }

    /* --------------------------------------------------------
       Farmer time conflict
    -------------------------------------------------------- */

    if (
      payload.scheduledDate &&
      payload.scheduledTime
    ) {
      const farmerTimeConflict =
        await Consultation.findOne(
          {
            $and: [
              {
                $or:
                  getFarmerConditions(
                    user
                  ),
              },

              {
                scheduledDate:
                  payload.scheduledDate,
              },

              {
                scheduledTime:
                  payload.scheduledTime,
              },

              {
                status: {
                  $in: [
                    "ACCEPTED",
                    "SCHEDULED",
                    "ONGOING",
                  ],
                },
              },

              getPaidOrLegacyConsultationFilter(),
            ],
          }
        );

      if (
        farmerTimeConflict
      ) {
        throw new AppError(
          400,
          `Time conflict: You already have another consultation booked on ${payload.scheduledDate} at ${payload.scheduledTime} with ${
            farmerTimeConflict.expertName ||
            "another specialist"
          }. Please choose a different time slot.`
        );
      }

      /* ------------------------------------------------------
         Expert time conflict
      ------------------------------------------------------ */

      if (
        expertId ||
        expertEmail
      ) {
        const expertConditions:
          Record<
            string,
            unknown
          >[] = [];

        if (expertId) {
          expertConditions.push(
            {
              expertId,
            },
            {
              "expert.id":
                expertId,
            }
          );
        }

        if (expertEmail) {
          expertConditions.push(
            {
              expertEmail,
            },
            {
              "expert.email":
                expertEmail,
            }
          );
        }

        const expertTimeConflict =
          await Consultation.findOne(
            {
              $and: [
                {
                  $or:
                    expertConditions,
                },

                {
                  scheduledDate:
                    payload.scheduledDate,
                },

                {
                  scheduledTime:
                    payload.scheduledTime,
                },

                {
                  status: {
                    $in: [
                      "ACCEPTED",
                      "SCHEDULED",
                      "ONGOING",
                    ],
                  },
                },

                getPaidOrLegacyConsultationFilter(),
              ],
            }
          );

        if (
          expertTimeConflict
        ) {
          throw new AppError(
            400,
            `Time slot unavailable: This specialist already has a consultation booked on ${payload.scheduledDate} at ${payload.scheduledTime}. Please choose another available time slot.`
          );
        }
      }
    }

    /* --------------------------------------------------------
       Fetch real Expert data
    -------------------------------------------------------- */

    let expertDetails:
      | {
          id: string;
          name: string;
          email: string;
          title: string;
          avatar?: string;
          phone?: string;
          consultationFee: number;
        }
      | undefined;

    if (
      expertId ||
      expertEmail
    ) {
      try {
        const lookupConditions:
          Record<
            string,
            unknown
          >[] = [];

        if (
          expertId &&
          isValidObjectId(
            expertId
          )
        ) {
          lookupConditions.push({
            _id:
              expertId,
          });
        }

        if (expertEmail) {
          lookupConditions.push({
            email:
              expertEmail,
          });
        }

        const expertDoc =
          lookupConditions.length >
          0
            ? await UserModel.findOne(
                {
                  $or:
                    lookupConditions,
                }
              )
            : null;

        if (expertDoc) {
          expertDetails = {
            id:
              expertDoc._id.toString(),

            name:
              expertDoc.name,

            email:
              normalizeEmail(
                expertDoc.email
              ),

            title:
              expertDoc.title ||
              "Agricultural Specialist",

            avatar:
              expertDoc.avatar ||
              expertDoc.image,

            phone:
              expertDoc.phone,

            consultationFee:
              Number.isFinite(
                Number(
                  expertDoc.consultationFee
                )
              )
                ? Math.max(
                    0,
                    Number(
                      expertDoc.consultationFee
                    )
                  )
                : 500,
          };
        }
      } catch {
        expertDetails =
          undefined;
      }
    }

    /* --------------------------------------------------------
       Scheduled date
    -------------------------------------------------------- */

    const scheduledAt =
      createScheduledAt(
        undefined,
        payload.scheduledDate,
        payload.scheduledTime
      );

    const hasSchedule =
      Boolean(
        payload.scheduledDate &&
          payload.scheduledTime &&
          scheduledAt
      );

    const cleanRandomRoom =
      `agrinova-consultation-${Date.now()}-${Math.floor(
        Math.random() *
          1000
      )}`;

    const finalExpertId =
      expertDetails?.id ||
      expertId;

    const finalExpertEmail =
      expertDetails?.email ||
      expertEmail;

    const finalExpertName =
      expertDetails?.name ||
      payload.expertName;

    /* --------------------------------------------------------
       Consultation payment

       IMPORTANT: fee is resolved from the server-side Expert
       record. It is never accepted from the Farmer request body.
    -------------------------------------------------------- */

    const resolvedConsultationFee =
      Number(
        expertDetails
          ?.consultationFee ??
          500
      );

    const consultationFee =
      finalExpertId ||
      finalExpertEmail
        ? Number.isFinite(
            resolvedConsultationFee
          )
          ? Math.max(
              0,
              resolvedConsultationFee
            )
          : 500
        : 0;

    const requiresStripePayment =
      user.role === "FARMER" &&
      Boolean(
        finalExpertId ||
        finalExpertEmail
      ) &&
      consultationFee > 0;

    /* --------------------------------------------------------
       Create document
    -------------------------------------------------------- */

    const consultationData:
      Partial<IConsultation> =
      {
        farmerId:
          user.id,

        farmerName:
          user.name ||
          "AgriNova Farmer",

        farmerEmail,

        farmer: {
          id:
            user.id,

          name:
            user.name ||
            "AgriNova Farmer",

          email:
            farmerEmail,

          farmName:
            payload.farmName,

          district:
            payload.district,

          location:
            payload.district,
        },

        expertId:
          finalExpertId,

        expertName:
          finalExpertName,

        expertEmail:
          finalExpertEmail,

        expert:
          expertDetails ||
          (
            finalExpertId ||
            finalExpertEmail
              ? {
                  id:
                    finalExpertId,

                  name:
                    finalExpertName ||
                    "Agricultural Specialist",

                  email:
                    finalExpertEmail,

                  title:
                    "Agricultural Specialist",
                }
              : undefined
          ),

        farmId:
          payload.farmId,

        farmName:
          payload.farmName,

        district:
          payload.district,

        cropName:
          payload.cropName ||
          payload.cropType,

        cropType:
          payload.cropType,

        problemTitle:
          payload.problemTitle,

        problemDescription:
          payload.problemDescription,

        images:
          payload.images ||
          [],

        urgency:
          payload.urgency ||
          "MEDIUM",

        preferredDate:
          payload.preferredDate ||
          payload.scheduledDate,

        preferredTime:
          payload.preferredTime ||
          payload.scheduledTime,

        scheduledDate:
          hasSchedule
            ? payload.scheduledDate
            : undefined,

        scheduledTime:
          hasSchedule
            ? payload.scheduledTime
            : undefined,

        scheduledAt:
          hasSchedule &&
          scheduledAt
            ? scheduledAt
            : undefined,

        status:
          requiresStripePayment
            ? "PENDING"
            : hasSchedule
              ? "SCHEDULED"
              : "PENDING",

        videoRoomId:
          !requiresStripePayment &&
          hasSchedule
            ? cleanRandomRoom
            : undefined,

        meetingLink:
          !requiresStripePayment &&
          hasSchedule
            ? payload.meetingLink ||
              `https://meet.jit.si/${cleanRandomRoom}`
            : undefined,

        consultationFee,

        paymentMethod:
          requiresStripePayment
            ? "STRIPE"
            : undefined,

        paymentStatus:
          requiresStripePayment
            ? "UNPAID"
            : undefined,

        notes:
          payload.notes,

        requestedAt:
          new Date(),
      };

    return Consultation.create(
      consultationData
    );
  };

/* ============================================================
   GET CONSULTATIONS FOR CURRENT USER
============================================================ */

const getAllConsultationsFromDB =
  async (
    user: UserContext,

    queryParams: {
      status?: string;
      search?: string;
      cropType?: string;
      limit?: number;
      page?: number;
    }
  ) => {
    const conditions:
      Record<
        string,
        unknown
      >[] = [];

    const requestedStatus =
      String(
        queryParams.status ||
        "ALL"
      ).toUpperCase();

    /* --------------------------------------------------------
       FARMER:
       Only own consultations
    -------------------------------------------------------- */

    if (
      user.role ===
      "FARMER"
    ) {
      conditions.push({
        $or:
          getFarmerConditions(
            user
          ),
      });
    }

    /* --------------------------------------------------------
       EXPERT:
       Only own consultations + unassigned pending
    -------------------------------------------------------- */

    if (
      user.role ===
      "EXPERT"
    ) {
      if (
        requestedStatus ===
        "PENDING"
      ) {
        conditions.push(
          getPendingVisibleToExpertFilter(
            user
          )
        );
      } else if (
        requestedStatus ===
        "ALL"
      ) {
        conditions.push(
          getAllVisibleToExpertFilter(
            user
          )
        );
      } else {
        conditions.push(
          getAssignedExpertFilter(
            user
          )
        );
      }
    }

    /* --------------------------------------------------------
       ONGOING special rule
    -------------------------------------------------------- */

    if (
      requestedStatus ===
      "ONGOING"
    ) {
      const thirtyMinutesAgo =
        new Date(
          Date.now() -
            30 *
              60 *
              1000
        );

      const now =
        new Date();

      conditions.push({
        $or: [
          {
            status:
              "ONGOING",

            startedAt: {
              $gte:
                thirtyMinutesAgo,
            },
          },

          {
            status:
              "ONGOING",

            startedAt: {
              $exists:
                false,
            },

            createdAt: {
              $gte:
                thirtyMinutesAgo,
            },
          },

          {
            status:
              "SCHEDULED",

            scheduledAt: {
              $lte:
                now,

              $gte:
                thirtyMinutesAgo,
            },
          },
        ],
      });
    } else if (
      requestedStatus !==
        "ALL" &&
      requestedStatus !==
        "PENDING"
    ) {
      conditions.push({
        status:
          requestedStatus,
      });
    } else if (
      requestedStatus ===
        "PENDING" &&
      user.role !==
        "EXPERT"
    ) {
      conditions.push({
        status:
          "PENDING",
      });
    }

    /* --------------------------------------------------------
       Crop filter
    -------------------------------------------------------- */

    if (
      queryParams.cropType
        ?.trim()
    ) {
      conditions.push({
        cropType:
          new RegExp(
            queryParams.cropType.trim(),
            "i"
          ),
      });
    }

    /* --------------------------------------------------------
       Search
    -------------------------------------------------------- */

    if (
      queryParams.search
        ?.trim()
    ) {
      const searchRegex =
        new RegExp(
          queryParams.search.trim(),
          "i"
        );

      conditions.push({
        $or: [
          {
            problemTitle:
              searchRegex,
          },

          {
            problemDescription:
              searchRegex,
          },

          {
            cropType:
              searchRegex,
          },

          {
            cropName:
              searchRegex,
          },

          {
            farmerName:
              searchRegex,
          },

          {
            "farmer.name":
              searchRegex,
          },

          {
            farmName:
              searchRegex,
          },

          {
            district:
              searchRegex,
          },
        ],
      });
    }

    const filter =
      conditions.length >
      0
        ? {
            $and:
              conditions,
          }
        : {};

    const limit =
      Math.min(
        Math.max(
          Number(
            queryParams.limit
          ) ||
            50,
          1
        ),
        100
      );

    const page =
      Math.max(
        Number(
          queryParams.page
        ) ||
          1,
        1
      );

    const skip =
      (page - 1) *
      limit;

    return Consultation.find(
      filter
    )
      .sort({
        createdAt:
          -1,
      })
      .skip(
        skip
      )
      .limit(
        limit
      );
  };

/* ============================================================
   GET EXPERT CONSULTATIONS
============================================================ */

const getExpertConsultationsFromDB =
  async (
    expertUser:
      UserContext,

    queryParams: {
      status?: string;
      search?: string;
      cropType?: string;
      limit?: number;
      page?: number;
    }
  ) => {
    const conditions:
      Record<
        string,
        unknown
      >[] = [];

    const requestedStatus =
      String(
        queryParams.status ||
        "ALL"
      ).toUpperCase();

    /* --------------------------------------------------------
       EXPERT DATA SCOPING

       Admin can see everything.
       Expert can only see own + available pending.
    -------------------------------------------------------- */

    if (
      expertUser.role !==
      "ADMIN"
    ) {
      if (
        requestedStatus ===
        "PENDING"
      ) {
        conditions.push(
          getPendingVisibleToExpertFilter(
            expertUser
          )
        );
      } else if (
        requestedStatus ===
        "ALL"
      ) {
        conditions.push(
          getAllVisibleToExpertFilter(
            expertUser
          )
        );
      } else {
        conditions.push(
          getAssignedExpertFilter(
            expertUser
          )
        );
      }
    }

    /* --------------------------------------------------------
       Status
    -------------------------------------------------------- */

    if (
      requestedStatus ===
      "ONGOING"
    ) {
      const thirtyMinutesAgo =
        new Date(
          Date.now() -
            30 *
              60 *
              1000
        );

      const now =
        new Date();

      conditions.push({
        $or: [
          {
            status:
              "ONGOING",

            startedAt: {
              $gte:
                thirtyMinutesAgo,
            },
          },

          {
            status:
              "ONGOING",

            startedAt: {
              $exists:
                false,
            },

            createdAt: {
              $gte:
                thirtyMinutesAgo,
            },
          },

          {
            status:
              "SCHEDULED",

            scheduledAt: {
              $lte:
                now,

              $gte:
                thirtyMinutesAgo,
            },
          },
        ],
      });
    } else if (
      requestedStatus !==
        "ALL" &&
      requestedStatus !==
        "PENDING"
    ) {
      conditions.push({
        status:
          requestedStatus,
      });
    } else if (
      requestedStatus ===
        "PENDING" &&
      expertUser.role ===
        "ADMIN"
    ) {
      conditions.push({
        status:
          "PENDING",
      });
    }

    /* --------------------------------------------------------
       Crop
    -------------------------------------------------------- */

    if (
      queryParams.cropType
        ?.trim()
    ) {
      conditions.push({
        cropType:
          new RegExp(
            queryParams.cropType.trim(),
            "i"
          ),
      });
    }

    /* --------------------------------------------------------
       Search
    -------------------------------------------------------- */

    if (
      queryParams.search
        ?.trim()
    ) {
      const searchRegex =
        new RegExp(
          queryParams.search.trim(),
          "i"
        );

      conditions.push({
        $or: [
          {
            problemTitle:
              searchRegex,
          },

          {
            problemDescription:
              searchRegex,
          },

          {
            cropType:
              searchRegex,
          },

          {
            cropName:
              searchRegex,
          },

          {
            farmerName:
              searchRegex,
          },

          {
            "farmer.name":
              searchRegex,
          },

          {
            farmName:
              searchRegex,
          },

          {
            district:
              searchRegex,
          },
        ],
      });
    }

    const filter =
      conditions.length >
      0
        ? {
            $and:
              conditions,
          }
        : {};

    const limit =
      Math.min(
        Math.max(
          Number(
            queryParams.limit
          ) ||
            50,
          1
        ),
        100
      );

    const page =
      Math.max(
        Number(
          queryParams.page
        ) ||
          1,
        1
      );

    const skip =
      (page - 1) *
      limit;

    return Consultation.find(
      filter
    )
      .sort({
        createdAt:
          -1,
      })
      .skip(
        skip
      )
      .limit(
        limit
      );
  };

/* ============================================================
   GET SINGLE CONSULTATION
============================================================ */

const getSingleConsultationFromDB =
  async (
    id: string,
    user: UserContext
  ) => {
    const consultation =
      await findConsultationById(
        id
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    /* ADMIN */

    if (
      user.role ===
      "ADMIN"
    ) {
      return consultation;
    }

    /* FARMER */

    if (
      user.role ===
      "FARMER"
    ) {
      if (
        !isFarmerOwner(
          consultation,
          user
        )
      ) {
        throw new AppError(
          403,
          "You are not authorized to view this consultation"
        );
      }

      return consultation;
    }

    /* EXPERT */

    if (
      user.role ===
        "EXPERT" &&
      !canExpertViewConsultation(
        consultation,
        user
      )
    ) {
      throw new AppError(
        403,
        "You are not authorized to view this consultation"
      );
    }

    return consultation;
  };

/* ============================================================
   ACCEPT CONSULTATION
============================================================ */

const acceptConsultationInDB =
  async (
    consultationId:
      string,

    expertUser:
      UserContext
  ) => {
    const consultation =
      await findConsultationById(
        consultationId
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation request not found"
      );
    }

    if (
      consultation.status !==
      "PENDING"
    ) {
      throw new AppError(
        400,
        `Cannot accept consultation with status '${consultation.status}'. Only PENDING requests can be accepted.`
      );
    }

    /*
     * An Expert may accept:
     * - their own assigned request
     * - a completely unassigned pending request
     *
     * They cannot accept a request assigned to another Expert.
     */
    assertExpertCanAct(
      consultation,
      expertUser,
      {
        allowUnassignedPending:
          true,
      }
    );

    consultation.status =
      "ACCEPTED";

    consultation.acceptedAt =
      new Date();

    if (
      expertUser.role ===
      "EXPERT"
    ) {
      await assignConsultationToExpert(
        consultation,
        expertUser
      );
    }

    await consultation.save();

    return consultation;
  };

/* ============================================================
   REJECT CONSULTATION
============================================================ */

const rejectConsultationInDB =
  async (
    consultationId:
      string,

    reason:
      string |
      undefined,

    expertUser:
      UserContext
  ) => {
    const consultation =
      await findConsultationById(
        consultationId
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation request not found"
      );
    }

    if (
      consultation.status !==
      "PENDING"
    ) {
      throw new AppError(
        400,
        `Cannot reject consultation with status '${consultation.status}'. Only PENDING requests can be rejected.`
      );
    }

    assertExpertCanAct(
      consultation,
      expertUser,
      {
        allowUnassignedPending:
          true,
      }
    );

    consultation.status =
      "REJECTED";

    consultation.rejectionReason =
      reason ||
      "Unable to handle this consultation.";

    if (
      expertUser.role ===
      "EXPERT"
    ) {
      await assignConsultationToExpert(
        consultation,
        expertUser
      );
    }

    await consultation.save();

    return consultation;
  };

/* ============================================================
   SCHEDULE CONSULTATION
============================================================ */

const scheduleConsultationInDB =
  async (
    consultationId:
      string,

    payload:
      ScheduleConsultationPayload,

    expertUser:
      UserContext
  ) => {
    const consultation =
      await findConsultationById(
        consultationId
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    /* --------------------------------------------------------
       Ownership
    -------------------------------------------------------- */

    assertExpertCanAct(
      consultation,
      expertUser
    );

    /* --------------------------------------------------------
       Status
    -------------------------------------------------------- */

    if (
      ![
        "ACCEPTED",
        "SCHEDULED",
      ].includes(
        consultation.status
      )
    ) {
      throw new AppError(
        400,
        `Cannot schedule consultation with status '${consultation.status}'. Must be ACCEPTED or SCHEDULED.`
      );
    }

    /* --------------------------------------------------------
       Date
    -------------------------------------------------------- */

    const scheduledAtDate =
      createScheduledAt(
        payload.scheduledAt,
        payload.scheduledDate,
        payload.scheduledTime
      );

    if (
      !scheduledAtDate
    ) {
      throw new AppError(
        400,
        "scheduledAt (or scheduledDate and scheduledTime) is required and must be valid"
      );
    }

    if (
      scheduledAtDate.getTime() <=
      Date.now()
    ) {
      throw new AppError(
        400,
        "Scheduled consultation time must be in the future."
      );
    }

    /* --------------------------------------------------------
       Expert profile
    -------------------------------------------------------- */

    const expertLookup =
      getExpertLookup(
        consultation,

        expertUser.role ===
          "EXPERT"
          ? expertUser
          : undefined
      );

    const expertDoc =
      expertLookup
        ? await UserModel.findOne(
            expertLookup
          )
        : null;

    /* --------------------------------------------------------
       Availability status
    -------------------------------------------------------- */

    if (
      expertDoc
        ?.availabilityStatus ===
      "UNAVAILABLE"
    ) {
      throw new AppError(
        400,
        "Expert is currently marked as UNAVAILABLE. Cannot schedule consultations."
      );
    }

    const availabilitySlots =
      expertDoc
        ?.availabilitySlots &&
      Array.isArray(
        expertDoc.availabilitySlots
      ) &&
      expertDoc
        .availabilitySlots
        .length >
        0
        ? expertDoc.availabilitySlots
        : defaultAvailabilitySlots;

    /* --------------------------------------------------------
       Weekday + availability window
    -------------------------------------------------------- */

    if (
      expertDoc ||
      expertUser.role ===
        "EXPERT"
    ) {
      const targetDay =
        weekDayMap[
          scheduledAtDate.getDay()
        ];

      const matchingSlot =
        (
          availabilitySlots as
            IAvailabilitySlot[]
        ).find(
          (
            slot
          ) =>
            slot.day ===
            targetDay
        );

      if (
        !matchingSlot ||
        !matchingSlot.enabled
      ) {
        throw new AppError(
          400,
          `Expert is not available on ${targetDay}. Please choose an enabled day.`
        );
      }

      const scheduledTimeStr =
        payload.scheduledTime ||
        toTimeInputValue(
          scheduledAtDate
        );

      if (
        matchingSlot.startTime &&
        matchingSlot.endTime &&
        (
          scheduledTimeStr <
            matchingSlot.startTime ||
          scheduledTimeStr >
            matchingSlot.endTime
        )
      ) {
        throw new AppError(
          400,
          `Selected time (${scheduledTimeStr}) is outside available hours for ${targetDay} (${matchingSlot.startTime} - ${matchingSlot.endTime}).`
        );
      }
    }

    /* --------------------------------------------------------
       Check 30-minute overlap
    -------------------------------------------------------- */

    const expertConditions =
      getConsultationExpertConditions(
        consultation,

        expertUser.role ===
          "EXPERT"
          ? expertUser
          : undefined
      );

    if (
      expertConditions.length >
      0
    ) {
      const newStart =
        scheduledAtDate.getTime();

      const newEnd =
        newStart +
        CONSULTATION_DURATION_MINUTES *
          60 *
          1000;

      const existingActiveConsultations =
        await Consultation.find(
          {
            $and: [
              {
                $or:
                  expertConditions,
              },

              {
                status: {
                  $in: [
                    "SCHEDULED",
                    "ONGOING",
                  ],
                },
              },

              {
                _id: {
                  $ne:
                    consultation._id,
                },
              },

              {
                scheduledAt: {
                  $exists:
                    true,

                  $ne:
                    null,
                },
              },
            ],
          }
        );

      for (
        const existing of
        existingActiveConsultations
      ) {
        if (
          !existing.scheduledAt
        ) {
          continue;
        }

        const existingStart =
          new Date(
            existing.scheduledAt
          ).getTime();

        const existingEnd =
          existingStart +
          CONSULTATION_DURATION_MINUTES *
            60 *
            1000;

        if (
          newStart <
            existingEnd &&
          newEnd >
            existingStart
        ) {
          throw new AppError(
            409,
            "Selected time overlaps with another consultation."
          );
        }
      }
    }

    /* --------------------------------------------------------
       Meeting room
    -------------------------------------------------------- */

    const cleanId =
      String(
        consultation._id ||
          consultation.id ||
          consultationId
      );

    const videoRoomId =
      consultation.videoRoomId ||
      `agrinova-consultation-${cleanId}`;

    const generatedMeetingLink =
      payload.meetingLink ||
      consultation.meetingLink ||
      `https://meet.jit.si/${videoRoomId}`;

    consultation.status =
      "SCHEDULED";

    consultation.scheduledAt =
      scheduledAtDate;

    consultation.scheduledDate =
      payload.scheduledDate ||
      toDateInputValue(
        scheduledAtDate
      );

    consultation.scheduledTime =
      payload.scheduledTime ||
      toTimeInputValue(
        scheduledAtDate
      );

    consultation.videoRoomId =
      videoRoomId;

    consultation.meetingLink =
      generatedMeetingLink;

    consultation.startedAt =
      undefined;

    if (
      payload.notes !==
      undefined
    ) {
      consultation.notes =
        payload.notes;
    }

    await consultation.save();

    return consultation;
  };

/* ============================================================
   START VIDEO CONSULTATION
============================================================ */

const startConsultationInDB =
  async (
    consultationId:
      string,

    expertUser:
      UserContext
  ) => {
    const consultation =
      await findConsultationById(
        consultationId
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    assertExpertCanAct(
      consultation,
      expertUser
    );

    if (
      ![
        "SCHEDULED",
        "ONGOING",
      ].includes(
        consultation.status
      )
    ) {
      throw new AppError(
        409,
        `Cannot start consultation with status '${consultation.status}'. Status must be SCHEDULED.`
      );
    }

    const cleanId =
      String(
        consultation._id ||
          consultation.id ||
          consultationId
      );

    const videoRoomId =
      consultation.videoRoomId ||
      `agrinova-consultation-${cleanId}`;

    const meetingLink =
      consultation.meetingLink ||
      `https://meet.jit.si/${videoRoomId}`;

    /* Already started */

    if (
      consultation.status ===
      "ONGOING"
    ) {
      return {
        status:
          consultation.status,

        videoRoomId,

        meetingLink,
      };
    }

    if (
      !consultation.scheduledAt
    ) {
      throw new AppError(
        400,
        "Consultation has not been scheduled yet."
      );
    }

    const scheduledTime =
      new Date(
        consultation.scheduledAt
      ).getTime();

    const now =
      Date.now();

    const earliestStart =
      scheduledTime -
      EARLY_JOIN_MINUTES *
        60 *
        1000;

    const latestStart =
      scheduledTime +
      (
        CONSULTATION_DURATION_MINUTES +
        LATE_JOIN_GRACE_MINUTES
      ) *
        60 *
        1000;

    /* Too early */

    if (
      now <
      earliestStart
    ) {
      const diffMinutes =
        Math.ceil(
          (
            earliestStart -
            now
          ) /
            (
              60 *
              1000
            )
        );

      throw new AppError(
        400,
        `Video call window is not open yet. You can start the call ${EARLY_JOIN_MINUTES} minutes before scheduled time (in ~${diffMinutes} minutes).`
      );
    }

    /* Too late */

    if (
      now >
      latestStart
    ) {
      throw new AppError(
        400,
        "Consultation call window has expired. Please reschedule the consultation."
      );
    }

    consultation.status =
      "ONGOING";

    consultation.videoRoomId =
      videoRoomId;

    consultation.meetingLink =
      meetingLink;

    if (
      !consultation.startedAt
    ) {
      consultation.startedAt =
        new Date();
    }

    await consultation.save();

    return {
      status:
        consultation.status,

      videoRoomId:
        consultation.videoRoomId,

      meetingLink:
        consultation.meetingLink,
    };
  };

/* ============================================================
   ADD RECOMMENDATION
============================================================ */

const addRecommendationInDB =
  async (
    consultationId:
      string,

    payload:
      RecommendationPayload,

    expertUser:
      UserContext
  ) => {
    const consultation =
      await findConsultationById(
        consultationId
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    assertExpertCanAct(
      consultation,
      expertUser,
      {
        allowUnassignedPending:
          true,
      }
    );

    /*
     * If it was an unassigned pending request,
     * assign it to the Expert performing the action.
     */

    if (
      expertUser.role ===
        "EXPERT" &&
      isUnassignedConsultation(
        consultation
      )
    ) {
      await assignConsultationToExpert(
        consultation,
        expertUser
      );
    }

    const allowedStatuses:
      TConsultationStatus[] =
      [
        "PENDING",
        "ACCEPTED",
        "SCHEDULED",
        "ONGOING",
        "COMPLETED",
      ];

    if (
      !allowedStatuses.includes(
        consultation.status
      )
    ) {
      throw new AppError(
        409,
        `Cannot add recommendation to consultation with status '${consultation.status}'.`
      );
    }

    const recommendationText =
      payload.recommendation
        ?.trim() ||
      payload.diagnosis
        ?.trim() ||
      "Follow prescribed treatment";

    consultation.recommendation =
      recommendationText;

    consultation.recommendations =
      {
        diagnosis:
          payload.diagnosis
            ?.trim() ||
          recommendationText,

        prescriptions:
          payload.prescriptions ||
          [],

        treatmentSteps:
          payload.treatmentSteps ||
          [],

        followUpDate:
          payload.followUpDate,

        additionalNotes:
          payload.additionalNotes,

        createdAt:
          new Date(),
      };

    /*
     * Existing Agrinova behavior:
     * recommendation submission completes the session.
     */

    if (
      consultation.status !==
      "COMPLETED"
    ) {
      consultation.status =
        "COMPLETED";

      consultation.completedAt =
        new Date();
    }

    await consultation.save();

    return consultation;
  };

/* ============================================================
   COMPLETE CONSULTATION
============================================================ */

const completeConsultationInDB =
  async (
    consultationId:
      string,

    expertUser:
      UserContext
  ) => {
    const consultation =
      await findConsultationById(
        consultationId
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    assertExpertCanAct(
      consultation,
      expertUser
    );

    if (
      consultation.status !==
      "ONGOING"
    ) {
      throw new AppError(
        409,
        `Cannot complete consultation with status '${consultation.status}'. Consultation must be in ONGOING status.`
      );
    }

    if (
      !consultation.recommendation &&
      !consultation
        .recommendations
        ?.diagnosis
    ) {
      throw new AppError(
        400,
        "Expert recommendation is required before completing consultation."
      );
    }

    consultation.status =
      "COMPLETED";

    consultation.completedAt =
      new Date();

    await consultation.save();

    return consultation;
  };

/* ============================================================
   EXPERT STATISTICS
============================================================ */

const getExpertConsultationStatsFromDB =
  async (
    expertUser:
      UserContext
  ) => {
    /* --------------------------------------------------------
       ADMIN gets global statistics
    -------------------------------------------------------- */

    if (
      expertUser.role ===
      "ADMIN"
    ) {
      const [
        newRequests,
        accepted,
        scheduled,
        ongoing,
        completed,
        cancelled,
      ] =
        await Promise.all(
          [
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
                status: {
                  $in: [
                    "CANCELLED",
                    "REJECTED",
                  ],
                },
              }
            ),
          ]
        );

      return {
        newRequests,
        accepted,
        scheduled,
        ongoing,
        completed,
        cancelled,

        total:
          newRequests +
          accepted +
          scheduled +
          ongoing +
          completed +
          cancelled,
      };
    }

    /* --------------------------------------------------------
       EXPERT statistics are scoped
    -------------------------------------------------------- */

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
      cancelled,
    ] =
      await Promise.all(
        [
          /* New requests */

          Consultation.countDocuments(
            pendingFilter
          ),

          /* Accepted */

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

          /* Scheduled */

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

          /* Ongoing */

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

          /* Completed */

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

          /* Cancelled / rejected */

          Consultation.countDocuments(
            {
              $and: [
                {
                  status: {
                    $in: [
                      "CANCELLED",
                      "REJECTED",
                    ],
                  },
                },

                assignedFilter,
              ],
            }
          ),
        ]
      );

    return {
      newRequests,
      accepted,
      scheduled,
      ongoing,
      completed,
      cancelled,

      total:
        newRequests +
        accepted +
        scheduled +
        ongoing +
        completed +
        cancelled,
    };
  };

/* ============================================================
   UPDATE GENERAL STATUS
============================================================ */

const updateConsultationStatusInDB =
  async (
    consultationId:
      string,

    status:
      TConsultationStatus,

    reason:
      string | undefined,

    user:
      UserContext
  ) => {
    /*
     * Generic status mutation is intentionally ADMIN-only.
     * Experts must use the dedicated accept/reject/schedule/start/complete
     * endpoints, which enforce assignment ownership and valid transitions.
     */
    if (user.role !== "ADMIN") {
      throw new AppError(
        403,
        "Only an administrator can use the general consultation status endpoint."
      );
    }

    const consultation =
      await findConsultationById(
        consultationId
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    consultation.status =
      status;

    if (
      status ===
        "ONGOING" &&
      !consultation.startedAt
    ) {
      consultation.startedAt =
        new Date();
    }

    if (
      status ===
        "COMPLETED" &&
      !consultation.completedAt
    ) {
      consultation.completedAt =
        new Date();
    }

    if (
      status ===
        "CANCELLED" &&
      reason
    ) {
      consultation.cancellationReason =
        reason;
    }

    if (
      status ===
        "REJECTED" &&
      reason
    ) {
      consultation.rejectionReason =
        reason;
    }

    await consultation.save();

    return consultation;
  };

/* ============================================================
   UPDATE DETAILS / RESCHEDULE
============================================================ */

const updateConsultationDetailsInDB =
  async (
    consultationId:
      string,

    payload: {
      cropType?: string;
      cropName?: string;
      problemTitle?: string;
      problemDescription?: string;
      urgency?: TConsultationUrgency;
      farmName?: string;
      district?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      scheduledAt?: string | Date;
      meetingLink?: string;
      notes?: string;
    },

    user: UserContext
  ) => {
    const consultation =
      await findConsultationById(
        consultationId
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    /* --------------------------------------------------------
       Completed consultations are historical records
    -------------------------------------------------------- */

    if (
      consultation.status ===
      "COMPLETED"
    ) {
      throw new AppError(
        400,
        "This consultation session has already been completed and its details or schedule cannot be modified."
      );
    }

    if (
      [
        "REJECTED",
        "CANCELLED",
      ].includes(
        consultation.status
      )
    ) {
      throw new AppError(
        400,
        `Cannot modify a ${consultation.status.toLowerCase()} consultation.`
      );
    }

    /* --------------------------------------------------------
       FIXED:
       Previously any user whose role was EXPERT could update
       any consultation.

       Now Expert must actually own/be assigned to it.
    -------------------------------------------------------- */

    const allowed =
      user.role ===
        "ADMIN" ||

      (
        user.role ===
          "FARMER" &&
        isFarmerOwner(
          consultation,
          user
        )
      ) ||

      (
        user.role ===
          "EXPERT" &&
        isAssignedExpert(
          consultation,
          user
        )
      );

    if (!allowed) {
      throw new AppError(
        403,
        "You are not authorized to modify this consultation."
      );
    }

    /* --------------------------------------------------------
       Update normal fields
    -------------------------------------------------------- */

    if (
      payload.cropType !==
      undefined
    ) {
      consultation.cropType =
        payload.cropType;
    }

    if (
      payload.cropName !==
      undefined
    ) {
      consultation.cropName =
        payload.cropName;
    }

    if (
      payload.problemTitle !==
      undefined
    ) {
      consultation.problemTitle =
        payload.problemTitle;
    }

    if (
      payload.problemDescription !==
      undefined
    ) {
      consultation.problemDescription =
        payload.problemDescription;
    }

    if (
      payload.urgency !==
      undefined
    ) {
      consultation.urgency =
        payload.urgency;
    }

    if (
      payload.farmName !==
      undefined
    ) {
      consultation.farmName =
        payload.farmName;

      if (
        consultation.farmer
      ) {
        consultation.farmer.farmName =
          payload.farmName;
      }
    }

    if (
      payload.district !==
      undefined
    ) {
      consultation.district =
        payload.district;

      if (
        consultation.farmer
      ) {
        consultation.farmer.district =
          payload.district;
      }
    }

    if (
      payload.notes !==
      undefined
    ) {
      consultation.notes =
        payload.notes;
    }

    /* --------------------------------------------------------
       Determine whether this is rescheduling
    -------------------------------------------------------- */

    const isRescheduling =
      Boolean(
        payload.scheduledAt ||
          payload.scheduledDate !==
            undefined ||
          payload.scheduledTime !==
            undefined
      );

    if (isRescheduling) {
      const currentDate =
        consultation.scheduledDate;

      const currentTime =
        consultation.scheduledTime;

      const scheduledAtDate =
        createScheduledAt(
          payload.scheduledAt,

          payload.scheduledDate ||
            currentDate,

          payload.scheduledTime ||
            currentTime
        );

      if (
        !scheduledAtDate
      ) {
        throw new AppError(
          400,
          "Invalid scheduled date/time."
        );
      }

      if (
        scheduledAtDate.getTime() <=
        Date.now()
      ) {
        throw new AppError(
          400,
          "Scheduled consultation time must be in the future."
        );
      }

      const newDate =
        payload.scheduledDate ||
        toDateInputValue(
          scheduledAtDate
        );

      const newTime =
        payload.scheduledTime ||
        toTimeInputValue(
          scheduledAtDate
        );

      /* ------------------------------------------------------
         FARMER conflict
      ------------------------------------------------------ */

      const farmerConditions:
        Record<
          string,
          unknown
        >[] = [];

      if (
        consultation.farmerId
      ) {
        farmerConditions.push(
          {
            farmerId:
              consultation.farmerId,
          },

          {
            "farmer.id":
              consultation.farmerId,
          }
        );
      }

      const consultationFarmerEmail =
        normalizeEmail(
          consultation.farmerEmail ||
            consultation.farmer
              ?.email
        );

      if (
        consultationFarmerEmail
      ) {
        farmerConditions.push(
          {
            farmerEmail:
              consultationFarmerEmail,
          },

          {
            "farmer.email":
              consultationFarmerEmail,
          }
        );
      }

      if (
        farmerConditions.length >
        0
      ) {
        const farmerConflict =
          await Consultation.findOne(
            {
              $and: [
                {
                  _id: {
                    $ne:
                      consultation._id,
                  },
                },

                {
                  $or:
                    farmerConditions,
                },

                {
                  scheduledDate:
                    newDate,
                },

                {
                  scheduledTime:
                    newTime,
                },

                {
                  status: {
                    $in: [
                      "ACCEPTED",
                      "SCHEDULED",
                      "ONGOING",
                    ],
                  },
                },
              ],
            }
          );

        if (
          farmerConflict
        ) {
          throw new AppError(
            400,
            `Time conflict: The farmer already has another consultation booked on ${newDate} at ${newTime} with specialist ${
              farmerConflict.expertName ||
              "another expert"
            }. Please pick a different date or time slot.`
          );
        }
      }

      /* ------------------------------------------------------
         EXPERT conflict
      ------------------------------------------------------ */

      const expertConditions =
        getConsultationExpertConditions(
          consultation
        );

      if (
        expertConditions.length >
        0
      ) {
        const expertConflict =
          await Consultation.findOne(
            {
              $and: [
                {
                  _id: {
                    $ne:
                      consultation._id,
                  },
                },

                {
                  $or:
                    expertConditions,
                },

                {
                  scheduledDate:
                    newDate,
                },

                {
                  scheduledTime:
                    newTime,
                },

                {
                  status: {
                    $in: [
                      "ACCEPTED",
                      "SCHEDULED",
                      "ONGOING",
                    ],
                  },
                },
              ],
            }
          );

        if (
          expertConflict
        ) {
          throw new AppError(
            400,
            `Time slot unavailable: This specialist already has a consultation booked on ${newDate} at ${newTime}. Please select another available time slot.`
          );
        }
      }

      consultation.scheduledDate =
        newDate;

      consultation.scheduledTime =
        newTime;

      consultation.scheduledAt =
        scheduledAtDate;

      consultation.status =
        consultation.paymentStatus &&
        consultation.paymentStatus !== "PAID"
          ? "PENDING"
          : "SCHEDULED";

      consultation.startedAt =
        undefined;

      consultation.completedAt =
        undefined;
    }

    if (
      payload.meetingLink !==
      undefined
    ) {
      if (
        consultation.paymentStatus &&
        consultation.paymentStatus !== "PAID" &&
        user.role !== "ADMIN"
      ) {
        throw new AppError(
          409,
          "Meeting link is created only after consultation payment is completed."
        );
      }

      consultation.meetingLink =
        payload.meetingLink;
    }

    await consultation.save();

    return consultation;
  };

/* ============================================================
   DELETE CONSULTATION
============================================================ */

const deleteConsultationFromDB =
  async (
    consultationId:
      string,

    user: UserContext
  ) => {
    const consultation =
      await findConsultationById(
        consultationId
      );

    if (!consultation) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    /* --------------------------------------------------------
       Preserve completed medical/agriculture records
    -------------------------------------------------------- */

    if (
      consultation.status ===
      "COMPLETED"
    ) {
      throw new AppError(
        400,
        "Completed consultations cannot be deleted as they preserve historical diagnostic and prescription records."
      );
    }

    /*
     * FIXED:
     * Previously:
     *
     * const isAssignedExpert = isExpert || ...
     *
     * That meant EVERY Expert could delete another
     * Expert's consultation.
     *
     * Now they must really be assigned.
     */

    const allowed =
      user.role ===
        "ADMIN" ||

      (
        user.role ===
          "FARMER" &&
        isFarmerOwner(
          consultation,
          user
        )
      ) ||

      (
        user.role ===
          "EXPERT" &&
        isAssignedExpert(
          consultation,
          user
        )
      );

    if (!allowed) {
      throw new AppError(
        403,
        "You are not authorized to delete this consultation."
      );
    }

    await Consultation.findByIdAndDelete(
      consultation._id
    );

    return {
      id:
        consultationId,

      message:
        "Consultation deleted successfully",
    };
  };

/* ============================================================
   EXPORT
============================================================ */

export const ConsultationServices =
  {
    createConsultationIntoDB,

    getAllConsultationsFromDB,

    getExpertConsultationsFromDB,

    getSingleConsultationFromDB,

    acceptConsultationInDB,

    rejectConsultationInDB,

    scheduleConsultationInDB,

    startConsultationInDB,

    addRecommendationInDB,

    completeConsultationInDB,

    updateConsultationStatusInDB,

    getExpertConsultationStatsFromDB,

    updateConsultationDetailsInDB,

    deleteConsultationFromDB,
  };