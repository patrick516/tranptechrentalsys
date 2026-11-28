# Admin portal (React + Vite)

`admin/` — React 19, Vite, Tailwind, shadcn/ui primitives, nivo charts,
`react-router-dom` v7.

## 1. Structure

```
admin/src/
├── main.tsx               mounts <App/>
├── App.tsx                router: every screen is a real URL
├── context/AuthContext.tsx  session (refresh cookie → /auth/me), login/logout
├── api/
│   ├── client.ts          apiRequest / apiDownload / apiBlob / apiUpload
│   ├── bookings.ts, customers.ts, files.ts, …
├── layouts/AdminLayout.tsx  sidebar + top bar + <main>, owns the chrome
├── components/
│   ├── layout/            Sidebar, Topbar, Breadcrumb, nav.ts
│   ├── common/            Panel, DataTable, StatsCard, FormDialog, PeriodFilter, period.ts
│   ├── forms/             SelectField, FormField
│   ├── charts/            TrendChart, BarsChart, DonutChart (nivo wrappers)
│   ├── bookings/, customers/, files/  feature components
│   └── ui/                shadcn primitives (button, input, dialog, select, tabs, …)
├── pages/                 one folder per screen
└── routes/ProtectedRoute.tsx
```

## 2. Routing and navigation

`src/App.tsx` owns the route table. Every sidebar item has a URL, so links can be
shared and the browser back button always works:

| URL | Page |
| --- | --- |
| `/login` | login (redirects to `/dashboard` when already signed in) |
| `/register` | **one-time** first-run screen — only reachable while the API reports `needsSetup` |
| `/dashboard` | Dashboard |
| `/today` | Today |
| `/bookings` | Bookings |
| `/customers` | Customers |
| `/stock` | Stock |
| `/payments` | Payments & ledger |
| `/promises` | Promises |
| `/messages` | Messages |
| `/reports` | Reports |
| `/files` | Files & exports |
| `/settings` | Settings |
| `*` | 404 with a link back to the dashboard |

- The protected group renders `<ProtectedRoute><AdminShell/></ProtectedRoute>`, and
  `AdminShell` puts `<Outlet/>` inside `AdminLayout`.
- `AdminLayout` derives the active tab from `location.pathname` and navigates with
  `navigate('/…')`, so the sidebar, the phone menu and the URL can never disagree.
- Navigation ids live in `components/layout/nav.ts` (`AdminNavId`, `NAV_GROUPS`) —
  one file to rename, reorder or regroup items.
- Pages that want to jump somewhere else (Dashboard, Today) call `useNavigate()`.

## 3. API client

`src/api/client.ts`:

| Function | Use |
| --- | --- |
| `apiRequest<T>(path, {method, body})` | JSON calls. Attaches the in-memory access token, sends `credentials: "include"`, and on a `401` it refreshes the session **once** and replays the request. Throws an `ApiError` carrying `code`, `status`, `details` from `{ error: … }`. |
| `apiDownload(path, fallbackName)` | CSV/report exports: reads `Content-Disposition` and saves the file |
| `apiBlob(path)` | raw bytes for the in-app file viewer (file opens on screen, not on disk) |
| `apiUpload(path, FormData)` | multipart uploads (no `Content-Type` header — the browser sets the boundary) |

`VITE_API_URL` sets the base (default `http://localhost:5000/api/v1`).

## 4. Design system

White surfaces, grey hairlines, one accent.

| Token | Value | Use |
| --- | --- | --- |
| `primary` | `#005098` | main buttons, links, primary chart series |
| `brand-navy` | `#101D29` | headings and figures |
| destructive | `#DC2626` | destructive buttons and errors |
| borders/inputs | `#E2E8F0` | every border, input ring and placeholder |

`tailwind.config.js` also defines `secondary`, `muted` and `accent` as greys — there are
no coloured panels left; colour only appears on buttons, badges, charts and status text.

Shared building blocks:

| Component | Purpose |
| --- | --- |
| `Topbar` | page title + subtitle + right-hand action slot |
| `Panel` | white card with a heading and an optional right-hand note |
| `DataTable<T>` | typed columns, hairline rows, `sr-only` caption, empty text |
| `StatsCard` | one figure with a label and optional subtext |
| `FormDialog` | modal form: submit spinner, error shown *inside* the dialog |
| `SelectField` | label + shadcn `Select` — **the only dropdown control** (no native `<select>` left) |
| `FormField` | label + input + hint, used inside dialogs |
| `PeriodFilter` | quick ranges (week/month/90 days) plus a custom from→to, with `period.ts` holding the date maths |
| `Button` | `default` (blue), `outline`, `secondary`, `ghost`, `destructive` |

## 5. Charts

`src/components/charts/index.tsx` wraps nivo so every chart looks like one system:
white frame, grey grid, `CHART_COLORS` palette (`#005098`, `#289030`, `#101D29`, …).

```tsx
<TrendChart series={series} height={280} />          // line, cumulative option
<BarsChart data={[{ label, value }]} height={280} /> // single-series bars
<DonutChart data={[{ id, value }]} />                // share of a whole
```

Charts are fed by `GET /reports/trends` and friends — the portal never recomputes
business maths, it only renders.

## 6. Pages

| Page | What it does |
| --- | --- |
| **Dashboard** | `PeriodFilter` + `GET /reports/trends` + `GET /reports/summary`: KPI row (`KpiGrid`), revenue trend, collections vs bookings, chairs utilisation, payments and recent bookings. Buttons jump to `/bookings` and trigger the daily job. |
| **Today** | One screen for the day's work: pickups due, returns due (with days late), promises due, money received today, failed messages — all read from `/bookings`, `/promises`, `/messages?status=FAILED`, `/payments`. |
| **Bookings** | List + filters, status badges, row actions (pickup, extend, return, cancel) via dialogs; new booking dialog snapshots rate and dates. |
| **Customers** | Searchable list, detail drawer (contacts, bookings, ledger, interactions), new-customer dialog, change-status dialog, archive (ADMIN). |
| **Stock** | Date range → availability KPIs + a bars chart of free chairs per day + the daily availability table; "add chairs" and "record a movement" forms post to `/stock/movements`. |
| **Payments & ledger** | Record a payment (customer, amount, method, reference) or post an adjustment/waiver; recent payments and ledger side by side; running total for today. |
| **Promises** | Create a payment/return promise, filter to overdue, mark `KEPT` or `BROKEN`. |
| **Messages** | Compose a WhatsApp/SMS reminder (customer + channel + body, opt-in enforced by the API) and audit the delivery log with status chips. |
| **Reports** | Tabs: Overview (trends, ageing buckets, collections), Ageing, Collections, Utilisation — each with `StatsCard` totals and tables; CSV export through `SelectField` + `apiDownload`. |
| **Files** | Folder tree on the left (`FolderTree`), files in the centre: **files open in the app** through `GET /files/:id/content` (`FileViewer` renders PDFs/images/text from a blob — nothing is downloaded to the computer). Upload dialog, kind filter, and statement export that files the result into the tree. |
| **Settings** | Business name, rate/late fee/grace days, SMS cap and mode. |
| **Login** | email + password → `/auth/login`. |
| **Register** | shown only when `GET /auth/setup` says the database has no users. Name, email, password (10+ chars) → `POST /auth/register`; the account is created as `ADMIN` and signed in automatically, and every other URL redirects here until it exists. |
| **404** | unknown URL, link back to the dashboard. |

## 7. Forms and validation

- Server-side validation is the authority: zod schemas on the API return
  `{ error: { code: "VALIDATION_ERROR", details: [...] } }`.
- Dialogs use `FormDialog`, which shows that message inside the dialog and disables the
  submit while the request is in flight.
- Inputs are shadcn `Input` / `Textarea` / `Select`; date inputs use `type="date"`
  with the business-date format `YYYY-MM-DD`.

## 8. Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build  (type-safe production build)
npm run lint     # eslint
```

Lint is clean: `npm run lint` reports 0 problems. Dialogs start from empty state
because the page remounts them with a `key` whenever they open, so no form-reset
`useEffect` is needed.
