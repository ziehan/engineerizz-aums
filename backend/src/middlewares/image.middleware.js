const multer = require("multer");
const sharp = require("sharp");

/**
 * Multer memory storage configuration for single image uploads.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(new Error("Only image uploads are supported"));
    }
    return callback(null, true);
  },
});

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
    if (!req.file) return next();
    req.processedImage = await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1080, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
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
  uploadImage: upload.single("image"),
  processImage,
};
