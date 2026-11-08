const { z } = require("zod");

const allowedStatuses = new Set([
  "Pending",
  "PENDING_AI",
  "Approved",
  "In_Progress",
  "Resolved",
  "Rejected",
]);
const allowedPriorities = new Set(["Low", "Medium", "High"]);

const coordinateSchema = (minimum, maximum) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return value;
  }, z.number().finite().min(minimum).max(maximum));

/**
 * Strips potentially dangerous HTML/markup characters from payload strings recursively.
 *
 * @param {*} value - Value to sanitize.
 * @returns {*} Sanitized value.
 */
function sanitize(value) {
  if (typeof value === "string") return value.replace(/[<>]/g, "").trim();
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitize(item)]),
    );
  }
  return value;
}

/**
 * Validates citizen report payload structure and normalizes latitude/longitude.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void}
 */
function validateReportPayload(req, res, next) {
  req.body = sanitize(req.body);
  const reportSchema = z
    .object({
      title: z.string().min(1).max(150),
      description: z.string().min(1).max(1000),
      auditNotes: z.string().max(500).optional(),
      category: z.string().min(1),
      latitude: coordinateSchema(-90, 90),
      longitude: coordinateSchema(-180, 180),
    })
    .passthrough();
  const result = reportSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid report payload",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  req.body = result.data;
  const { latitude, longitude } = req.body;
  if (req.body.status && !allowedStatuses.has(req.body.status))
    return res.status(400).json({ error: "Invalid status" });
  if (req.body.priority && !allowedPriorities.has(req.body.priority))
    return res.status(400).json({ error: "Invalid priority" });
  if (
    latitude !== undefined &&
    (Number(latitude) < -90 || Number(latitude) > 90)
  )
    return res.status(400).json({ error: "Invalid latitude" });
  if (
    longitude !== undefined &&
    (Number(longitude) < -180 || Number(longitude) > 180)
  )
    return res.status(400).json({ error: "Invalid longitude" });
  if (latitude !== undefined) req.body.latitude = Number(latitude);
  if (longitude !== undefined) req.body.longitude = Number(longitude);
  return next();
}

/**
 * Validates verification payload parameters submitted by field officers.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void}
 */
function validateVerificationPayload(req, res, next) {
  req.body = sanitize(req.body);
  const result = z
    .object({
      auditNotes: z.string().max(500).optional(),
    })
    .passthrough()
    .safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid verification payload",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  req.body = result.data;
  return next();
}

module.exports = { validateReportPayload, validateVerificationPayload };
