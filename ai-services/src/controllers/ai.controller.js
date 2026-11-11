const { runIntakeAgent } = require("../agents/intakeAgent");
const { runPlanningAgent } = require("../agents/planningAgent");
const { runVerificationAgent } = require("../agents/verificationAgent");
const { generateEmbedding } = require("../adapters/geminiAdapter");

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
 * @description
 * Handles POST /api/v1/ai/validate (and /intake) endpoint.
 * Validates mandatory fields: title, description, category, locationAddress, latitude, longitude, existingReports.
 * Executes IntakeAgent to verify physical defect genuineness, estimate priorityScore (1-100),
 * and detect visual/spatial duplications (< 100m).
 *
 * @param {import("express").Request} req - Express request with intake payload.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<import("express").Response>} Sends HTTP 200 JSON with intake assessment or safe fallback.
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
 * @description
 * Handles POST /api/v1/ai/plan (and /planning) endpoint.
 * Validates mandatory fields: reportId, title, description, category, locationAddress, duplicateCount.
 * Executes PlanningAgent incorporating historical RAG context to determine responsible SKPD agency,
 * produce 3-5 operational field steps, and estimate resolution days.
 *
 * @param {import("express").Request} req - Express request with planning payload and RAG context.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<import("express").Response>} Sends HTTP 200 JSON with planning assessment or safe fallback.
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
 * @description
 * Handles POST /api/v1/ai/verify (and /verification) endpoint.
 * Validates mandatory fields: beforePhotoUrl, afterPhotoUrl, reportDescription.
 * Executes VerificationAgent comparing Before and After photos, verifying permanent landmark matching,
 * checking for the presence of the HTML5 Canvas coordinate watermark on the After photo,
 * and rejecting digital screen spoofing (moiré patterns/bezels) or recycled images.
 *
 * @param {import("express").Request} req - Express request with before and after photo references.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<import("express").Response>} Sends HTTP 200 JSON with verification audit result or safe fallback.
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

/**
 * Handles vector embedding generation using Gemini text-embedding-004 (768 dimensions).
 *
 * @description
 * Handles POST /api/v1/ai/embed (and /embedding) endpoint.
 * Validates non-empty text input and calls generateEmbedding to produce a 768-dimensional float vector.
 *
 * @param {import("express").Request} req - Express request with text payload (`text`, `content`, or `input`).
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<import("express").Response>} Sends HTTP 200 JSON with embedding vector and dimensionality.
 */
async function embed(req, res) {
  const text = req.body?.text || req.body?.content || req.body?.input;
  if (!text || typeof text !== "string" || !text.trim()) {
    return validationResponse(res, ["text"]);
  }
  try {
    const embedding = await generateEmbedding(text.trim());
    return res.status(200).json({
      success: true,
      embedding,
      dimensions: embedding.length,
    });
  } catch (error) {
    return controllerFailure(res, error, "Embedding");
  }
}

module.exports = { validate, plan, verify, embed };
