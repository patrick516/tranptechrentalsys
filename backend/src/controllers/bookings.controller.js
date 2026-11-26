const bookingsService = require("../services/bookings.service");

async function list(req, res, next) {
  try {
    const items = await bookingsService.listBookings(req.query);
    return res.status(200).json({ data: items });
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    const result = await bookingsService.getBookingDetail(req.params.id);
    return res.status(200).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await bookingsService.createBooking(req.body, req.user, req);
    return res.status(201).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function pickup(req, res, next) {
  try {
    const booking = await bookingsService.pickupBooking(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return res.status(200).json({ data: booking });
  } catch (err) {
    return next(err);
  }
}

async function returnChairs(req, res, next) {
  try {
    const booking = await bookingsService.returnBooking(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return res.status(200).json({ data: booking });
  } catch (err) {
    return next(err);
  }
}

async function extend(req, res, next) {
  try {
    const result = await bookingsService.extendBooking(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return res.status(200).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const booking = await bookingsService.cancelBooking(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return res.status(200).json({ data: booking });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  detail,
  create,
  pickup,
  returnChairs,
  extend,
  cancel,
};
