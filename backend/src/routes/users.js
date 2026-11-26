const express = require("express");
const { z } = require("zod");
const argon2 = require("argon2");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const User = require("../models/User");
const { AppError } = require("../middleware/errors");

const router = express.Router();

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(10).max(128),
  role: z.enum(["ADMIN", "STAFF", "VIEWER"]).default("STAFF"),
});

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]),
});

router.use(requireAuth, requireRoles("ADMIN"));

router.get("/", async (_req, res, next) => {
  try {
    const users = await User.find({}, { passwordHash: 0 })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ data: users });
  } catch (err) {
    return next(err);
  }
});

router.post(
  "/",
  validate({ body: createUserSchema }),
  async (req, res, next) => {
    try {
      const exists = await User.findOne({ email: req.body.email }).lean();
      if (exists) {
        return next(
          new AppError("Email already in use", 409, "DUPLICATE_EMAIL"),
        );
      }
      const passwordHash = await argon2.hash(req.body.password, {
        type: argon2.argon2id,
      });
      const created = await User.create({
        name: req.body.name,
        email: req.body.email,
        passwordHash,
        role: req.body.role,
        status: "ACTIVE",
      });
      const safeUser = created.toObject();
      delete safeUser.passwordHash;
      return res.status(201).json({ data: safeUser });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  "/:id/status",
  validate({ body: statusSchema }),
  async (req, res, next) => {
    try {
      const updated = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { status: req.body.status } },
        { returnDocument: "after", projection: { passwordHash: 0 } },
      ).lean();
      if (!updated) {
        return next(new AppError("User not found", 404, "NOT_FOUND"));
      }
      return res.status(200).json({ data: updated });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
