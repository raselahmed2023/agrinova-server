import {
  NextFunction,
  Request,
  Response,
} from "express";

import mongoose from "mongoose";

import {
  createRemoteJWKSet,
  jwtVerify,
} from "jose";

let jwks:
  | ReturnType<
      typeof createRemoteJWKSet
    >
  | undefined;

const getAuthBaseUrl = () => {
  const authBaseUrl =
    process.env.AUTH_BASE_URL;

  if (!authBaseUrl) {
    throw new Error(
      "AUTH_BASE_URL is not configured"
    );
  }

  return authBaseUrl.replace(
    /\/$/,
    ""
  );
};

const getJwks = () => {
  if (!jwks) {
    const authBaseUrl =
      getAuthBaseUrl();

    jwks =
      createRemoteJWKSet(
        new URL(
          `${authBaseUrl}/api/auth/jwks`
        )
      );
  }

  return jwks;
};

const getAuthUserCollection = () =>
  mongoose.connection
    .useDb("AgriNove-auth", {
      useCache: true,
    })
    .collection("user");

const findCurrentUser = async (
  id: string
) => {
  const collection =
    getAuthUserCollection();

  if (
    mongoose.Types.ObjectId.isValid(
      id
    )
  ) {
    return collection.findOne({
      _id:
        new mongoose.Types.ObjectId(
          id
        ),
    });
  }

  return collection.findOne({
    id,
  });
};

const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const token =
      authorization.substring(7);

    const authBaseUrl =
      getAuthBaseUrl();

    const { payload } =
      await jwtVerify(
        token,
        getJwks(),
        {
          issuer: authBaseUrl,
          audience: authBaseUrl,
        }
      );

    const id =
      typeof payload.id ===
      "string"
        ? payload.id
        : typeof payload.sub ===
            "string"
          ? payload.sub
          : undefined;

    if (!id) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
      });
    }

    
    const currentUser =
      await findCurrentUser(id);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message:
          "User account no longer exists",
      });
    }

    const email =
      typeof currentUser.email ===
      "string"
        ? currentUser.email
        : typeof payload.email ===
            "string"
          ? payload.email
          : undefined;

    const role =
      String(
        currentUser.role ||
          payload.role ||
          ""
      ).toUpperCase();

    const status =
      String(
        currentUser.status ||
          payload.status ||
          "APPROVED"
      ).toUpperCase();

    if (!email || !role) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
      });
    }

    if (
      role !== "FARMER" &&
      role !== "EXPERT" &&
      role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Invalid user role",
      });
    }

    if (
      status === "BLOCKED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This account has been blocked by an administrator",
      });
    }

    if (
      status === "PENDING"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This account is pending administrator approval",
      });
    }

    if (
      status === "REJECTED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This account has been rejected by an administrator",
      });
    }

    req.user = {
      id,
      email,
      name:
        typeof currentUser.name ===
        "string"
          ? currentUser.name
          : typeof payload.name ===
              "string"
            ? payload.name
            : undefined,
      role:
        role as
          | "FARMER"
          | "EXPERT"
          | "ADMIN",
      status,
    };

    next();
  } catch (error) {
    console.error(
      "Authentication failed:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired authentication token",
    });
  }
};

export default authenticate;