import { RequestHandler } from "express";

const notFound: RequestHandler = (_req, res, _next) => {
  res.status(404).json({
    success: false,
    message: "API Route Not Found!",
    error: "",
  });
};

export default notFound;
