const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const ReportRepository = require("./repositories/report.repository");
const MapsService = require("./services/maps.service");
const GeoService = require("./services/geo.service");
const AiIntegrationService = require("./services/ai.service");
const storageService = require("./services/storage.service");
const ReportService = require("./services/report.service");
const ReportController = require("./controllers/report.controller");
const MapsController = require("./controllers/maps.controller");
const reportRoutes = require("./routes/report.routes");
const mapsRoutes = require("./routes/maps.routes");
const {
  validateReportPayload,
  validateVerificationPayload,
} = require("./middlewares/validate.middleware");
const errorMiddleware = require("./middlewares/error.middleware");
const RagService = require("./services/rag.service");
const imageMiddleware = require("./middlewares/image.middleware");
const prisma = require("./config/prisma.config");
const {
  authenticate,
  optionalAuthenticate,
  requireRoles,
} = require("./middlewares/auth.middleware");
const AuthController = require("./controllers/auth.controller");
const authRoutes = require("./routes/auth.routes");
const repository = new ReportRepository();

const app = express();
const mapsService = new MapsService();
const geoService = new GeoService();
const aiService = new AiIntegrationService();
const reportService = new ReportService(repository, mapsService, aiService);
const reportController = new ReportController({
  reportService,
  repository,
  mapsService,
  geoService,
  aiService,
  storageService,
  ragService: new RagService(repository),
});
const authController = new AuthController({ prisma });

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const protectedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
/**
 * Health check endpoint reporting service availability, database connectivity, and process uptime.
 *
 * @description
 * Handles GET /health endpoint. Runs `SELECT 1` on PostgreSQL via Prisma Client.
 * Returns HTTP 200 with status: 'ok' if healthy, or HTTP 503 with status: 'degraded' if database is unreachable.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<import("express").Response>} JSON status payload.
 */
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: "ok",
      service: "aums-backend",
      uptime: process.uptime(),
      database: "up",
    });
  } catch (error) {
    return res.status(503).json({
      status: "degraded",
      service: "aums-backend",
      uptime: process.uptime(),
      database: "down",
    });
  }
});
app.use(
  "/api/v1/auth",
  authRoutes(
    authController,
    publicLimiter,
    protectedLimiter,
    authenticate,
    requireRoles("ADMIN"),
  ),
);
app.use(
  "/api/auth",
  authRoutes(
    authController,
    publicLimiter,
    protectedLimiter,
    authenticate,
    requireRoles("ADMIN"),
  ),
);
app.use(
  "/api/v1/reports",
  reportRoutes(
    reportController,
    validateReportPayload,
    reportController,
    imageMiddleware,
    validateVerificationPayload,
    authenticate,
    requireRoles("CITIZEN", "FIELD_OFFICER", "CRM_OFFICER", "ADMIN"),
    requireRoles("FIELD_OFFICER", "CRM_OFFICER", "ADMIN"),
    requireRoles("CRM_OFFICER", "ADMIN"),
    publicLimiter,
    protectedLimiter,
    optionalAuthenticate,
  ),
);
app.use(
  "/api/reports",
  reportRoutes(
    reportController,
    validateReportPayload,
    reportController,
    imageMiddleware,
    validateVerificationPayload,
    authenticate,
    requireRoles("CITIZEN", "FIELD_OFFICER", "CRM_OFFICER", "ADMIN"),
    requireRoles("FIELD_OFFICER", "CRM_OFFICER", "ADMIN"),
    requireRoles("CRM_OFFICER", "ADMIN"),
    publicLimiter,
    protectedLimiter,
    optionalAuthenticate,
  ),
);
app.use("/api/v1/maps", mapsRoutes(new MapsController(mapsService)));
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorMiddleware);

module.exports = app;
