const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const {
  createCustomerSchema,
  updateCustomerSchema,
  statusChangeSchema,
  addContactSchema,
  updateContactSchema,
} = require("../validators/customers.validator");
const customersController = require("../controllers/customers.controller");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  customersController.list,
);
router.post(
  "/",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: createCustomerSchema }),
  customersController.create,
);
router.get(
  "/:id",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  customersController.detail,
);
router.patch(
  "/:id",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: updateCustomerSchema }),
  customersController.update,
);
router.post(
  "/:id/status",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: statusChangeSchema }),
  customersController.updateStatus,
);
router.post(
  "/:id/contacts",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: addContactSchema }),
  customersController.createContact,
);
router.patch(
  "/:id/contacts/:contactId",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: updateContactSchema }),
  customersController.updateContact,
);
router.delete(
  "/:id/contacts/:contactId",
  requireRoles("ADMIN", "STAFF"),
  customersController.removeContact,
);
router.delete("/:id", requireRoles("ADMIN"), customersController.archive);

module.exports = router;
