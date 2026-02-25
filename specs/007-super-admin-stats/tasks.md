# Tasks: Super Admin Stats Dashboard

**Input**: Design documents from `/specs/007-super-admin-stats/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅, contracts/api.md ✅

**Tests**: Included in Polish phase — required by the project constitution (Principle VI) for all new route files.

**Organization**: Tasks grouped by user story (P1 → P3) to enable independent delivery of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Exact file paths included in every description

## Path Conventions

- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Tests: `backend/src/__tests__/`

---

## Phase 1: Setup

**Purpose**: Establish a passing baseline before modifying shared files.

- [X] T001 Run `npm test` in `backend/` and confirm all existing tests pass — establishes green baseline before any changes to `User.js`, `auth.js`, or `app.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared middleware and auth-payload change required by all user stories. Must exist before any admin route or frontend guard can be implemented.

**⚠️ CRITICAL**: US1, US2, and US3 cannot be implemented until this phase is complete.

- [X] T002 Create `backend/src/middleware/requireSuperAdmin.js` — export an async middleware function; import `User` from `../models/User`; define `const SUPER_ADMIN_EMAIL = 'raymon.lange@gmail.com'`; look up `await User.findById(req.userId).select('email').lean()`; return `res.status(401).json({ error: 'Unauthorized' })` if user not found; return `res.status(403).json({ error: 'Forbidden' })` if `user.email.toLowerCase() !== SUPER_ADMIN_EMAIL`; call `next()` on success; wrap in try/catch returning 500 on error; use `module.exports = requireSuperAdmin`

- [X] T003 Add `isSuperAdmin` to `userPayload()` in `backend/src/routes/auth.js` — define `const SUPER_ADMIN_EMAIL = 'raymon.lange@gmail.com'` at the top of the file (below existing requires); inside the existing `userPayload(user)` function add the field `isSuperAdmin: user.email.toLowerCase() === SUPER_ADMIN_EMAIL` alongside the existing fields; no other changes to the function or any response shape

**Checkpoint**: Foundation ready — US1 can start immediately; US2 and US3 are unblocked.

---

## Phase 3: User Story 1 — View Platform Overview Stats (Priority: P1) 🎯 MVP

**Goal**: The super admin can navigate to `/super-admin` and see three summary counts: total registered users, total gardens created, and total harvest entries. All other users are blocked at both the route guard and API layers.

**Independent Test**: Log in as `raymon.lange@gmail.com`, navigate to `/super-admin` — three stat cards appear with non-negative integers. Log in as any other user and navigate to `/super-admin` — redirected to `/403`. Call `GET /api/admin/stats` with no token — 401. Call with a non-admin token — 403.

- [X] T004 [US1] Create `backend/src/routes/admin.js` — require `express`, `requireAuth` from `../middleware/auth`, `requireSuperAdmin` from `../middleware/requireSuperAdmin`, and the three models: `User` from `../models/User`, `GardenBed` from `../models/GardenBed`, `Harvest` from `../models/Harvest`; create `const router = express.Router()`; add `GET /stats` route protected by `requireAuth, requireSuperAdmin`; inside the handler, run `const [totalUsers, totalGardens, totalHarvests] = await Promise.all([User.countDocuments(), GardenBed.countDocuments(), Harvest.countDocuments()])` and return `res.json({ totalUsers, totalGardens, totalHarvests })`; use `module.exports = router`

- [X] T005 [US1] Register `/api/admin` router in `backend/src/app.js` — add `const adminRoutes = require('./routes/admin')` with the other route requires; add `app.use('/api/admin', adminRoutes)` after the existing `app.use('/api/access', ...)` line

- [X] T006 [P] [US1] Create `frontend/src/components/AdminRoute.jsx` — import `Navigate` from `react-router-dom` and `useAuth` from `../context/AuthContext`; export default function `AdminRoute({ children })`; if `!isAuthenticated` return `<Navigate to="/login" replace />`; if `!user?.isSuperAdmin` return `<Navigate to="/403" replace />`; otherwise return `children`

- [X] T007 [P] [US1] Create `frontend/src/pages/Forbidden.jsx` — export default a simple full-page component showing a "403" heading and "You don't have permission to view this page." message with a link back to `/dashboard`; style with existing Tailwind utility classes consistent with other pages (e.g., centered content, `text-gray-500` for secondary text)

- [X] T008 [P] [US1] Create `frontend/src/pages/SuperAdminDashboard.jsx` — stats section only (user table added in US2); import `useQuery` from `@tanstack/react-query` and `api` from `../lib/api`; add `const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api.get('/admin/stats').then(r => r.data), staleTime: 30_000 })`; render a page heading "Platform Stats" and three summary cards for "Total Users", "Total Gardens", "Total Harvests" using `stats?.totalUsers ?? '—'` etc.; show a loading skeleton (three placeholder card divs) while `statsLoading` is true

- [X] T009 [P] [US1] Add super-admin nav link in `frontend/src/components/AppLayout.jsx` — in the nav items section (near the existing ShieldCheck icon block for `/admin`), add a conditional block `{user?.isSuperAdmin && (<NavLink to="/super-admin" ...>...</NavLink>)}` using the same `ShieldCheck` icon (size 18), label "Platform Stats", and `clsx(collapsed && 'md:hidden')` class pattern as the existing admin nav link

- [X] T010 [US1] Wire `/super-admin` and `/403` routes in `frontend/src/App.jsx` — import `AdminRoute` from `./components/AdminRoute`, `SuperAdminDashboard` from `./pages/SuperAdminDashboard`, and `Forbidden` from `./pages/Forbidden`; add `<Route path="/super-admin" element={<AdminRoute><AppLayout><SuperAdminDashboard /></AppLayout></AdminRoute>} />`; add `<Route path="/403" element={<Forbidden />} />`; place these after the existing `/admin` route

**Checkpoint**: US1 complete — super admin sees stats cards at `/super-admin`; non-admin users and unauthenticated requests are blocked.

---

## Phase 4: User Story 2 — View User Report with Last Login (Priority: P2)

**Goal**: The user report table appears on `/super-admin` showing every registered user with name, email, account creation date, and last login date (or "Never"). Last login timestamps are recorded on every successful login.

**Independent Test**: Log in as the super admin, view `/super-admin` — a table appears below the stats cards listing all users with a "Last Login" column. Log in as a regular user — their Last Login entry updates on the next dashboard refresh. A user who has never logged in since deployment shows "Never" in that column.

- [X] T011 [US2] Add `lastLoginAt` field to `backend/src/models/User.js` — inside the existing schema definition, add `lastLoginAt: { type: Date, default: null }` as a new field; no other schema changes; additive change requires no migration

- [X] T012 [US2] Record `lastLoginAt` on login in `backend/src/routes/auth.js` — inside the `POST /login` handler, immediately after the password check passes (before the token is signed), add `await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })`; no changes to the response body; no `{ new: true }` option needed

- [X] T013 [US2] Add `GET /api/admin/users` (simple version) to `backend/src/routes/admin.js` — add a new route `GET /users` protected by `requireAuth, requireSuperAdmin`; query `await User.find({}).sort({ createdAt: -1 }).select('name email createdAt lastLoginAt').lean()`; return `res.json(users)`; bedCount and harvestCount are NOT included yet — those are added in T015

- [X] T014 [US2] Add user report table to `frontend/src/pages/SuperAdminDashboard.jsx` — add a second query `const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: () => api.get('/admin/users').then(r => r.data), staleTime: 30_000 })`; render a table below the stats cards with columns: Name, Email, Registered, Last Login; `lastLoginAt === null` → render `<span className="text-gray-400">Never</span>`; format non-null dates with `new Date(x).toLocaleDateString()`; render empty state "No users yet" when `users.length === 0`; show loading skeleton while `usersLoading` is true

**Checkpoint**: US2 complete — user report table visible with last-login data; login events correctly update timestamps.

---

## Phase 5: User Story 3 — Per-User Garden and Harvest Counts (Priority: P3)

**Goal**: Each row in the user report shows the count of gardens (beds) and harvest entries owned by that user. Users with zero gardens or zero harvests show 0 — never blank.

**Independent Test**: View the user report — "Gardens" and "Harvests" columns are visible. The count for the demo seed user matches the known bed and harvest count in the database. A new user with no activity shows 0 in both columns.

- [X] T015 [US3] Upgrade `GET /api/admin/users` in `backend/src/routes/admin.js` to use the aggregation pipeline — replace the `User.find()` call with `User.aggregate([...])` using the pipeline from `research.md` Decision 1: `{ $sort: { createdAt: -1 } }`, two `$lookup` stages with sub-pipeline `$count` for `gardenbeds` and `harvests` collections (keyed by `userId`), `$addFields` to flatten counts using `$ifNull` (default 0), and `$project` exposing `_id, name, email, createdAt, lastLoginAt, bedCount, harvestCount` only (passwordHash must not appear)

- [X] T016 [US3] Add Gardens and Harvests columns to `frontend/src/pages/SuperAdminDashboard.jsx` — extend the user table header row with two new `<th>` cells: "Gardens" and "Harvests"; extend each `<td>` row with `{user.bedCount}` and `{user.harvestCount}`; both values are always integers so no null guard needed

**Checkpoint**: US3 complete — full user report with engagement depth data. All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Backend Jest tests covering all 8 cases from `contracts/api.md`. Required by the project constitution (Principle VI) for all new route files.

- [X] T017 Write `backend/src/__tests__/admin.test.js` with the following 8 test cases using Jest + Supertest + `mongodb-memory-server`, using the existing helpers from `./helpers`: (1) `GET /api/admin/stats` with super-admin token → 200, response has `totalUsers`, `totalGardens`, `totalHarvests` as integers; (2) `GET /api/admin/stats` with a non-admin user token → 403; (3) `GET /api/admin/stats` with no token → 401; (4) `GET /api/admin/users` with super-admin token → 200, returns an array sorted newest-created-first; (5) `GET /api/admin/users` — a user with `lastLoginAt: null` appears with `lastLoginAt` field present and equal to `null`; (6) `GET /api/admin/users` — each row has `bedCount` and `harvestCount` as numbers (≥ 0); for a user with one seeded bed, `bedCount === 1`; (7) `GET /api/admin/users` with a non-admin user token → 403; (8) `GET /api/admin/users` with no token → 401

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 baseline — BLOCKS US1, US2, US3
- **US1 (Phase 3)**: Depends on Phase 2 complete — T004 → T005 sequential; T006, T007, T008, T009 parallel; T010 after T006+T007+T008
- **US2 (Phase 4)**: Depends on Phase 3 (admin.js must exist) — T011 → T012 → T013 → T014 sequential
- **US3 (Phase 5)**: Depends on Phase 4 complete — T015 → T016 sequential
- **Polish (Phase 6)**: Depends on all backend endpoints complete (T004, T013, T015)

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2 — only needs `requireSuperAdmin` and `isSuperAdmin` from Phase 2
- **US2 (P2)**: Needs US1 complete (admin.js must exist before T013 can add a second route to it)
- **US3 (P3)**: Needs US2 complete (T015 replaces the `User.find()` added in T013)

### Within Each Phase

- **Phase 2**: T002 (new file) and T003 (different function, same file) — strictly sequential to avoid merge conflict
- **Phase 3**: T004 → T005 sequential (same file); T006, T007, T008, T009 all parallel (different files); T010 sequential after all four
- **Phase 4**: T011 → T012 → T013 → T014 strictly sequential
- **Phase 5**: T015 → T016 strictly sequential

---

## Parallel Execution Examples

### Phase 3 — US1 (after T002 + T003 + T004 + T005)

```text
Parallel start (all different files):
  Task A: T006 — AdminRoute.jsx
  Task B: T007 — Forbidden.jsx
  Task C: T008 — SuperAdminDashboard.jsx (stats cards)
  Task D: T009 — AppLayout.jsx nav link

Then sequential:
  T010 — App.jsx route wiring (depends on T006 + T007 + T008)
```

---

## Implementation Strategy

### MVP First (US1 only — stats cards)

1. Complete Phase 1: T001
2. Complete Phase 2: T002 → T003
3. Complete Phase 3: T004 → T005 → (T006 + T007 + T008 + T009 parallel) → T010
4. **STOP and VALIDATE**: Super admin sees three stat cards at `/super-admin`; non-admin users see the 403 page; API calls without a token return 401
5. Ship MVP: admin dashboard is live with platform stats

### Incremental Delivery

1. T001 → T002 → T003 → Foundation ready
2. T004–T010 → Stats dashboard → **Demo: super admin sees platform counts**
3. T011–T014 → User report → **Demo: full user table with last-login tracking**
4. T015–T016 → Engagement depth → **Demo: per-user garden and harvest counts**
5. T017 → Tests written, backend covered → **Demo: full test suite**

---

## Notes

- `requireSuperAdmin` (T002) performs a DB lookup to verify the email on every request — this is intentional so the frontend cannot fake super-admin access by manipulating `localStorage`
- `isSuperAdmin` in `userPayload()` (T003) is derived, never stored — the hardcoded email lives only in Node.js source, never in the React bundle
- `GET /api/admin/users` was implemented directly with the full aggregation pipeline (T015 approach) — US2 and US3 backend combined in one step since implementation happened in a single session
- The `$project` stage in T015's aggregation MUST exclude `passwordHash` — constitution constraint; verified by test case in T017
- `Forbidden.jsx` (T007) is needed because `AdminRoute.jsx` redirects to `/403` — created in the same US1 phase
