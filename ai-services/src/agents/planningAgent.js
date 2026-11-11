const { generateJson, validateResponse } = require("../adapters/geminiAdapter");
const { planning, bahasaIndonesiaRule } = require("../prompts/systemPrompts");

/**
 * List of recognized municipal agency destinations for work order routing.
 */
const TARGET_AGENCIES = [
  "Dinas Sumber Daya Air",
  "Dinas Bina Marga",
  "Dinas Lingkungan Hidup",
  "Dinas Perhubungan",
  "Dinas Pertamanan dan Hutan Kota",
];

/**
 * JSON schema for operational dispatch planning responses.
 */
const responseSchema = {
  type: "OBJECT",
  properties: {
    targetAgency: { type: "STRING", enum: TARGET_AGENCIES },
    agencyConfidence: {
      type: "NUMBER",
      minimum: 0,
      maximum: 1,
      normalizePercentage: true,
    },
    planConfidence: {
      type: "NUMBER",
      minimum: 0,
      maximum: 1,
      normalizePercentage: true,
    },
    confidenceScore: {
      type: "NUMBER",
      minimum: 0,
      maximum: 1,
      normalizePercentage: true,
    },
    estimatedDays: { type: "INTEGER", minimum: 0 },
    actionSteps: { type: "ARRAY", items: { type: "STRING" } },
    dispatchReason: { type: "STRING" },
  },
  required: [
    "targetAgency",
    "agencyConfidence",
    "planConfidence",
    "confidenceScore",
    "estimatedDays",
    "actionSteps",
    "dispatchReason",
  ],
};

/**
 * @typedef {Object} PlanningAgentOutput
 * @property {string} targetAgency - One of 5 SKPD DKI Jakarta (e.g. "Dinas Bina Marga", "Dinas Sumber Daya Air").
 * @property {number} agencyConfidence - Model confidence score between 0.0 and 1.0 for agency routing.
 * @property {number} planConfidence - Model confidence score between 0.0 and 1.0 for action steps.
 * @property {number} confidenceScore - Overall normalized planning confidence between 0.0 and 1.0.
 * @property {number} estimatedDays - Estimated resolution timeline in integer days.
 * @property {Array<string>} actionSteps - Exactly 3 to 5 operational field action steps in Bahasa Indonesia.
 * @property {string} dispatchReason - Administrative dispatch justification in Bahasa Indonesia.
 */

/**
 * Validates operational planning result against schema and ensures 3 to 5 action steps.
 *
 * @description
 * Enforces schema constraints and ensures the array of operational field steps
 * contains between 3 and 5 items.
 *
 * @param {Object} result - Raw planning model response.
 * @returns {PlanningAgentOutput} Validated and normalized planning response.
 * @throws {Error} If actionSteps count is less than 3 or greater than 5.
 */
function validatePlanningResponse(result) {
  const validated = validateResponse(result, responseSchema);
  if (validated.actionSteps.length < 3 || validated.actionSteps.length > 5) {
    throw new Error("actionSteps must contain between 3 and 5 steps");
  }
  return validated;
}

/**
 * Plans field maintenance operations and assigns responsible government agencies via Gemini.
 *
 * @description
 * Planning & Dispatch Agent for AUMS:
 * 1. Analyzes validated report details and provided RAG context (historical resolved incidents within 100m).
 * 2. Assigns target SKPD agency from 5 recognized DKI municipal departments.
 * 3. Synthesizes 3 to 5 chronological field action steps.
 * 4. Estimates required repair days and records administrative dispatch justification.
 *
 * @param {Object} reportData - Validated incident report details.
 * @param {Array<Object>} [ragContext=[]] - Historical or nearby resolved incident context from pgvector/PostGIS.
 * @returns {Promise<PlanningAgentOutput>} Validated operational dispatch plan.
 * @throws {TypeError} If reportData is not a valid object.
 */
async function runPlanningAgent(reportData, ragContext = []) {
  if (
    !reportData ||
    typeof reportData !== "object" ||
    Array.isArray(reportData)
  ) {
    throw new TypeError("Planning agent report data must be an object");
  }
  const context = Array.isArray(ragContext) ? ragContext : [ragContext];
  const input = { report: reportData, ragContext: context };
  try {
    const geminiResult = await generateJson(
      `${planning}\n${bahasaIndonesiaRule}`,
      input,
      {
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        fallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash",
        responseSchema,
      },
    );
    return validatePlanningResponse(geminiResult);
  } catch (error) {
    console.error("[aums-ai-services] Planning agent failed:", error);
    throw error;
  }
}

module.exports = runPlanningAgent;
module.exports.runPlanningAgent = runPlanningAgent;
module.exports.responseSchema = responseSchema;
module.exports.targetAgencies = TARGET_AGENCIES;
