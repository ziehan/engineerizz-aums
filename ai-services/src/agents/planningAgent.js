const { chat, validateResponse } = require("../adapters/ollamaAdapter");
const { generateJson } = require("../adapters/geminiAdapter");
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
 * Validates operational planning result against schema and ensures 3 to 5 action steps.
 *
 * @param {Object} result - Raw planning model response.
 * @returns {Object} Validated and normalized planning response.
 * @throws {Error} If action steps count is outside 3-5 range.
 */
function validatePlanningResponse(result) {
  const validated = validateResponse(result, responseSchema);
  if (validated.actionSteps.length < 3 || validated.actionSteps.length > 5) {
    throw new Error("actionSteps must contain between 3 and 5 steps");
  }
  return validated;
}

/**
 * Plans field maintenance operations and assigns responsible government agencies.
 * Uses Ollama primarily with automated failover to Gemini.
 *
 * @param {Object} reportData - Validated incident report details.
 * @param {Array<Object>} [ragContext=[]] - Historical or nearby resolved incident context.
 * @returns {Promise<Object>} Validated operational dispatch plan.
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
    try {
      const result = await chat(
        [
          {
            role: "system",
            content: `${planning}\n${bahasaIndonesiaRule}`,
          },
          {
            role: "user",
            content: `<user_data>\n${JSON.stringify(input)}\n</user_data>`,
          },
        ],
        {
          model: process.env.OLLAMA_MODEL || "qwen2.5:3b",
        },
      );
      return validatePlanningResponse(result);
    } catch (ollamaError) {
      console.warn(
        "[aums-ai-services] Ollama planning failed; falling back to Gemini:",
        ollamaError.message,
      );
      const geminiResult = await generateJson(
        `${planning}\n${bahasaIndonesiaRule}`,
        input,
        {
          model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
          responseSchema,
        },
      );
      return validatePlanningResponse(geminiResult);
    }
  } catch (error) {
    console.error("[aums-ai-services] Planning agent failed:", error);
    throw error;
  }
}

module.exports = runPlanningAgent;
module.exports.runPlanningAgent = runPlanningAgent;
module.exports.responseSchema = responseSchema;
module.exports.targetAgencies = TARGET_AGENCIES;
