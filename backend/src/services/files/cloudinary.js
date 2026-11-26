const storageConfig = require("../../config/storage");

function isCloudinaryConfigured() {
  return Boolean(
    storageConfig.cloudinary.cloudName &&
    storageConfig.cloudinary.apiKey &&
    storageConfig.cloudinary.apiSecret,
  );
}

module.exports = { isCloudinaryConfigured };
