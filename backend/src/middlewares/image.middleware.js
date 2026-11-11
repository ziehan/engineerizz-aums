const multer = require("multer");
const sharp = require("sharp");

/**
 * Allowed MIME types for image uploads strictly supported by AUMS and Sharp.
 */
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const UNSUPPORTED_FORMAT_MESSAGE =
  "Format file tidak didukung. Harap unggah foto dengan format JPEG, PNG, atau WebP.";

/**
 * File filter validating that incoming multipart file exhibits an allowed image MIME type.
 *
 * @description
 * Enforces strict MIME whitelist checking against ALLOWED_MIME_TYPES (image/jpeg, image/png, image/webp).
 * Rejects video formats, executables, or arbitrary binary uploads with an Indonesian error message.
 *
 * @param {import("express").Request} _req - Express request.
 * @param {Express.Multer.File} file - Multer uploaded file metadata.
 * @param {Function} callback - Multer callback(err, accept).
 * @returns {void}
 */
function fileFilter(_req, file, callback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error(UNSUPPORTED_FORMAT_MESSAGE);
    error.statusCode = 400;
    error.code = "INVALID_FILE_TYPE";
    return callback(error);
  }
  return callback(null, true);
}

/**
 * Multer memory storage configuration with strict MIME type filtering and 10MB file limit.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter,
});

const multerSingleImage = upload.single("image");

/**
 * Safe Multer single image upload middleware catching fileFilter and size errors.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {void}
 */
function uploadImage(req, res, next) {
  multerSingleImage(req, res, (err) => {
    if (err) {
      if (
        err.code === "INVALID_FILE_TYPE" ||
        err.message === UNSUPPORTED_FORMAT_MESSAGE
      ) {
        return res.status(400).json({
          success: false,
          message: UNSUPPORTED_FORMAT_MESSAGE,
        });
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Ukuran file melebihi batas maksimal 10MB.",
        });
      }
      err.statusCode = err.statusCode || 400;
      return next(err);
    }
    return next();
  });
}

/**
 * Middleware that auto-rotates, resizes to max 1080px width, and compresses uploaded images into JPEG buffers.
 *
 * @param {import("express").Request} req - Express request containing uploaded file.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {Promise<void>}
 */
async function processImage(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) return next();
    req.processedImage = await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1080, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    req.processedImageBuffer = req.processedImage;
    req.processedImageBase64 = req.processedImage.toString("base64");
    req.processedImageMimeType = "image/jpeg";
    return next();
  } catch (error) {
    error.statusCode = error.statusCode || 422;
    error.code = error.code || "INVALID_IMAGE_PAYLOAD";
    return next(error);
  }
}

module.exports = {
  uploadImage,
  processImage,
  fileFilter,
  ALLOWED_MIME_TYPES,
  UNSUPPORTED_FORMAT_MESSAGE,
};
