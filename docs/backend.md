# Backend (Express API)

Single Express app, CommonJS, mounted at `/api/v1` by `src/app.js`. Every route is
`router.use(requireAuth)`-protected unless it is explicitly public (login, refresh,
webhook verify, health).

## 1. Request lifecycle

```
request
  → security headers / CORS allowlist          (src/app.js)
  → cookieParser
  → sanitizeRequest                           (strips $ and . keys — NoSQL injection)
  → /api/v1 router                            (src/routes/index.js)
      → requireAuth (JWT) → requireRoles(...) → validate(zod schema) → controller
      → service (business rules) → Mongoose model
  → notFoundHandler → errorHandler            (src/middleware/errors.js)
```

Conventions:

- **Validation** is zod through `validate({ body, query, params })`
  (`src/middleware/validate.js`). No express-validator anywhere.
- **Errors** are thrown as `AppError(message, statusCode, code)` and rendered by
  `src/middleware/errors.js` as
  `{ error: { code, message, details? } }` with the correct HTTP status.
- **Handlers** are wrapped in `asyncHandler` so rejected promises reach the error
  middleware.
- **Responses** are `{ data: ... }` (and `{ data: ..., meta: ... }` for lists) via
  `src/utils/response.js`.
- **Audit**: anything that changes money or state writes an `AuditLog` entry through
  `src/utils/audit.js`.

## 2. Authentication and roles

| Piece | Where | Notes |
| --- | --- | --- |
| Access token | `POST /auth/login` | JWT, kept **in memory** by the portal (`setAccessToken`), sent as `Authorization: Bearer` |
| Refresh token | `POST /auth/refresh` | httpOnly cookie, rotated on every refresh |
| Session | `GET /auth/me` | used by `AuthContext` on load |
| Logout | `POST /auth/logout` | clears the cookie and the token |
| Password | `POST /auth/change-password` | |
| First-run check | `GET /auth/setup` (public) | `{ needsSetup: true }` while **no users exist** |
| First-run register | `POST /auth/register` (public, rate-limited) | creates the one and only self-registered account, as `ADMIN`, and signs it in |

### First-run setup

The portal may be installed on an empty database. In that case:

1. `GET /auth/setup` reports `needsSetup: true`.
2. The portal shows `/register` instead of `/login` (every other URL redirects there).
3. `POST /auth/register` creates the account with `role: ADMIN`, issues tokens and
   writes the `FIRST_ADMIN_REGISTERED` audit entry.
4. From then on `GET /auth/setup` returns `false` and `POST /auth/register` answers
   `409 SETUP_COMPLETE` — forever. Every other account is created by an
   administrator with `POST /users`.

The check runs inside an in-process lock (`withSetupLock`) so two simultaneous
first registrations cannot both succeed, and the email unique index backstops it.

`requireAuth` (`src/middleware/auth.js`) verifies the access token and puts `req.user`
in play. `requireRoles("ADMIN", ...)` (`src/middleware/roles.js`) restricts by role:
`ADMIN` > `STAFF` > `VIEWER`.

Users are created with `POST /users` and enabled/disabled with `PATCH /users/:id/status`
(ADMIN only). `node src/seed.js` is a development-only seeder (it creates an admin
from `ADMIN_SEED_EMAIL` plus sample data) — on a real install just use
`POST /auth/register` instead.

## 3. Models

| Model | Holds |
| --- | --- |
| `User` | staff accounts, role, status |
| `RefreshToken` | hashed refresh tokens, expiry, revocation |
| `Customer` | code, name, area, type, contacts (`whatsappOptIn`, `whatsappOptInAt`), status |
| `Booking` | code, dates, qty, `qtyOut`, status, rate snapshot, delivery/return detail |
| `LedgerEntry` | every money movement: `HIRE`, `LATE_FEE`, `DAMAGE_FEE`, `LOSS_FEE`, `DEPOSIT`, `ADJUSTMENT` |
| `Payment` | money received: amount, method, reference, `CONFIRMED`/`VOID` |
| `StockMovement` | `PURCHASE`, `FOUND`, `REPAIRED`, `LOST`, `DAMAGED`, `WRITE_OFF` |
| `Promise` | customer commitments: `PAYMENT`/`RETURN`, `PENDING`/`KEPT`/`BROKEN`/`CANCELLED` |
| `Message` | outbound WhatsApp/SMS: template, body, status, retries |
| `Document` | a stored file: folder path, kind, Cloudinary public id or local path |
| `Interaction` | call/WhatsApp/visit log per customer |
| `Settings` | rate per chair per day, late fee, grace days, SMS cap/mode, phone prefixes |
| `JobRun` | one row per daily job run — the idempotency guard |
| `AuditLog` | who did what, when |

All dates that customers see are business dates (`YYYY-MM-DD`, `Africa/Blantyre`).

## 4. Route map

Base: `/api/v1`

| Group | Endpoints |
| --- | --- |
| `auth` | `GET /setup`, `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me`, `POST /change-password` |
| `users` | `GET /`, `POST /`, `PATCH /:id/status` |
| `customers` | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `POST /:id/status`, `POST /:id/contacts`, `PATCH /:id/contacts/:contactId`, `DELETE /:id/contacts/:contactId`, `DELETE /:id` (ADMIN, archive) |
| `bookings` | `GET /`, `POST /`, `GET /:id`, `POST /:id/pickup`, `POST /:id/return`, `POST /:id/extend`, `POST /:id/cancel` |
| `payments` | `GET /`, `POST /`, `POST /:id/void` |
| `ledger` | `GET /`, `POST /adjustments`, `POST /:id/void` |
| `promises` | `GET /`, `POST /`, `PATCH /:id/status` |
| `interactions` | `GET /`, `POST /` |
| `stock` | `GET /availability`, `GET /movements`, `POST /movements` |
| `messages` | `GET /` (filters incl. `status=FAILED`), `POST /` |
| `dashboard` | `GET /summary` |
| `reports` | `GET /dashboard`, `GET /debtors`, `POST /run-daily-job`, `GET /trends`, `GET /summary`, `GET /ageing`, `GET /collections`, `GET /utilisation`, `GET /export` |
| `files` | `GET /tree`, `GET /`, `POST /upload`, `GET /:id/content`, `POST /` (register a document record for a file stored elsewhere) |
| `documents` | `GET /`, `POST /` (legacy upload path) |
| `exports` | `GET /customer/:customerId/statement` |
| `settings` | `GET /`, `PUT /` |
| `audit` | `GET /` (ADMIN) |
| `webhooks` | `GET /whatsapp` (verify), `POST /whatsapp` (status/callback) |
| `health` | `GET /health` |

## 5. Services

```
src/services/
├── auth.service.js        login, refresh rotation, password change
├── customers.service.js   CRUD + contacts (add/update/remove) + archive
├── bookings.service.js    create, pickup, return, extend, cancel
├── payments.js            record + void payments
├── ledger.js              post entries, void, adjustments
├── ledger.calc.js         pure maths: daily hire, late fee, balance, job evaluation
├── promises.js            create + status transitions
├── stock.js               availability over a date range, movements
├── dashboard.service.js   KPI summary for the dashboard
├── reports.service.js     report payloads (used by the older endpoints)
├── reportStats.js         trends, ageing, collections, utilisation, CSV builders
├── exports/               statement content, PDF, DOCX, filing into the tree
├── files/                 folders.js, storage.js, cloudinary.js, documents.js
├── messaging/             queue.js, router.js, optin.js
├── sms/                   textbee.js, network.js (Airtel/TNM routing), templates.js
└── whatsapp/              templateCatalog.js, templates.js, client.js, webhook.js, link.js
```

`ledger.calc.js` is deliberately **pure** — it takes entries, payments and settings and
returns the numbers. That is what the tests exercise.

## 6. Money and the ledger

- The ledger is the source of truth for balances. Payments are receipts *against* it.
- `calcBalance(customerId)` = sum of ledger amounts − sum of confirmed payments.
- Entry types: `HIRE` (daily charge), `LATE_FEE`, `DAMAGE_FEE`, `LOSS_FEE`, `DEPOSIT`,
  `ADJUSTMENT` (negative = waiver).
- Every system-generated entry carries an `idempotencyKey`
  (e.g. `HIRE:bookingId:2026-11-21` with a unique sparse index) so a job re-run cannot
  double-charge (spec G-11).
- Voiding keeps the row (`voidedAt`, `voidReason`, `voidedBy`) — history is never
  deleted.

## 7. Jobs

| Job | File | What it does |
| --- | --- | --- |
| Daily ledger | `src/jobs/dailyLedgerJob.js` | For every `OUT` booking: posts the day's `HIRE` and any past-due `LATE_FEE`, guarded by `JobRun` + `idempotencyKey`. Can be triggered manually with `POST /reports/run-daily-job` (`JOBS_SECRET`) or by the internal scheduler. |
| Message sender | `src/jobs/sender.js` | Drains `Message` rows in `QUEUED` and hands them to the channel router. |

Timezone: everything is computed against `toBusinessDate()` (Africa/Blantyre), never the
server's local midnight.

## 8. Messaging

```
portal / business event
  → messaging/queue.js        creates a Message (QUEUED) + applies opt-in rules
  → messaging/router.js       picks channel (WHATSAPP or SMS) by contact + config
      → sms/textbee.js        TextBee HTTP API, device chosen by network prefix
      → whatsapp/client.js    Cloud API send
  → Message status updated    QUEUED → SENT → DELIVERED/READ, or FAILED + nextRetryAt
```

- **WhatsApp opt-in** (`customer.whatsappOptIn`) is enforced on `POST /messages`.
- **Templates** live in `whatsapp/templateCatalog.js` (booking confirmation, payment
  receipt, chairs delivered, return due reminder, payment reminder, overdue notice,
  promise reminder) rendered by `whatsapp/templates.js`.
- `WHATSAPP_MODE=auto` sends through the Cloud API; anything else logs only, so the
  system is safe to run before real credentials exist.
- **Inbound**: `GET /webhooks/whatsapp` is the Meta verify handshake, `POST
  /webhooks/whatsapp` validates the `WHATSAPP_APP_SECRET` signature and records delivery
  status updates.
- **SMS**: `SMS_MODE=live|log`, daily cap from `Settings.smsDailyCap`, network routing
  by `Settings.phonePrefixes` (`+26599…` Airtel, `+26588…` TNM).

## 9. Files and Cloudinary

Files are **never** sent straight from a bucket to the browser. Everything goes through
the API:

```
POST /files/upload        multer in memory → files/storage.js
    → Cloudinary (CLOUDINARY_* set)  upload_stream, folder from files/folders.js
    → or local disk (backend/storage) when Cloudinary is not configured
    → Document row (folderPath, kind, publicId/path, size, mimetype)

GET  /files/tree          the folder tree, built from Document rows
GET  /files?folder=…&kind=…      list inside one folder
GET  /files/:id/content   streams the file inline (Content-Disposition: inline,
                          Cache-Control: private no-store, X-Content-Type-Options: nosniff)
POST /files               registers a document record for a file that already
                          exists somewhere else (metadata-only path)
```

Folder layout (`files/folders.js`, spec 9.3):
`customers/<CODE>/<year>/<YYYY-MM>/<kind>` for customer files, and
`exports/<year>/<YYYY-MM>/<kind>` for everything else, where `kind` is one of
`NATIONAL_ID`, `CONTRACT`, `PAYMENT_PROOF`, `REPORT_EXPORT`, `OTHER`.
`sanitizeFolder()` strips spaces, dots and path tricks, so nothing can escape the tree.

## 10. Reports

`src/services/reportStats.js` does the maths; `src/routes/reports.js` exposes it.

| Endpoint | Returns |
| --- | --- |
| `GET /reports/trends?from&to&metrics=` | daily series: bookings, revenue, chairs, utilisation |
| `GET /reports/summary?from&to` | totals for the range |
| `GET /reports/ageing?asOf&buckets=` | debtor buckets (0-7, 8-14, 15-30, 31+) |
| `GET /reports/collections?from&to` | expected vs collected per day |
| `GET /reports/utilisation?from&to` | chairs out ÷ chairs owned |
| `GET /reports/export?report=…&from&to` | CSV (`text/csv`, `Content-Disposition: attachment`) |

CSV builders: `buildCsv()` + `CSV_REPORTS` (summary, debtors, ageing, collections,
utilisation, bookings, payments).

## 11. Security notes

- CORS is an allowlist (`CORS_ORIGINS`), credentials enabled for the refresh cookie.
- Request sanitisation strips `$…` and `…​.…` keys before validation.
- ID document fields are encrypted with `ID_ENCRYPTION_KEY`.
- Job endpoints are protected by `JOBS_SECRET`.
- Rate limits live in `src/middleware/limits.js`.
- Passwords are hashed; refresh tokens are stored hashed and rotated.
