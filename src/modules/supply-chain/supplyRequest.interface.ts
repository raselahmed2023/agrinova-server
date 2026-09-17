/* ============================================================
   CONSTANTS
============================================================ */

export const SUPPLY_CATEGORIES =
  [
    "vegetables",
    "fruits",
    "grains_cereals",
    "pulses_seeds",
    "spices",
    "agricultural_by_products",
    "other",
  ] as const;

export const SUPPLY_UNITS =
  [
    "kg",
    "maund",
    "ton",
    "bag",
    "box",
  ] as const;

export const AGRINOVA_BRANCHES =
  [
    "rajshahi",
    "bogura",
    "kushtia",
    "chattogram",
    "dhaka",
  ] as const;

export const SUPPLY_STATUSES =
  [
    "SUBMITTED",
    "ACCEPTED",
    "REJECTED",
    "RECEIVED",
    "COMPLETED",
  ] as const;

/* ============================================================
   TYPES
============================================================ */

export type TSupplyCategory =
  (typeof SUPPLY_CATEGORIES)[number];

export type TSupplyUnit =
  (typeof SUPPLY_UNITS)[number];

export type TAgriNovaBranch =
  (typeof AGRINOVA_BRANCHES)[number];

export type TSupplyStatus =
  (typeof SUPPLY_STATUSES)[number];

/* ============================================================
   SUPPLY REQUEST
============================================================ */

export interface ISupplyRequest {
  /**
   * Public tracking reference.
   *
   * Example:
   * AGN-A12BC34D
   */
  trackingCode:
    string;

  /**
   * ==========================================================
   * FARMER OWNERSHIP
   * ==========================================================
   *
   * This value must come from req.user.id.
   *
   * Never trust farmerId sent from the client body.
   *
   * Used for:
   * - ownership
   * - tracking authorization
   * - My Supply Requests
   * - Farmer notifications
   */
  farmerId:
    string;

  farmerName:
    string;

  phone:
    string;

  farmerEmail?:
    string;

  /* ==========================================================
     PRODUCT
  ========================================================== */

  productName:
    string;

  category:
    TSupplyCategory;

  quantity:
    number;

  unit:
    TSupplyUnit;

  expectedPrice:
    number;

  /* ==========================================================
     LOCATION
  ========================================================== */

  division:
    string;

  district:
    string;

  upazila:
    string;

  location:
    string;

  /* ==========================================================
     AGRINOVA BRANCH
  ========================================================== */

  branch:
    TAgriNovaBranch;

  /* ==========================================================
     OPTIONAL PRODUCT INFORMATION
  ========================================================== */

  notes?:
    string;

  images?:
    string[];

  /* ==========================================================
     STATUS
  ========================================================== */

  status:
    TSupplyStatus;

  /**
   * Admin note / rejection reason.
   */
  adminNote?:
    string;

  /* ==========================================================
     STATUS TIMESTAMPS
  ========================================================== */

  acceptedAt?:
    Date;

  rejectedAt?:
    Date;

  receivedAt?:
    Date;

  completedAt?:
    Date;

  /* ==========================================================
     MONGOOSE TIMESTAMPS
  ========================================================== */

  createdAt?:
    Date;

  updatedAt?:
    Date;
}

/* ============================================================
   ADMIN QUERY
============================================================ */

export interface ISupplyRequestQuery {
  status?:
    string;

  branch?:
    string;

  search?:
    string;

  page?:
    string;

  limit?:
    string;
}

/* ============================================================
   FARMER QUERY
============================================================ */

export interface IFarmerSupplyRequestQuery {
  status?:
    string;

  page?:
    string;

  limit?:
    string;
}