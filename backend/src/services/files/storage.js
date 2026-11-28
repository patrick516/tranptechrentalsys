// One place that stores and reads files: Cloudinary when the keys are set in
// .env, local disk under ./uploads otherwise. Every other module talks to
// this file, so switching providers is a one-line change here.
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const storageConfig = require("../../config/storage");
const { AppError } = require("../../middleware/errors");
const logger = require("../../lib/logger");

let cloudinary = null;

function getCloudinary() {
  if (cloudinary) return cloudinary;
  const cfg = storageConfig.cloudinary;
  if (!cfg.cloudName || !cfg.apiKey || !cfg.apiSecret) return null;
  const mod = require("cloudinary");
  mod.config({
    cloud_name: cfg.cloudName,
    api_key: cfg.apiKey,
    api_secret: cfg.apiSecret,
  });
  cloudinary = mod.v2;
  return cloudinary;
}

function isCloudinaryConfigured() {
  return getCloudinary() !== null;
}

function localPath(relativePath) {
  const base = storageConfig.localUploadDir;
  const resolved = path.resolve(base, relativePath);
  if (!resolved.startsWith(base)) {
    throw new AppError("Invalid file path", 400, "VALIDATION_ERROR");
  }
  return resolved;
}

// Stores a Buffer and returns the fields stored on the Document record.
async function uploadBuffer({ buffer, folder, fileName, mimeType }) {
  const cld = getCloudinary();
  const safeFolder = String(folder || "general");
  const baseName = path
    .basename(String(fileName || "file"))
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  if (cld) {
    const result = await new Promise((resolve, reject) => {
      const stream = cld.uploader.upload_stream(
        {
          folder: `tranptech/${process.env.APP_ENV || "dev"}/${safeFolder}`,
          public_id: baseName.replace(/\.[^.]+$/, ""),
          resource_type: "auto",
          overwrite: false,
        },
        (err, res) => (err ? reject(err) : resolve(res)),
      );
      stream.end(buffer);
    });
    return {
      storageProvider: "CLOUDINARY",
      publicId: result.public_id || "",
      url: result.secure_url || result.url || "",
      sizeBytes: Number(result.bytes) || buffer.length,
      mimeType: mimeType || result.resource_type || "application/octet-stream",
    };
  }

  const relative = path.join(safeFolder, `${Date.now()}_${baseName}`);
  const target = localPath(relative);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, buffer);
  return {
    storageProvider: "LOCAL",
    publicId: relative,
    url: `/api/v1/files/local/${relative.split(path.sep).join("/")}`,
    sizeBytes: buffer.length,
    mimeType: mimeType || "application/octet-stream",
  };
}

// Returns { buffer, mimeType, fileName } for a stored document.
async function readDocument(doc) {
  const cld = getCloudinary();
  const extension = (String(doc.title || "file").split(".").pop() || "").slice(0, 5);
  const fileName = `${String(doc.title || "file").replace(/[^a-zA-Z0-9._ -]/g, "_")}`;

  if (doc.storageProvider === "LOCAL") {
    const target = localPath(doc.publicId);
    try {
      const buffer = await fsp.readFile(target);
      return {
        buffer,
        mimeType: doc.mimeType || "application/octet-stream",
        fileName: fileName || path.basename(target),
      };
    } catch (err) {
      logger.warn("Local file missing", { path: doc.publicId, message: err.message });
      throw new AppError("File unavailable", 404, "FILE_UNAVAILABLE");
    }
  }

  const url = doc.url;
  if (cld && doc.publicId) {
    // Prefer a signed download URL, fall back to a plain fetch of doc.url.
    try {
      const signed = cld.utils.private_download_url(doc.publicId, {
        expires_at: Math.floor(Date.now() / 1000) + 300,
      });
      const res = await fetch(signed);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        return {
          buffer,
          mimeType: doc.mimeType || res.headers.get("content-type") || "application/octet-stream",
          fileName,
        };
      }
    } catch (err) {
      logger.warn("Signed Cloudinary URL failed", { message: err.message });
    }
  }

  if (!url) throw new AppError("File unavailable", 404, "FILE_UNAVAILABLE");

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      buffer,
      mimeType:
        doc.mimeType || res.headers.get("content-type") || "application/octet-stream",
      fileName,
    };
  } catch (err) {
    logger.warn("Remote file fetch failed", { url, message: err.message });
    throw new AppError("File unavailable", 404, "FILE_UNAVAILABLE");
  }
}

function removeLocal(relativePath) {
  try {
    fs.unlinkSync(localPath(relativePath));
  } catch {
    /* nothing to remove */
  }
}

module.exports = {
  isCloudinaryConfigured,
  uploadBuffer,
  readDocument,
  removeLocal,
};
