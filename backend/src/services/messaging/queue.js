// Messaging queue helper
const Message = require("../../models/Message");

async function enqueueMessage(payload) {
  return Message.create(payload);
}

module.exports = { enqueueMessage };
