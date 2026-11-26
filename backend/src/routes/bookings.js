// Booking routes (/api/v1/bookings)
const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const {
  createBookingSchema,
  pickupBookingSchema,
  returnBookingSchema,
  extendBookingSchema,
  cancelBookingSchema,
} = require("../validators/bookings.validator");
const bookingsController = require("../controllers/bookings.controller");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  bookingsController.list,
);
router.post(
  "/",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: createBookingSchema }),
  bookingsController.create,
);
router.get(
  "/:id",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  bookingsController.detail,
);
router.post(
  "/:id/pickup",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: pickupBookingSchema }),
  bookingsController.pickup,
);
router.post(
  "/:id/return",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: returnBookingSchema }),
  bookingsController.returnChairs,
);
router.post(
  "/:id/extend",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: extendBookingSchema }),
  bookingsController.extend,
);
router.post(
  "/:id/cancel",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: cancelBookingSchema }),
  bookingsController.cancel,
);

module.exports = router;
