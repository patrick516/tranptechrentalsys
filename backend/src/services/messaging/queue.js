// Shared queue helpers for outbound messages (SMS and WhatsApp together).
const Message = require("../../models/Message");

async function enqueueMessage(payload) {
  return Message.create(payload);
}

async function nextQueued(limit = 50) {
  return Message.find({ status: "QUEUED" })
    .sort({ createdAt: 1 })
    .limit(limit);
}

module.exports = { enqueueMessage, nextQueued };
