const { z } = require("zod");

/**
 * Sensitive fields strictly protected against mass assignment by untrusted clients.
 */
const FORBIDDEN_FIELDS = ["id", "assignedToId", "auditLogs", "actionPlan"];

/**
 * Creates a Zod preprocessed numeric coordinate schema for browser geolocation inputs.
 *
 * @description
 * Converts string representations of floating-point numbers (commonly transmitted via HTML forms or
 * URL query parameters) into finite numbers and enforces strict minimum and maximum boundaries.
 *
 * @param {number} minimum - Lower geographical bound (-90 for latitude, -180 for longitude).
 * @param {number} maximum - Upper geographical bound (90 for latitude, 180 for longitude).
 * @returns {import("zod").ZodType<number>} Zod schema enforcing valid coordinate boundaries.
 */
const coordinateSchema = (minimum, maximum) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  }, z.number().finite().min(minimum).max(maximum));

/**
 * Strips potentially dangerous HTML/markup characters and prevents prototype pollution.
 *
 * @description
 * Recursively cleans incoming payloads:
 * 1. Strips HTML bracket characters (`<` and `>`) to mitigate Cross-Site Scripting (XSS).
 * 2. Removes hazardous prototype inheritance keys (`__proto__`, `constructor`, `prototype`)
 *    to prevent prototype pollution vulnerabilities.
 *
 * @param {*} value - Untrusted value or nested structure to sanitize.
 * @returns {*} Sanitized value safe for internal handling.
 */
function sanitize(value) {
  if (typeof value === "string") return value.replace(/[<>]/g, "").trim();
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const cleaned = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue;
      }
      cleaned[key] = sanitize(item);
    }
    return cleaned;
  }
  return value;
}

/**
 * Checks if the request body attempts mass assignment on forbidden fields.
 *
 * @description
 * Inspects request body keys against the FORBIDDEN_FIELDS whitelist to block unauthorized
 * modification of internal database IDs, reviewer assignments, or audit trails.
 *
 * @param {Object} body - Request body object.
 * @returns {string|null} Name of the first forbidden field encountered, or null if clean.
 */
function assertNoForbiddenFields(body) {
  if (!body || typeof body !== "object") return null;
  for (const field of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      return field;
    }
  }
  return null;
}

const reportSchema = z
  .object({
    title: z.string().min(1).max(150),
    description: z.string().min(1).max(1000),
    auditNotes: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
    category: z.string().min(1),
    latitude: coordinateSchema(-90, 90),
    longitude: coordinateSchema(-180, 180),
    locationAddress: z.string().optional(),
    photoUrl: z.string().optional(),
    status: z
      .enum([
        "Pending",
        "PENDING_AI",
        "Approved",
        "In_Progress",
        "Resolved",
        "Rejected",
      ])
      .optional(),
    priority: z.enum(["Low", "Medium", "High"]).optional(),
  })
  .passthrough();

const verificationSchema = z
  .object({
    latitude: coordinateSchema(-90, 90),
    longitude: coordinateSchema(-180, 180),
    notes: z.string().max(500).optional(),
    auditNotes: z.string().max(500).optional(),
    reportId: z.string().optional(),
  })
  .passthrough();

/**
 * Validates citizen report payload structure and normalizes latitude/longitude.
 * Prevents mass assignment on internal identifiers and relations.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void}
 */
function validateReportPayload(req, res, next) {
  req.body = sanitize(req.body);

  const forbiddenField = assertNoForbiddenFields(req.body);
  if (forbiddenField) {
    return res.status(400).json({
      success: false,
      message: `Field '${forbiddenField}' cannot be assigned directly`,
    });
  }

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

  req.body = { ...req.body, ...result.data };
  return next();
}

/**
 * Validates verification payload parameters submitted by field officers via browser.
 * Enforces strict coordinate validation [-90..90, -180..180] and optional notes.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void}
 */
function validateVerificationPayload(req, res, next) {
  req.body = sanitize(req.body);

  const forbiddenField = assertNoForbiddenFields(req.body);
  if (forbiddenField) {
    return res.status(400).json({
      success: false,
      message: `Field '${forbiddenField}' cannot be assigned directly`,
    });
  }

  const result = verificationSchema.safeParse(req.body);
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

  req.body = { ...req.body, ...result.data };
  if (req.body.notes && !req.body.auditNotes) {
    req.body.auditNotes = req.body.notes;
  }
  return next();
}

module.exports = {
  coordinateSchema,
  validateReportPayload,
  validateVerificationPayload,
};
