import dotenv from "dotenv";

dotenv.config();

function parseOrigins(rawOrigins) {
  return String(rawOrigins || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: String(process.env.DATABASE_SSL || "false").toLowerCase() === "true",
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN)
};
