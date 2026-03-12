import { env } from "../config/env.js";

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  if (env.nodeEnv !== "test") {
    console.error(err);
  }

  res.status(status).json({
    message: err.message || "Internal server error"
  });
}
