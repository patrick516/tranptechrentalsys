const Document = require("../../models/Document");
const { sanitizeFolder } = require("./folders");

async function createDocumentRecord(data, userId) {
  return Document.create({
    ...data,
    folder: sanitizeFolder(data.folder),
    uploadedBy: userId,
  });
}

module.exports = { createDocumentRecord };
