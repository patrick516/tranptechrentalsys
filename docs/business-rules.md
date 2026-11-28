# Business rules

How money, chairs and time actually work. The maths lives in
`backend/src/services/ledger.calc.js` and `backend/src/utils/money.js`; everything else
is bookkeeping around it.

## 1. Money

- **Whole Kwacha only.** `assertWholeKwacha()` rejects anything that is not a
  non-negative integer. No floats, no decimals, anywhere.
- **Business dates** are `YYYY-MM-DD` in `Africa/Blantyre`
  (`backend/src/utils/dates.js`). "Today" is never the server's local midnight.
- **Rate snapshot.** A booking copies `ratePerChairPerDay` and `lateFeePerDay` from
  `Settings` when it is created, so changing the rate later never re-prices history.

## 2. Booking lifecycle

```
RESERVED ──pickup──▶ OUT ──return──▶ RETURNED
   │                  │
   └──cancel──▶ CANCELLED
```

| Transition | Rule |
| --- | --- |
| create | dates, qty and rate snapshot are stored; initial `HIRE` entries are built for `[startDate, endDate]` inclusive |
| `POST /:id/pickup` | only from `RESERVED`; sets `qtyOut = qty` |
| `POST /:id/extend` | adds days from `endDate + 1`, one `HIRE` per day with `dueDate = requestedDate` so the balance goes past due that day |
| `POST /:id/return` | only from `OUT`; see §3 |
| `POST /:id/cancel` | only from `RESERVED`; status → `CANCELLED` and all open `HIRE` entries are voided (the row stays, marked with reason and user) |

Every transition writes an `AuditLog` row with before/after values.

## 3. Returns, lost and damaged chairs

`POST /bookings/:id/return` takes `qtyReturned`, `qtyLost`, `qtyDamaged`, optional
`lossFeePerChair` / `damageFeePerChair`, `returnDate` and `notes`.

1. `qtyReturned + qtyLost + qtyDamaged` must be **> 0** and **≤ qtyOut**.
2. All three counts reduce `qtyOut` — a lost chair is no longer "out".
3. `qtyOut === 0` → status `RETURNED` and `returnedDate` is set. (A booking can be
   partially returned and stay `OUT` with the remainder still out.)
4. `qtyLost > 0` → a `LOST` stock movement (fleet shrinks).
5. `qtyDamaged > 0` → a `DAMAGED` stock movement (the chair leaves service until
   repaired).
6. Fees are posted to the ledger when a per-chair fee is supplied:
   `LOSS_FEE` and `DAMAGE_FEE`, `source: "RETURN"`.

## 4. Charges

| Charge | When | Amount |
| --- | --- | --- |
| `HIRE` (initial) | booking created, one per day in `[start, end]` | `ratePerChairPerDay × qty` |
| `HIRE` (overstay) | daily job, when chairs are still out after `endDate` | `rate × qtyOut` for that day |
| `HIRE` (extension) | `POST /:id/extend`, one per added day | `rate × qty` |
| `LATE_FEE` | daily job, when principal was unpaid the previous business day | `lateFeePerDay` per day, after grace |
| `LOSS_FEE` / `DAMAGE_FEE` | on return | `qty × feePerChair` |
| `DEPOSIT` / `ADJUSTMENT` | manual | any whole-Kwacha amount, negative = waiver |

### Late fee

```
principalDue(P) = HIRE/DAMAGE/LOSS entries due on or before P, minus confirmed payments
if principalDue(P) <= 0            → no fee
if P < earliestDueDate + graceDays → no fee   (grace = 0 → fee from the due date itself)
otherwise                          → lateFeePerDay
```

The fee itself is never charged more than once per date: the key
`LATE_FEE:<bookingId>:<date>` is unique.

### Idempotency (G-11)

Every system entry carries `idempotencyKey`:

```
HIRE:<bookingId>:<YYYY-MM-DD>
LATE_FEE:<bookingId>:<YYYY-MM-DD>
```

with a unique sparse index, plus a `JobRun` row per job execution. Re-running the daily
job for the same date posts nothing twice.

## 5. Balance and ageing

```
balance(customer) = Σ non-voided ledger amounts − Σ confirmed payments
```

**Ageing** walks a customer's charges in `dueDate` order and finds the first one that
payments cannot cover — that charge's `dueDate` sets how overdue the customer is. Buckets
are 0–7, 8–14, 15–30 and 31+ days (`GET /reports/ageing`).

Payments and ledger entries are never deleted: voiding sets `voidedAt`/`voidReason`/
`voidedBy` and the row stays in the history.

## 6. Stock

- **Owned** = net of all stock movements (`PURCHASE`/`FOUND`/`REPAIRED` positive,
  `LOST`/`DAMAGED`/`WRITE_OFF` negative).
- **Available on date D** = owned − (chairs on bookings that overlap D with status
  `RESERVED` or `OUT`). `GET /stock/availability?from&to` returns the day-by-day table
  plus `minAvailable` for the range (the number that matters for accepting a new
  booking).
- Repairs put a damaged chair back into service (`REPAIRED` movement).

## 7. Promises

A promise is a customer commitment: `PAYMENT` (with an amount) or `RETURN`.
`PENDING → KEPT | BROKEN | CANCELLED`. `GET /promises?overdue=true` returns the pending
ones whose date has passed — the list behind the "Promises due" block on **Today**.

## 8. Messaging rules

- WhatsApp requires `customer.whatsappOptIn` — enforced on `POST /messages`.
- Messages are queued (`QUEUED`) and drained by `src/jobs/sender.js`; failures record
  `error`, `attempts` and `nextRetryAt` instead of disappearing.
- SMS respects `Settings.smsDailyCap` and `SMS_MODE` (`log` records without sending).
- Network routing: `+26599…` → Airtel, `+26588…` → TNM (`Settings.phonePrefixes`).

## 9. Statements and exports

`GET /exports/customer/:id/statement` renders a plain-text statement (opening balance,
charges, payments, closing balance) for a customer; the portal then files it into the
folder tree with `POST /files/upload` under
`customers/<code>/<year>/<YYYY-MM>/REPORT_EXPORT` (or `exports/<year>/<month>/REPORT_EXPORT`
when the file is not tied to a customer).

CSV exports come from `GET /reports/export?report=…` — summary, debtors, ageing,
collections, utilisation, bookings, payments.

## 10. Roles

| Role | Can |
| --- | --- |
| `ADMIN` | everything, plus archive customers, void ledger entries, manage users, read the audit log |
| `STAFF` | day-to-day: bookings, returns, payments, messages, uploads |
| `VIEWER` | read-only lists and reports |
