# Implementation Plan: Super Admin Stats Dashboard

**Branch**: `007-super-admin-stats` | **Date**: 2026-02-25 | **Spec**: `specs/007-super-admin-stats/spec.md`
**Input**: Feature specification from `/specs/007-super-admin-stats/spec.md`

## Summary

Build a read-only super-admin dashboard restricted to `raymon.lange@gmail.com` that displays platform-wide aggregate counts (total users, gardens, harvests) and a per-user report table showing name, email, registration date, last login timestamp, garden count, and harvest count.

**Technical approach**: Add `lastLoginAt: Date` to the User schema (additive, no migration); record it on every successful login; expose two new protected API endpoints (`GET /api/admin/stats`, `GET /api/admin/users`) behind a `requireSuperAdmin` middleware; add `isSuperAdmin` boolean to the auth response payload; render a new `SuperAdminDashboard.jsx` page behind an `AdminRoute.jsx` guard in the frontend.

## Technical Context

**Language/Version**: Node.js 22 (backend) / JavaScript + React 19 (frontend)
**Primary Dependencies**: Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React
**Storage**: MongoDB 7 — additive `lastLoginAt: Date` field on User model only; no new collections
**Testing**: Jest 29 + Supertest + mongodb-memory-server
**Target Platform**: Linux server (Docker); frontend served via nginx on port 5173
**Project Type**: Web application (backend API + React frontend)
**Performance Goals**: Dashboard page load < 2 s (SC-001); aggregation runs against existing `userId` indexes on `gardenbeds` and `harvests`
**Constraints**: Non-admin users blocked 100% of the time (SC-004); `lastLoginAt` accurate to within 1 minute (SC-003); all user counts have zero discrepancy (SC-005)
**Scale/Scope**: ~10–100 users; single super-admin; read-only dashboard; no pagination needed for MVP

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Layered Separation | ✅ PASS | All auth + business logic in Express; React reads `isSuperAdmin` from user payload |
| II. REST-First API Design | ✅ PASS | `GET /api/admin/stats`, `GET /api/admin/users` — resource-based nouns, no verbs in URL |
| III. Permission-Gated Multi-Tenancy | ✅ PASS | Admin routes are not garden-data routes (Principle III applies to beds/plants/harvests/access); they are protected by `requireAuth` + `requireSuperAdmin` — equivalent level of protection |
| IV. Schema-Validated Data Integrity | ✅ PASS | `lastLoginAt: { type: Date, default: null }` — additive change with default; existing documents remain valid |
| V. Server State via React Query / UI State | ✅ PASS | Two separate queries `['admin', 'stats']` and `['admin', 'users']`; `isSuperAdmin` in AuthContext |
| VI. Test-Before-Deploy | ✅ PASS | New `admin.test.js` required; covers happy path, 401, 403 per constitution |
| VII. Simplicity & YAGNI | ✅ PASS | No service layer; route handlers call Mongoose directly; `requireSuperAdmin.js` is named middleware (not a helper function — YAGNI applies to helper utilities, not middleware) |
| VIII. Consistent Naming | ✅ PASS | `lastLoginAt` (camelCase), `isSuperAdmin` (is-prefix boolean), `SuperAdminDashboard.jsx` / `AdminRoute.jsx` (PascalCase) |

*Post-design re-check: All gates still pass. No violations to justify.*

## Project Structure

### Documentation (this feature)

```text
specs/007-super-admin-stats/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── User.js                     (modified — add lastLoginAt field)
│   ├── routes/
│   │   ├── admin.js                    (new — GET /api/admin/stats, GET /api/admin/users)
│   │   └── auth.js                     (modified — add isSuperAdmin to userPayload, record lastLoginAt on login)
│   ├── middleware/
│   │   └── requireSuperAdmin.js        (new — checks req.userId against hardcoded email)
│   └── app.js                          (modified — register app.use('/api/admin', adminRoutes))
│
└── src/__tests__/
    └── admin.test.js                   (new — 8 test cases)

frontend/
├── src/
│   ├── pages/
│   │   └── SuperAdminDashboard.jsx     (new — stats cards + user report table)
│   ├── components/
│   │   └── AdminRoute.jsx              (new — route guard using user.isSuperAdmin)
│   ├── context/
│   │   └── AuthContext.jsx             (no change needed — isSuperAdmin flows through automatically)
│   ├── components/
│   │   └── AppLayout.jsx               (modified — add super-admin nav link, conditionally rendered)
│   └── App.jsx                         (modified — add /super-admin route wrapped in AdminRoute)
```

**Structure Decision**: Web application layout. Backend adds one route file, one middleware, and modifies two existing files. Frontend adds two new files and modifies two existing files. No new collections; no new npm dependencies.
