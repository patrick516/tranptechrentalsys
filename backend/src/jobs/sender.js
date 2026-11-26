const Message = require("../models/Message");

async function processQueuedMessages(limit = 50) {
  const queued = await Message.find({ status: "QUEUED" }).limit(limit);
  let processed = 0;
  for (const msg of queued) {
    msg.status = "SENT";
    msg.sentAt = new Date();
    await msg.save();
    processed += 1;
  }
  return { processed };
}

module.exports = { processQueuedMessages };
