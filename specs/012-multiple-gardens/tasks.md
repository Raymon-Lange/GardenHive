# Tasks: Multiple Garden Plans (012)

**Input**: Design documents from `/specs/012-multiple-gardens/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api-gardens.md ✅

**Tests**: Backend tests included (required by constitution §VI for all new routes).

**Spec clarifications applied**:
- Garden image stays on User (not per-garden) — no image endpoints on `/api/gardens`
- Helpers can browse/switch ALL of an owner's gardens independently
- Copying a garden inherits dimensions; name field must be explicitly entered (no pre-fill)
- `/api/access/shared` must return full `gardens[]` array per owner for helper switching

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to

## Path Conventions

- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Tests: `backend/src/__tests__/`, `tests/e2e/`

---

## Phase 1: Setup (Migration Infrastructure)

**Purpose**: Prepare the data migration that must run before any new code is deployed.

- [X] T001 Create idempotent migration script `backend/src/seed/migrateToMultiGarden.js` — for each owner user with no `activeGardenId`: create a `Garden` doc from their `gardenName`/`gardenWidth`/`gardenHeight`, set `user.activeGardenId`, and bulk-update all their `GardenBed` docs to set `gardenId`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New model, schema changes, and test plumbing that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create `Garden` Mongoose model `backend/src/models/Garden.js` — fields: `userId` (ref User, required, index), `name` (String, required, trim), `gardenWidth` (Number, min 1, default null), `gardenHeight` (Number, min 1, default null); `{ timestamps: true }`
- [X] T003 [P] Add `gardenId` field to `GardenBed` schema `backend/src/models/GardenBed.js` — `{ type: ObjectId, ref: 'Garden', required: true, index: true }`
- [X] T004 [P] Add `activeGardenId` field to `User` schema `backend/src/models/User.js` — `{ type: ObjectId, ref: 'Garden', default: null }`; do NOT remove existing `gardenName`/`gardenWidth`/`gardenHeight`/`gardenImage` fields
- [X] T005 Create `backend/src/routes/gardens.js` file with Express router skeleton (no endpoints yet) and mount it at `/api/gardens` in `backend/src/app.js`
- [X] T006 Update `backend/src/__tests__/helpers.js` — add `createGarden(userId, overrides)` factory; update `createBed(userId, overrides)` to accept and require `gardenId`

**Checkpoint**: Models exist, router mounted, test factories ready — user story phases can now begin.

---

## Phase 3: User Story 1 — Switch Between Garden Plans (Priority: P1) 🎯 MVP

**Goal**: Owners and helpers can see a list of garden plans and switch which one is active; all planning views (beds, map) reflect the selected garden.

**Independent Test**: Seed two gardens for an owner, verify `GET /api/gardens` returns both, switch active garden via `PUT /api/auth/me/active-garden`, and confirm the GardenContext exposes the correct `currentGardenId` to pages. Verify helper sees both owner gardens via `/api/access/shared`.

### Backend — US1

- [X] T007 [US1] Update `backend/src/routes/auth.js` — make `buildUserPayload` async; populate active `Garden` and include `activeGardenId`, `gardenName`, `gardenWidth`, `gardenHeight` (fallback to User fields for un-migrated accounts); all callers `await buildUserPayload(user)`; add `PUT /api/auth/me/active-garden` route that sets `user.activeGardenId`
- [X] T008 [P] [US1] Update `GET /api/access/shared` in `backend/src/routes/access.js` — populate `ownerId.activeGardenId` and fetch all `Garden` docs for that owner; return a `gardens: Garden[]` array and `activeGardenId` per shared owner entry (additive change, not breaking)
- [X] T009 [P] [US1] Add `GET /api/gardens` endpoint to `backend/src/routes/gardens.js` — returns all gardens for `req.userId`, sorted by `createdAt` ascending
- [X] T010 [US1] Update `GET /api/beds` in `backend/src/routes/beds.js` — scope query to `{ userId: req.gardenOwnerId, gardenId: req.query.gardenId }`; return 400 if `gardenId` absent (required after migration)
- [X] T011 [US1] Write backend tests in `backend/src/__tests__/gardens.test.js` — happy path for `GET /api/gardens`; 401 (no token); `PUT /api/auth/me/active-garden` (valid garden, wrong owner → 403, non-existent → 404)
- [X] T012 [P] [US1] Update `backend/src/__tests__/beds.test.js` — update existing tests to pass `gardenId` query param; add test: 400 when `gardenId` absent

### Frontend — US1

- [X] T013 [US1] Refactor `frontend/src/context/GardenContext.jsx` — on mount, fetch `GET /api/gardens` into a `gardens` state; expose `currentGardenId` (from `user.activeGardenId`); add `setCurrentGardenId(id)` that calls `PUT /api/auth/me/active-garden` and updates `gh_user` localStorage; for helpers: derive `helperGardens` from `activeGarden.gardens`, track helper's selected `currentGardenId` (default to `activeGarden.activeGardenId`); expose `currentGardenId` for all consumers
- [X] T014 [US1] Update `frontend/src/components/AppLayout.jsx` — add own-garden dropdown (owner only): lists `gardens` from context, selected = `currentGardenId`, calls `setCurrentGardenId` on change, clears React Query cache; add helper garden dropdown: lists `helperGardens` from context when a shared owner is active; keep existing shared-owner switcher

**Checkpoint**: US1 fully functional — switching gardens updates all pages' data.

---

## Phase 4: User Story 2 — Create a Blank New Garden (Priority: P2)

**Goal**: Owner creates a named empty garden; it becomes the active garden; beds and map pages show it scoped correctly.

**Independent Test**: Create a blank garden via the modal, verify it appears in the gardens dropdown and has zero beds, verify beds and map pages pass `gardenId` in all API calls.

### Backend — US2

- [X] T015 [US2] Add `POST /api/gardens` (blank creation) to `backend/src/routes/gardens.js` — requires `name`; optional `gardenWidth`, `gardenHeight`; creates Garden doc and sets `user.activeGardenId` to new garden; returns 201 with garden
- [X] T016 [P] [US2] Add `PUT /api/gardens/:id` to `backend/src/routes/gardens.js` — updates `name`, `gardenWidth`, `gardenHeight`; validates owner; validates reducing dimensions does not clip placed beds (query `GardenBed` for out-of-bounds placements using `Garden.findById(bed.gardenId)` — not `User.gardenWidth`); returns updated garden
- [X] T017 [P] [US2] Update `POST /api/beds` in `backend/src/routes/beds.js` — require `gardenId` in body; validate it belongs to `req.gardenOwnerId`; update `PUT /api/beds/:id` overlap/boundary check to read dimensions from `Garden.findById(bed.gardenId)` instead of `User`
- [X] T018 [US2] Write backend tests in `backend/src/__tests__/gardens.test.js` — `POST /api/gardens` happy path (201 + garden shape); missing `name` → 400; `PUT /api/gardens/:id` rename + dimensions; wrong owner → 403; clip check → 400
- [X] T019 [P] [US2] Update `backend/src/__tests__/beds.test.js` — update `POST /api/beds` tests to include `gardenId`; add test: 400 when `gardenId` absent

### Frontend — US2

- [X] T020 [US2] Create `frontend/src/components/NewGardenModal.jsx` — modal with "New Garden" tab containing name input (required), optional rows/cols dimension inputs; on submit calls `POST /api/gardens`; on success invalidates `['gardens']` query and calls `setCurrentGardenId` with new garden id; clears React Query cache
- [X] T021 [US2] Wire "+ New Garden" button into own-garden area of `frontend/src/components/AppLayout.jsx` — opens `NewGardenModal`
- [X] T022 [P] [US2] Update `frontend/src/pages/GardenBeds.jsx` — pass `gardenId: currentGardenId` to all `GET /api/beds`, `POST /api/beds`, and invalidation query keys; disable if `currentGardenId` is null
- [X] T023 [P] [US2] Update `frontend/src/pages/GardenMap.jsx` — pass `gardenId: currentGardenId` to all bed queries; read `gardenWidth`/`gardenHeight` from the current garden (via `gardens.find(g => g._id === currentGardenId)`) rather than `user.gardenWidth`/`user.gardenHeight`
- [X] T024 [P] [US2] Update `frontend/src/pages/BedDetail.jsx` — pass `gardenId: currentGardenId` as query param on cell update calls (BedDetail uses `/beds/:id` directly — gardenId not needed)

**Checkpoint**: US2 functional — owner can create blank gardens, beds and map correctly scope to selected garden.

---

## Phase 5: User Story 3 — Copy an Existing Garden (Priority: P3)

**Goal**: Owner clones an existing garden (beds + plant assignments + dimensions copied; map positions reset; name must be typed fresh).

**Independent Test**: Copy a garden with two planted beds; verify new garden has matching beds with same plants; verify dimensions match source; verify map positions are null; verify source garden unchanged; verify name field was empty.

### Backend — US3

- [X] T025 [US3] Add `sourceGardenId` clone path to `POST /api/gardens` in `backend/src/routes/gardens.js` — when `sourceGardenId` present: validate it belongs to `req.userId`; copy `gardenWidth`/`gardenHeight` from source; deep-clone all `GardenBed` docs (preserve `name`, `rows`, `cols`, `cells`; set `mapRow: null`, `mapCol: null`); set `user.activeGardenId` to new garden; `name` is required (no default/fallback)
- [X] T026 [US3] Write backend tests in `backend/src/__tests__/gardens.test.js` — clone happy path (beds match, cells match, dimensions match, mapRow/mapCol null); source garden unchanged; `sourceGardenId` not owned by user → 400; missing `name` → 400

### Frontend — US3

- [X] T027 [US3] Add "Copy from Existing" tab to `frontend/src/components/NewGardenModal.jsx` — name input (required, empty, no pre-fill); source garden `<select>` listing own gardens; on submit calls `POST /api/gardens` with `{ name, sourceGardenId }`

**Checkpoint**: US3 functional — seasonal copy workflow works end-to-end.

---

## Phase 6: User Story 4 — Import Garden from CSV (Priority: P4)

**Goal**: Owner uploads a CSV of bed definitions to create a populated garden in one step.

**Independent Test**: Upload `Bed Name,Rows,Cols` CSV with 3 valid rows and 1 invalid row; verify garden is created with 3 beds; verify error shown for the invalid row; verify garden name was required.

### Backend — US4

- [X] T028 [US4] Add `POST /api/gardens/import` to `backend/src/routes/gardens.js` — multer `memoryStorage` (max 1MB); validate file is CSV; `csv-parse/sync` with `columns: true`; validate required columns `Bed Name`, `Rows`, `Cols`; validate each row (name non-empty, rows/cols positive integers ≤ 50); create Garden + all valid GardenBeds in one operation; set `user.activeGardenId`; return `{ garden, bedsCreated, errors: [...] }` 201; reject if zero valid rows
- [X] T029 [US4] Write backend tests in `backend/src/__tests__/gardens.test.js` — valid CSV 3 rows → 201 + `bedsCreated: 3`; partial failure (1 bad row) → 201 + `bedsCreated: 2` + `errors` array; missing columns → 400; non-CSV file → 400; missing garden `name` field → 400; empty CSV → 400

### Frontend — US4

- [X] T030 [US4] Add "Import CSV" tab to `frontend/src/components/NewGardenModal.jsx` — garden name input (required); file picker (accept `.csv`); on upload calls `POST /api/gardens/import` (multipart); shows `bedsCreated` count on success; shows per-row error list when `errors` array is non-empty; download link for CSV template (`Bed Name,Rows,Cols\nFront Bed,4,6\n`)

**Checkpoint**: US4 functional — CSV import creates gardens with beds.

---

## Phase 7: User Story 5 — Delete a Garden (Priority: P5)

**Goal**: Owner permanently removes a garden and all its beds; blocked on last garden; active garden auto-switches on deletion.

**Independent Test**: Delete one of two gardens; verify garden and its beds are gone; attempt to delete the only remaining garden and verify it is blocked; delete active garden and verify another garden becomes active.

### Backend — US5

- [X] T031 [US5] Add `DELETE /api/gardens/:id` to `backend/src/routes/gardens.js` — validate garden belongs to `req.userId`; count owner's total gardens; reject with 400 if only one remains; cascade-delete all `GardenBed` docs with `{ gardenId }`; if deleted garden was `user.activeGardenId`, set `activeGardenId` to most-recently-created remaining garden; return `{ message: 'Garden deleted' }`
- [X] T032 [US5] Write backend tests in `backend/src/__tests__/gardens.test.js` — delete with 2 gardens → 200 + beds removed; beds belonging to other garden untouched; delete last garden → 400; delete active garden → `activeGardenId` updated to remaining garden; wrong owner → 403/404

### Frontend — US5

- [X] T033 [US5] Add delete garden option to own-garden switcher area in `frontend/src/components/AppLayout.jsx` — delete icon/button next to non-active gardens; confirmation (`confirm()`) before calling `DELETE /api/gardens/:id`; on success invalidates `['gardens']` query; update `GardenContext.jsx` to handle the case where active garden is deleted (set `currentGardenId` to the value returned by the backend via a fresh `GET /api/gardens` or from the updated auth response)

**Checkpoint**: US5 functional — full garden lifecycle (create → use → delete) works.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Dimensions modal wiring, profile cleanup, migration validation, lint/tests.

- [X] T034 [P] Update `frontend/src/components/GardenDimensionsModal.jsx` — replace `PUT /api/auth/me/garden` call with `PUT /api/gardens/:currentGardenId`; invalidate `['gardens']` on success
- [X] T035 [P] Update `frontend/src/pages/Profile.jsx` — garden name/dimensions/image section was already absent; no changes needed
- [ ] T036 Run migration and verify: `node backend/src/seed/migrateToMultiGarden.js` against dev Docker stack; confirm all existing users have `activeGardenId` set and all beds have `gardenId` set
- [X] T037 [P] Run full backend test suite `cd backend && npm test` — 221/221 tests passing
- [X] T038 [P] Run frontend lint `cd frontend && npm run lint` — zero ESLint errors
- [X] T039 Review and update Playwright E2E tests — updated `beds.spec.js` createBed/setGardenDimensions helpers to pass gardenId; updated register route to auto-create default garden for owners; updated auth.test.js to expect gardenName: 'My Garden' on register

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3–7 (User Stories)**: All depend on Phase 2 completion
  - US stories can proceed sequentially P1 → P2 → P3 → P4 → P5
  - US3–US5 share the `gardens.js` route file — avoid parallel work on the same file
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Foundational complete; no story dependencies — start first
- **US2 (P2)**: Depends on US1 (GardenContext + `currentGardenId` must exist for pages to use it)
- **US3 (P3)**: Depends on US2 (`POST /api/gardens` base route exists to add clone path to)
- **US4 (P4)**: Depends on US2 (garden creation infrastructure exists)
- **US5 (P5)**: Depends on US1 (needs garden list to be functional)

### Within Each User Story

- Backend models/routes before frontend
- Test tasks immediately after the route they test
- `GardenContext.jsx` changes before page-level updates

### Parallel Opportunities

- T002, T003, T004 (model files) — different files, safe to run together
- T008, T009 (access.js, gardens.js GET) — different files
- T015, T016, T017 (POST gardens, PUT gardens, POST beds) — different parts of gardens.js / beds.js
- T022, T023, T024 (GardenBeds, GardenMap, BedDetail) — different page files
- T037, T038 (backend tests, frontend lint) — different commands

---

## Parallel Example: Phase 2 Foundational

```bash
# Run in parallel (different files):
Task T002: Create Garden.js model
Task T003: Add gardenId to GardenBed.js
Task T004: Add activeGardenId to User.js
```

## Parallel Example: Phase 4 US2 Frontend

```bash
# Run in parallel after T020 (NewGardenModal) is complete:
Task T022: Update GardenBeds.jsx
Task T023: Update GardenMap.jsx
Task T024: Update BedDetail.jsx
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006)
3. Complete Phase 3: US1 — Switch (T007–T014)
4. **STOP and VALIDATE**: Switching works; beds/map scope to active garden
5. Complete Phase 4: US2 — Create Blank (T015–T024)
6. **STOP and VALIDATE**: Full create → switch → view cycle works
7. Deploy/demo — users can manage multiple gardens

### Incremental Delivery After MVP

1. Add Phase 5 (US3 Copy) → seasonal copy workflow
2. Add Phase 6 (US4 CSV) → power-user import
3. Add Phase 7 (US5 Delete) → cleanup capability
4. Run Phase 8 (Polish) → production-ready

---

## Notes

- Run `node backend/src/seed/migrateToMultiGarden.js` in the Docker dev stack before testing any story
- `gardenImage` stays on `User` (not moved to Garden) — no image endpoints on `/api/gardens`
- `PUT /api/auth/me/garden` (old dimensions route) is kept in `auth.js` for backward compat until `GardenDimensionsModal` is updated in T034
- `GardenBed.gardenId` is `required: true` — migration must run before any new bed creates
- Helpers track their own `currentGardenId` independently from the owner's `activeGardenId`
- `[P]` = different files, no incomplete-task dependencies — safe to run concurrently
- Commit after each checkpoint to keep rollback points clean
