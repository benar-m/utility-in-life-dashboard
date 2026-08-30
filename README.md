# Utility in Life Empowerment — Operations Dashboard

Front-end scaffold for the Phase 1 MVP described in the system design
overview: parent/student registration, teacher management, scheduling,
attendance, M-Pesa payments, and reporting for an academic operations
platform.

The dashboard shell — left sidebar + right-side content — adapts to
three roles: **Administrator**, **Teacher**, and **Parent / Student**.
Each role sees a different set of modules and different copy on shared
modules (e.g. "Payments" becomes fee invoices for a parent, and
earnings/payouts for a teacher). Every module page is a working
placeholder: real layout and states, no data yet, ready to wire up to
an API.

| Module | Admin | Teacher | Parent / Student |
|---|---|---|---|
| Dashboard | ✅ platform stats | ✅ today's classes | ✅ next class, balance |
| Students | ✅ all students | ✅ "My Students" | ✅ "My Children" (register a child) |
| Teachers | ✅ | — | — |
| Classes | ✅ all classes | ✅ "My Classes" | ✅ "My Classes" |
| Calendar | ✅ | ✅ | ✅ |
| Payments | ✅ all invoices | ✅ "Earnings" | ✅ "Payments" (pay fees) |
| Attendance | ✅ all records | ✅ mark attendance | ✅ view history |
| Reports | ✅ | — | — |
| Progress | — | — | ✅ |
| Settings | ✅ platform config | ✅ profile | ✅ profile |

This maps directly to the roles defined in the design deck (slide 6 & 8):
Administrator manages operations; Teachers view classes and record
attendance; Parents register students, pay invoices, and join classes.

Try it: sign in as different roles from the login screen and watch the
sidebar and dashboard home change.

## Stack

- React 18 + Vite
- React Router v6 (client-side routing)
- Tailwind CSS (utility styling, brand palette in `tailwind.config.js`)
- lucide-react (icons)

## Getting started

```bash
npm install
cp .env.example .env   # then fill in VITE_API_BASE_URL
npm run dev
```

Open the printed local URL. You'll land on the sign-in screen — click
"Register" to create a demo account (full name, email, password, and a
role), or just fill in the sign-in form directly. There's no real
account database yet (see "Auth notes" below), so any email/password
combination that passes the format checks will work.

## Project structure

```
src/
  main.jsx                  # app bootstrap: router + auth provider
  App.jsx                   # route table
  index.css                 # Tailwind layers + base resets
  config/
    navigation.js           # single source of truth for modules, roles, routes & per-role copy
  context/
    AuthContext.jsx         # demo auth/session stub (signIn, register, signOut)
  utils/
    validators.js           # shared email/password format checks for the forms
  components/
    layout/
      DashboardLayout.jsx   # sidebar + topbar + <Outlet /> shell
      Sidebar.jsx
      Topbar.jsx
    common/
      PageHeader.jsx
      StatCard.jsx
      ModuleCard.jsx
      EmptyState.jsx
      TableSkeleton.jsx
      ProtectedRoute.jsx
  pages/
    DashboardHome.jsx       # picks the right overview component for the signed-in role
    dashboard/
      AdminOverview.jsx
      TeacherOverview.jsx
      ParentStudentOverview.jsx
    ProgressPage.jsx        # parent/student only
    StudentsPage.jsx
    TeachersPage.jsx
    ClassesPage.jsx
    CalendarPage.jsx
    PaymentsPage.jsx
    AttendancePage.jsx
    ReportsPage.jsx
    SettingsPage.jsx
    LoginPage.jsx
    RegisterPage.jsx
    NotFoundPage.jsx
```

## Auth notes (login & registration)

- **Login** (`/login`) requires full name, email, and password — all
  mandatory, with inline validation (valid email format, password
  present).
- **Registration** (`/register`) additionally requires a confirmed
  password (minimum 8 characters, must match) and a role.
- Neither page talks to a real backend yet. `AuthContext.signIn` and
  `AuthContext.register` both have a comment showing the exact
  `fetch(...)` call to swap in once `/auth/login` and `/auth/register`
  endpoints exist.
- **The password is never stored anywhere on the client** — not in
  `AuthContext`, not in `localStorage`, not after the form submits. It
  only exists in the form's local state long enough to be sent to a
  real backend in the future. Only `{ fullName, email, role }` is kept
  in the demo session.
- **Before shipping**: real password hashing (bcrypt/argon2), rate
  limiting on login attempts, and email verification all belong on the
  server — none of that can live in this front end. Also worth
  restricting self-service registration to the Parent/Student role,
  matching the design deck's workflow ("Parent registers → Admin
  reviews") — Administrator and Teacher accounts are safer created via
  an admin-issued invite than an open sign-up form.

**Why it's organized this way**

- `config/navigation.js` is the one place that defines every module,
  which role(s) can see it, its route path, and any per-role label or
  description override. The sidebar, dashboard home, module grids, and
  route guards (`ProtectedRoute`) all read from it — add or rename a
  module in one place and everything downstream stays in sync.
- Role checks in `ProtectedRoute` are **UI-only**. They stop a signed-in
  teacher from navigating to `/reports` in the browser, but the backend
  API must independently verify the caller's role on every request —
  never trust a role sent from the client.
- `components/layout` vs `components/common` separates "structural
  chrome" (sidebar, topbar) from small reusable pieces used inside page
  content (cards, empty states, skeletons).
- Each module lives in its own page file. Nothing is shared by
  accident — every page explicitly imports what it uses.

## Connecting real data

Each page currently renders an `EmptyState` or `TableSkeleton`. To wire
up a module:

1. Add a fetch call (e.g. with `fetch` or a small API client) scoped to
   that page, reading `import.meta.env.VITE_API_BASE_URL`.
2. Replace the `hasXRecords` boolean with real loading/error/data state.
3. Swap `TableSkeleton` for real `<tr>` rows once data arrives.

Keep data-fetching in the page component (or a small `hooks/useX.js`
if it's reused) rather than in shared UI components, so `StatCard`,
`ModuleCard`, etc. stay presentation-only and easy to test.

## Security notes

- **Auth/session**: `AuthContext.jsx` currently stores a demo session
  in `localStorage` so the UI has something to read on refresh. This is
  **not** how production auth should work — see the comment at the top
  of that file for the recommended pattern (short-lived token in
  memory + httpOnly refresh cookie).
- **Role checks are UI-only here**: `ProtectedRoute` hides navigation
  and pages by role, but every write endpoint (payments, attendance,
  student records) must independently verify the caller's role and
  identity server-side. Never trust a role sent from the client.
- **M-Pesa Daraja secrets** (consumer key/secret, passkey, callback
  validation) must live only in backend environment variables. This
  front end should only ever call your own backend, which then talks
  to Daraft — it should never hold Daraja credentials itself.
- **Kenya Data Protection Act, 2019**: personal data (student and
  parent details, payment records) should be transmitted over HTTPS
  only, minimized in client-side logs, and retained per your
  organization's data retention policy. Add a consent notice at
  registration if one doesn't already exist in the product flow.
- **No secrets in this repo**: `.env` is git-ignored; only
  `VITE_`-prefixed, non-secret values belong in front-end env vars,
  since anything bundled by Vite is publicly readable in the browser.
- **CSP / security headers**: set `Content-Security-Policy`,
  `X-Frame-Options`, and `Strict-Transport-Security` at the hosting
  layer (Nginx, Netlify, CloudFront, etc.) — see the comment in
  `index.html`.

## Scaling this further

- Add `hooks/` for shared data-fetching logic once more than one page
  needs the same query.
- Add `lib/apiClient.js` as a thin `fetch` wrapper (base URL, auth
  header, error handling) once a real backend exists.
- Consider React Query or SWR for caching once modules do real data
  fetching — the current structure doesn't fight against adding either.
- Split `Teacher` and `Parent` experiences (slide 8 of the design deck)
  into their own route trees (e.g. `/teacher/*`, `/parent/*`) reusing
  `DashboardLayout` with a role-specific `navigation.js` entry set.
