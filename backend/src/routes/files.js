const express = require("express");
const { z } = require("zod");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const { AppError } = require("../middleware/errors");
const Document = require("../models/Document");
const Customer = require("../models/Customer");
const { createDocumentRecord } = require("../services/files/documents");
const { sanitizeFolder, extensionFor } = require("../services/files/folders");
const {
  uploadBuffer,
  readDocument,
} = require("../services/files/storage");

const router = express.Router();

const createFileSchema = z.object({
  customerId: z.string().trim().optional().nullable().default(null),
  bookingId: z.string().trim().optional().nullable().default(null),
  kind: z.enum([
    "NATIONAL_ID",
    "CONTRACT",
    "PAYMENT_PROOF",
    "REPORT_EXPORT",
    "OTHER",
  ]),
  folder: z.string().trim().max(200).optional().default("general"),
  title: z.string().trim().min(1).max(200),
  storageProvider: z.enum(["CLOUDINARY", "LOCAL"]).optional().default("LOCAL"),
  publicId: z.string().trim().max(300).optional().default(""),
  url: z.string().trim().min(1).max(1000),
  mimeType: z
    .string()
    .trim()
    .max(120)
    .optional()
    .default("application/octet-stream"),
  sizeBytes: z.number().int().nonnegative().optional().default(0),
});

const listQuerySchema = z.object({
  customerId: z.string().trim().optional(),
  bookingId: z.string().trim().optional(),
  kind: z.string().trim().optional(),
  path: z.string().trim().max(300).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z
    .string()
    .regex(/^\d{1,4}$/)
    .optional(),
});

router.use(requireAuth);

// ---------------------------------------------------------------------------
// Folder tree (spec 9.6): built from the document records themselves
// ---------------------------------------------------------------------------
async function buildTree() {
  const [docs, customers] = await Promise.all([
    Document.find({}).sort({ createdAt: -1 }).lean(),
    Customer.find({}).select("code name archivedAt").lean(),
  ]);

  const customersById = new Map(
    customers.map((c) => [String(c._id), c]),
  );

  const makeNode = (type, id, label, path) => ({
    id,
    type,
    label,
    path,
    fileCount: 0,
    children: [],
  });

  const roots = [
    makeNode("root", "customers", "Customers", "customers"),
    makeNode("root", "exports", "Exports", "exports"),
  ];
  const index = new Map(roots.map((r) => [r.path, r]));

  const ensure = (parent, type, id, label, path) => {
    let node = index.get(path);
    if (!node) {
      node = makeNode(type, id, label, path);
      index.set(path, node);
      parent.children.push(node);
    }
    return node;
  };

  const kindLabels = {
    NATIONAL_ID: "ID images",
    CONTRACT: "Agreements",
    PAYMENT_PROOF: "Payments",
    REPORT_EXPORT: "Reports",
    OTHER: "Other",
  };

  const touch = (node) => {
    let n = node;
    while (n) {
      n.fileCount += 1;
      n = n.parent;
    }
  };

  for (const doc of docs) {
    const customer = doc.customerId
      ? customersById.get(String(doc.customerId))
      : null;

    const docDate = String(doc.createdAt || new Date()).slice(0, 10);
    const year = docDate.slice(0, 4);
    const month = docDate.slice(0, 7);
    const kindLabel = kindLabels[doc.kind] || doc.kind;

    let node = null;
    if (customer && customer.code) {
      const custNode = ensure(
        roots[0],
        "customer",
        String(customer._id),
        `${customer.code} · ${customer.name}`,
        `customers/${customer.code}`,
      );
      custNode.parent = roots[0];
      const yearNode = ensure(custNode, "year", `${customer.code}/${year}`, year, `customers/${customer.code}/${year}`);
      yearNode.parent = custNode;
      const monthNode = ensure(
        yearNode,
        "month",
        `${customer.code}/${month}`,
        month,
        `customers/${customer.code}/${month}`,
      );
      monthNode.parent = yearNode;
      node = ensure(
        monthNode,
        "kind",
        `${customer.code}/${month}/${doc.kind}`,
        kindLabel,
        `customers/${customer.code}/${month}/${doc.kind}`,
      );
      node.parent = monthNode;
    } else {
      const yearNode = ensure(roots[1], "year", `exports/${year}`, year, `exports/${year}`);
      yearNode.parent = roots[1];
      const monthNode = ensure(
        yearNode,
        "month",
        `exports/${month}`,
        month,
        `exports/${month}`,
      );
      monthNode.parent = yearNode;
      node = ensure(
        monthNode,
        "kind",
        `exports/${month}/${doc.kind}`,
        kindLabel,
        `exports/${month}/${doc.kind}`,
      );
      node.parent = monthNode;
    }

    doc.folderPath = node.path;
    touch(node);
  }

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type === "year" || a.type === "month") {
        return b.path.localeCompare(a.path);
      }
      return a.label.localeCompare(b.label);
    });
    for (const n of nodes) sortNodes(n.children);
  };
  for (const root of roots) {
    sortNodes(root.children);
    delete root.parent;
    const strip = (nodes) => {
      for (const n of nodes) {
        delete n.parent;
        strip(n.children);
      }
    };
    strip(root.children);
  }

  const totalBytes = docs.reduce((s, d) => s + (Number(d.sizeBytes) || 0), 0);

  // map of document id -> folder path so the client can find files in a folder
  const fileIndex = {};
  for (const doc of docs) {
    const customer = doc.customerId
      ? customersById.get(String(doc.customerId))
      : null;
    const docDate = String(doc.createdAt || new Date()).slice(0, 10);
    const month = docDate.slice(0, 7);
    fileIndex[String(doc._id)] = customer && customer.code
      ? `customers/${customer.code}/${month.slice(0, 4)}/${month}/${doc.kind}`
      : `exports/${month.slice(0, 4)}/${month}/${doc.kind}`;
  }

  return {
    roots,
    totalFiles: docs.length,
    totalBytes,
    fileIndex,
  };
}

router.get(
  "/tree",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (_req, res, next) => {
    try {
      const data = await buildTree();
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// List files
// ---------------------------------------------------------------------------
router.get(
  "/",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  validate({ query: listQuerySchema }),
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.customerId) filter.customerId = req.query.customerId;
      if (req.query.bookingId) filter.bookingId = req.query.bookingId;
      if (req.query.kind) filter.kind = req.query.kind;
      if (req.query.search) {
        const safe = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.title = { $regex: safe, $options: "i" };
      }

      if (req.query.path) {
        const parts = String(req.query.path).split("/").filter(Boolean);
        if (parts[0] === "customers" && parts[1]) {
          const customer = await Customer.findOne({ code: parts[1] }).select("_id").lean();
          filter.customerId = customer ? customer._id : null;
          const last = parts[parts.length - 1];
          if (["NATIONAL_ID", "CONTRACT", "PAYMENT_PROOF", "REPORT_EXPORT", "OTHER"].includes(last)) {
            filter.kind = last;
          }
        } else if (parts[0] === "exports") {
          filter.customerId = null;
          const last = parts[parts.length - 1];
          if (["NATIONAL_ID", "CONTRACT", "PAYMENT_PROOF", "REPORT_EXPORT", "OTHER"].includes(last)) {
            filter.kind = last;
          }
        }
      }

      const limit = req.query.limit ? Number(req.query.limit) : 300;
      const [items, total] = await Promise.all([
        Document.find(filter)
          .sort({ createdAt: -1 })
          .limit(Math.min(limit, 1000))
          .lean(),
        Document.countDocuments(filter),
      ]);

      return res.status(200).json({ data: items, total });
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Upload (multer memory storage -> Cloudinary or local disk)
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: storageLimit() },
  fileFilter: (_req, file, cb) => {
    const ok = /^(image\/(png|jpeg|webp)|application\/pdf|text\/csv|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain)$/.test(
      file.mimetype,
    );
    if (ok) return cb(null, true);
    return cb(new AppError("Unsupported file type", 400, "VALIDATION_ERROR"));
  },
});

function storageLimit() {
  try {
    // eslint-disable-next-line global-require
    return require("../../config/storage").maxFileSizeBytes;
  } catch {
    return 5 * 1024 * 1024;
  }
}

function runUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new AppError(
          `File is larger than the ${Math.round(storageLimit() / (1024 * 1024))} MB limit`,
          400,
          "VALIDATION_ERROR",
        ),
      );
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new AppError("Unexpected file field", 400, "VALIDATION_ERROR"));
    }
    return next(err);
  });
}

router.post(
  "/upload",
  requireRoles("ADMIN", "STAFF"),
  runUpload,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError("No file supplied", 400, "VALIDATION_ERROR"));
      }

      const kind = req.body.kind || "OTHER";
      const customerId = req.body.customerId || null;
      let customer = null;
      if (customerId) {
        customer = await Customer.findById(customerId).lean();
        if (!customer) {
          return next(new AppError("Customer not found", 404, "NOT_FOUND"));
        }
      }

      const docDate = req.body.date || new Date().toISOString().slice(0, 10);
      const folder = sanitizeFolder(
        req.body.folder ||
          (customer
            ? `customers/${customer.code}/${docDate.slice(0, 4)}/${docDate.slice(0, 7)}/${kind}`
            : `exports/${docDate.slice(0, 4)}/${docDate.slice(0, 7)}`),
      );

      const stored = await uploadBuffer({
        buffer: req.file.buffer,
        folder,
        fileName: req.file.originalname || "upload",
        mimeType: req.file.mimetype,
      });

      const doc = await createDocumentRecord(
        {
          customerId,
          bookingId: req.body.bookingId || null,
          kind,
          folder,
          title: req.body.title || req.file.originalname || "upload",
          storageProvider: stored.storageProvider,
          publicId: stored.publicId,
          url: stored.url,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
        },
        req.user._id,
      );

      return res.status(201).json({ data: doc });
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Stream a file back into the portal (never a browser download to disk)
// ---------------------------------------------------------------------------
router.get(
  "/:id/content",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (req, res, next) => {
    try {
      const doc = await Document.findById(req.params.id).lean();
      if (!doc) {
        return next(new AppError("File not found", 404, "NOT_FOUND"));
      }

      const { buffer, mimeType, fileName } = await readDocument(doc);
      const ext = extensionFor(fileName, mimeType);
      const safeName = `${String(doc.title || "file").replace(/[^a-zA-Z0-9._ -]/g, "_")}.${ext}`;

      res.set("Content-Type", mimeType);
      res.set("X-Content-Type-Options", "nosniff");
      res.set("Cache-Control", "no-store");
      res.set("Content-Disposition", `inline; filename="${safeName}"`);
      res.set("Content-Length", String(buffer.length));
      return res.status(200).end(buffer);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  "/",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: createFileSchema }),
  async (req, res, next) => {
    try {
      const body = { ...req.body, folder: sanitizeFolder(req.body.folder) };
      const doc = await createDocumentRecord(body, req.user._id);
      return res.status(201).json({ data: doc });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
