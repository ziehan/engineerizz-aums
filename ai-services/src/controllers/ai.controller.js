const { runIntakeAgent } = require("../agents/intakeAgent");
const { runPlanningAgent } = require("../agents/planningAgent");
const { runVerificationAgent } = require("../agents/verificationAgent");

/**
 * Identifies required payload attributes that are missing, null, or empty strings.
 *
 * @param {Object} body - Request body object.
 * @param {Array<string>} fields - List of mandatory field names.
 * @returns {Array<string>} Array of missing field identifiers.
 */
function missingFields(body, fields) {
  return fields.filter((field) => {
    const value = body?.[field];
    return (
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim())
    );
  });
}

/**
 * Returns a standardized error response detailing missing required fields.
 *
 * @param {import("express").Response} res - Express response object.
 * @param {Array<string>} fields - Array of missing field keys.
 * @returns {import("express").Response} 200 formatted validation failure response.
 */
function validationResponse(res, fields) {
  return res.status(200).json({
    success: false,
    fallbackUsed: false,
    usedProvider: "none",
    executionTimeMs: 0,
    error: `Missing required fields: ${fields.join(", ")}`,
    data: null,
  });
}

/**
 * Returns a safe fallback response when an AI agent encounters unrecoverable errors.
 *
 * @param {import("express").Response} res - Express response object.
 * @param {Error} error - Encountered error.
 * @param {string} agentName - Name of the failing agent for diagnosis.
 * @returns {import("express").Response} Formatted service degradation response.
 */
function controllerFailure(res, error, agentName) {
  console.error(`[aums-ai-services] ${agentName} controller error:`, error);
  return res.status(200).json({
    success: false,
    fallbackUsed: true,
    usedProvider: "safe-default",
    executionTimeMs: 0,
    error: "AI service temporarily unavailable",
    data: null,
  });
}

/**
 * Handles incoming citizen report validation, deduplication, and triage analysis.
 *
 * @param {import("express").Request} req - Express request with intake payload.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<import("express").Response>} Intake processing outcome.
 */
async function validate(req, res) {
  const missing = missingFields(req.body, [
    "title",
    "description",
    "category",
    "locationAddress",
    "latitude",
    "longitude",
    "existingReports",
  ]);
  if (missing.length) return validationResponse(res, missing);
  try {
    return res.status(200).json(await runIntakeAgent(req.body));
  } catch (error) {
    return controllerFailure(res, error, "Intake");
  }
}

/**
 * Handles operational planning, agency assignment, and repair SLA estimation.
 *
 * @param {import("express").Request} req - Express request with planning payload.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<import("express").Response>} Planning assessment outcome.
 */
async function plan(req, res) {
  const missing = missingFields(req.body, [
    "reportId",
    "title",
    "description",
    "category",
    "locationAddress",
    "duplicateCount",
  ]);
  if (missing.length) return validationResponse(res, missing);
  try {
    return res
      .status(200)
      .json(await runPlanningAgent(req.body, req.body.ragContext));
  } catch (error) {
    return controllerFailure(res, error, "Planning");
  }
}

/**
 * Handles field repair visual verification and anti-fraud inspection.
 *
 * @param {import("express").Request} req - Express request with verification payload.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<import("express").Response>} Verification audit outcome.
 */
async function verify(req, res) {
  const missing = missingFields(req.body, [
    "beforePhotoUrl",
    "afterPhotoUrl",
    "reportDescription",
  ]);
  if (missing.length) return validationResponse(res, missing);
  try {
    return res.status(200).json(await runVerificationAgent(req.body));
  } catch (error) {
    return controllerFailure(res, error, "Verification");
  }
}

module.exports = { validate, plan, verify };
