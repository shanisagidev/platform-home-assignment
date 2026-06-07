import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Database } from "better-sqlite3";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createAuthRoutes } from "./routes/auth.routes.js";
import { createPoliciesRoutes } from "./routes/policies.routes.js";
import { createScansRoutes } from "./routes/scans.routes.js";
import {
  createAlertsRoutes,
  createAssigneesRoutes,
} from "./routes/alerts.routes.js";
import { createHealthRoutes } from "./routes/health.routes.js";
import { createAdminRoutes } from "./routes/admin.routes.js";
import { createConfigRoutes } from "./routes/config.routes.js";
import { logger } from "./utils/logger.js";

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 200, // 200 requests per minute per IP
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, "Rate limit exceeded");
    res.status(429).json({ error: "Too many requests, please try again later" });
  },
});

// Stricter rate limit for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export function createServer(db: Database) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Apply rate limiting to API routes
  app.use("/api/", apiLimiter);

  // Public routes
  app.use("/health", createHealthRoutes());
  app.use("/api/health", createHealthRoutes());
  app.use("/api/login", loginLimiter, createAuthRoutes(db));

  // Protected routes
  app.use("/api/policy-config", authMiddleware, createConfigRoutes());
  app.use("/api/policies", authMiddleware, createPoliciesRoutes(db));
  app.use("/api/scans", authMiddleware, createScansRoutes(db));
  app.use("/api/alerts", authMiddleware, createAlertsRoutes(db));
  app.use("/api/assignees", authMiddleware, createAssigneesRoutes(db));
  app.use("/api/admin", authMiddleware, createAdminRoutes(db));

  // Error handling
  app.use(errorHandler);

  logger.info("Server configured with rate limiting");

  return app;
}
