const { generateJson } = require("../adapters/geminiAdapter");
const { intake, bahasaIndonesiaRule } = require("../prompts/systemPrompts");

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
 * @typedef {Object} IntakeAgentOutput
 * @property {boolean} isValid - Whether the reported issue represents genuine urban public infrastructure damage.
 * @property {number} validityConfidence - Model confidence score between 0.0 and 1.0 for damage validity.
 * @property {boolean} isDuplicate - True if matching report is found within 100 meters.
 * @property {number} deduplicationConfidence - Model confidence score between 0.0 and 1.0 for duplication.
 * @property {string|null} parentReportId - UUID of matching parent report if duplicate; null otherwise.
 * @property {number} priorityScore - Computed priority integer between 1 and 100.
 * @property {"Low"|"Medium"|"High"|"Critical"} urgencyLevel - Normalized urgency tier.
 * @property {string} category - Classified infrastructure defect category.
 * @property {string} reasoning - Evaluation reasoning narrative in Bahasa Indonesia.
 */

/**
 * Evaluates citizen report validity, duplication, category, and urgency score via Gemini.
 *
 * @description
 * Intake & Visual Fraud Detection Agent for AUMS:
 * 1. Analyzes incoming citizen complaint title, description, and attached photo.
 * 2. Compares against existingReports candidate array located within 100 meters.
 * 3. Detects visual duplication anomalies (identical staging, vehicle license plate, or camera angle).
 * 4. Generates structured JSON output compliant with responseSchema.
 *
 * @param {Object} data - Incident report details and optional image evidence.
 * @param {string} data.title - Title of the report.
 * @param {string} data.description - Description of the reported issue.
 * @param {string} [data.category] - Proposed issue category.
 * @param {string} [data.imageBase64] - Base64 encoded photo evidence.
 * @param {string} [data.photoUrl] - URL reference to photo evidence.
 * @param {Array<Object>} [data.existingReports] - Candidate reports for deduplication.
 * @returns {Promise<IntakeAgentOutput>} Validated intake analysis results.
 * @throws {TypeError} If payload is not an object.
 * @throws {Error} If parentReportId is populated when isDuplicate is false.
 */
async function runIntakeAgent(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("Intake agent data must be an object");
  }
  try {
    const candidateImages = [];
    if (Array.isArray(data.existingReports)) {
      for (const candidate of data.existingReports) {
        const cImg =
          candidate.imageBase64 ||
          candidate.photoBase64 ||
          candidate.photoUrl ||
          candidate.photo;
        if (cImg) {
          candidateImages.push(cImg);
        }
      }
    }

    const currentImage =
      data.imageBase64 || data.photoBase64 || data.photoUrl || null;
    const images = [currentImage, ...candidateImages.slice(0, 3)].filter(
      Boolean,
    );

    const sanitizedExistingReports = Array.isArray(data.existingReports)
      ? data.existingReports.map((candidate, idx) => {
          const {
            imageBase64: _ib,
            photoBase64: _pb,
            embedding: _emb,
            ...rest
          } = candidate || {};
          if (
            typeof rest.photoUrl === "string" &&
            rest.photoUrl.startsWith("data:")
          ) {
            rest.photoUrl = `[inline-candidate-image-${idx + 1}]`;
          }
          return rest;
        })
      : [];

    const {
      imageBase64: _imgBase64,
      photoBase64: _photoBase64,
      embedding: _embedding,
      ...restData
    } = data;
    const promptData = {
      ...restData,
      ...(typeof restData.photoUrl === "string" &&
      restData.photoUrl.startsWith("data:")
        ? { photoUrl: "[inline-report-image]" }
        : {}),
      existingReports: sanitizedExistingReports,
    };

    const result = await generateJson(
      `${intake}\n${bahasaIndonesiaRule}`,
      promptData,
      {
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        responseSchema,
        images,
      },
    );
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
