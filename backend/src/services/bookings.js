// Bookings service helper for listing and querying bookings
const Booking = require("../models/Booking");

async function listBookings(filter = {}) {
  return Booking.find(filter)
    .populate("customerId", "code name status")
    .sort({ createdAt: -1 })
    .lean();
}

module.exports = { listBookings };
