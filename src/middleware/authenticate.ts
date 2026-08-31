import {
  NextFunction,
  Request,
  Response,
} from "express";

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

    const email =
      typeof payload.email ===
      "string"
        ? payload.email
        : undefined;

    const role =
      typeof payload.role ===
      "string"
        ? payload.role.toUpperCase()
        : undefined;

    if (
      !id ||
      !email ||
      !role
    ) {
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

    req.user = {
      id,
      email,
      name:
        typeof payload.name ===
        "string"
          ? payload.name
          : undefined,

      role,

      status:
        typeof payload.status ===
        "string"
          ? payload.status
          : undefined,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired authentication token",
    });
  }
};

export default authenticate;