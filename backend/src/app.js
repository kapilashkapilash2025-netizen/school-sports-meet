import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { authRequired } from "./middleware/authMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";
import athleticsRoutes from "./routes/athleticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", authRequired, studentRoutes);
app.use("/api/events", authRequired, eventRoutes);
app.use("/api/results", authRequired, resultRoutes);
app.use("/api/leaderboard", authRequired, leaderboardRoutes);
app.use("/api/athletics", authRequired, athleticsRoutes);
app.use("/api/system", authRequired, systemRoutes);

app.use(errorHandler);

export default app;
