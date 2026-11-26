const path = require("path");

module.exports = {
  provider: process.env.STORAGE_PROVIDER || "local",
  localUploadDir: path.resolve(process.cwd(), "uploads"),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
};
