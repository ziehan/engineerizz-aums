const { generateJson } = require("../adapters/geminiAdapter");
const { intake } = require("../prompts/systemPrompts");

/**
 * Expected JSON response schema for citizen report intake and fraud validation.
 */
const responseSchema = {
  type: "OBJECT",
  properties: {
    isValid: { type: "BOOLEAN" },
    validityConfidence: { type: "NUMBER", minimum: 0, maximum: 1 },
    isDuplicate: { type: "BOOLEAN" },
    deduplicationConfidence: { type: "NUMBER", minimum: 0, maximum: 1 },
    parentReportId: { type: "STRING", nullable: true },
    priorityScore: { type: "INTEGER", minimum: 1, maximum: 100 },
    urgencyLevel: {
      type: "STRING",
      enum: ["Low", "Medium", "High", "Critical"],
    },
    category: { type: "STRING" },
    reasoning: { type: "STRING" },
  },
  required: [
    "isValid",
    "validityConfidence",
    "isDuplicate",
    "deduplicationConfidence",
    "parentReportId",
    "priorityScore",
    "urgencyLevel",
    "category",
    "reasoning",
  ],
};

/**
 * Evaluates citizen report validity, duplication, category, and urgency score via Gemini.
 *
 * @param {Object} data - Incident report details and optional image evidence.
 * @param {string} data.title - Title of the report.
 * @param {string} data.description - Description of the reported issue.
 * @param {string} [data.category] - Proposed issue category.
 * @param {string} [data.imageBase64] - Base64 encoded photo evidence.
 * @param {string} [data.photoUrl] - URL reference to photo evidence.
 * @param {Array<Object>} [data.existingReports] - Candidate reports for deduplication.
 * @returns {Promise<Object>} Validated intake analysis results.
 * @throws {TypeError} If payload is not an object.
 */
async function runIntakeAgent(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("Intake agent data must be an object");
  }
  try {
    const result = await generateJson(intake, data, {
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      responseSchema,
      images: [data.imageBase64 || data.photoBase64 || data.photoUrl].filter(
        Boolean,
      ),
    });
    if (!result.isDuplicate && result.parentReportId !== null) {
      throw new Error("parentReportId must be null when isDuplicate is false");
    }
    return result;
  } catch (error) {
    console.error("[aums-ai-services] Intake agent failed:", error);
    throw error;
  }
}

module.exports = runIntakeAgent;
module.exports.runIntakeAgent = runIntakeAgent;
module.exports.responseSchema = responseSchema;
