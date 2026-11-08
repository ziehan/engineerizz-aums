const MAX_TEXT_LENGTH = 5000;
const MAX_BASE64_LENGTH = 9 * 1024 * 1024;
const injectionPatterns = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous| prior)\s+instructions?/gi,
  /forget\s+(all\s+)?previous\s+instructions?/gi,
  /system\s+prompt\s*(override|leak|reveal|:)/gi,
  /you\s+are\s+now\s+(a|an)\b/gi,
  /(?:developer|assistant|system)\s*(?:message|role)\s*:/gi,
  /jailbreak/gi,
];

/**
 * Removes prompt injection attempts and control characters while preserving text shape.
 *
 * @param {string} value - Raw text string from client.
 * @returns {string} Sanitized string safe for model reasoning.
 */
function sanitizeText(value) {
  return injectionPatterns
    .reduce(
      (sanitized, pattern) => sanitized.replace(pattern, "[removed]"),
      value,
    )
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

/**
 * Recursively sanitizes nested request values while bypassing Base64 data strings.
 *
 * @param {*} value - Target input value.
 * @param {string} [key=""] - Field property key name.
 * @returns {*} Sanitized data structure.
 */
function sanitizeValue(value, key = "") {
  if (typeof value === "string") {
    if (key.toLowerCase().includes("base64")) return value;
    return sanitizeText(value);
  }
  if (Array.isArray(value))
    return value.map((item) => sanitizeValue(item, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, item]) => [
        nestedKey,
        sanitizeValue(item, nestedKey),
      ]),
    );
  }
  return value;
}

/**
 * Express middleware that rejects oversized payload bodies and sanitizes untrusted input.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void}
 */
function sanitizeRequest(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res
      .status(400)
      .json({ success: false, error: "Request body must be a JSON object" });
  }
  const base64Fields = ["imageBase64", "proofPhotoBase64"];
  const oversizedField = base64Fields.find(
    (field) =>
      typeof req.body[field] === "string" &&
      req.body[field].length > MAX_BASE64_LENGTH,
  );
  if (oversizedField) {
    return res
      .status(413)
      .json({ success: false, error: `${oversizedField} is too large` });
  }
  req.body = sanitizeValue(req.body);
  return next();
}

module.exports = { sanitizeRequest, sanitizeText };
