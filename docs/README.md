# TranpTech Chair Rentals — documentation

A chair-hire business system: a Node/Express API, a MongoDB database and a React admin
portal. Bookings charge per chair per day, money is tracked in a ledger, chairs are
tracked in stock movements, customers are messaged over WhatsApp/SMS, and every document
is filed in a folder tree.

| Doc | What it covers |
| --- | --- |
| [backend.md](backend.md) | API structure, auth, models, routes, ledger, jobs, messaging, files, reports |
| [admin-portal.md](admin-portal.md) | The React portal: routing, layout, shared components, every page |
| [business-rules.md](business-rules.md) | How a booking charges, returns work, ageing, promises, statements |

## Repository layout

```
tranptechrentalsys/
├── backend/     Express API (CommonJS), Mongoose, zod validation, vitest tests
├── admin/       React 19 + Vite + Tailwind + shadcn/ui portal
├── docs/        This documentation
```

## Running it

Backend (needs MongoDB):

```bash
cd backend
cp .env.example .env      # fill in MONGODB_URI, JWT secrets, provider keys
npm install
npm test                  # vitest — 5 files, 25 tests
npm run dev               # nodemon on http://localhost:5000
```

**First run:** if the database has no users at all, the portal shows a one-time
`/register` screen instead of the sign-in screen. The account you create there becomes
the administrator, and self-registration closes immediately — every later account is
added by an admin from inside the system (`POST /api/v1/users`).

Admin portal:

```bash
cd admin
npm install
npm run dev               # Vite on http://localhost:5173
npm run build             # tsc -b && vite build
npm run lint              # eslint
```

The portal reads `VITE_API_URL` (default `http://localhost:5000/api/v1`).

## Environment variables

All backend configuration lives in `backend/.env.example` — copy it to `.env`.
The important groups:

| Group | Variables |
| --- | --- |
| Core | `PORT`, `TZ`, `APP_ENV`, `MONGODB_URI` |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `COOKIE_DOMAIN` |
| Security | `CORS_ORIGINS`, `ID_ENCRYPTION_KEY`, `JOBS_SECRET` |
| Seed admin | `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` |
| SMS (TextBee) | `TEXTBEE_*`, `SMS_MODE`, `SMS_DAILY_CAP` |
| WhatsApp (Cloud API) | `WHATSAPP_MODE`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` |
| Files (Cloudinary) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Email (optional) | `SMTP_*`, `MAIL_FROM` |

Nothing secret ships in the browser build: the portal only holds `VITE_API_URL`.

## Business dates

Every date a customer sees is a **business date** in `Africa/Blantyre`, stored as the
string `YYYY-MM-DD`. `backend/src/utils/dates.js` (`toBusinessDate()`) is the single
conversion point. Money is whole Kwacha — no floats, no decimals.

## Tests

```bash
cd backend && npm test     # vitest run
```

5 files, 25 tests, all passing. They cover the money maths (daily hire, late fees,
returns), auth middleware, the ledger helpers and the first-run registration flow
(`SETUP-01` … `SETUP-05`).
