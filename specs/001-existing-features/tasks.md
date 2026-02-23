---

description: "Task list for GardenHive existing application baseline verification"
---

# Tasks: GardenHive — Existing Application Baseline

**Input**: Design documents from `specs/001-existing-features/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Scope note**: This spec documents an existing application. Tasks are framed as
verification and gap-filling rather than greenfield implementation. Each task
confirms that a user story's acceptance scenarios are met by the existing code,
adds missing test coverage for edge cases called out in the spec, and produces
evidence that the baseline is ready for future feature development.

---

## Phase 1: Setup (Environment Verification)

**Purpose**: Confirm the local development environment is fully operational
before beginning any story verification.

- [ ] T001 Follow `specs/001-existing-features/quickstart.md` Option B and verify backend starts on `http://localhost:5000`
- [ ] T002 [P] Run `npm run seed:all` in `backend/` and confirm no errors; verify demo accounts exist in MongoDB
- [ ] T003 [P] Start `frontend/` dev server and confirm landing page renders at `http://localhost:5173`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the test harness and CI pipeline are green before any
story-level verification. Every user story depends on this phase being complete.

**⚠️ CRITICAL**: No story verification can begin until this phase is complete.

- [ ] T004 Run `npm test` in `backend/` and confirm all 5 test suites (`auth`, `beds`, `plants`, `harvests`, `access`) pass with zero failures
- [ ] T005 [P] Run `npm run lint` in `frontend/` and confirm zero ESLint errors
- [ ] T006 [P] Confirm `GET /api/health` returns `{ status: "ok" }` with HTTP 200 on the running server
- [ ] T007 [P] Audit `backend/src/__tests__/` against all acceptance scenarios in `specs/001-existing-features/spec.md` and list any scenarios with no corresponding test
- [ ] T008 Document each gap found in T007 as a comment block at the top of the relevant test file (e.g. `// GAP: no test for <scenario>`) for follow-up

**Checkpoint**: Test suite green, ESLint clean, health endpoint live → story verification can begin in parallel.

---

## Phase 3: User Story 1 — Account Registration & Authentication (Priority: P1)

**Goal**: Confirm every auth acceptance scenario and edge case from the spec is
covered by the existing tests and works correctly end-to-end.

**Independent Test**: Register a new account, reach the Dashboard, log out, log
back in — all without touching any other feature.

- [ ] T009 [P] [US1] Confirm `POST /api/auth/register` happy path test exists in `backend/src/__tests__/auth.test.js`: returns 201, `token` string, correct `user` shape, no `passwordHash` field
- [ ] T010 [P] [US1] Confirm test exists for duplicate email → 409 in `backend/src/__tests__/auth.test.js`
- [ ] T011 [P] [US1] Confirm test exists for password < 6 characters → 400 in `backend/src/__tests__/auth.test.js`
- [ ] T012 [P] [US1] Confirm test exists for invalid `role` value → 400 in `backend/src/__tests__/auth.test.js`
- [ ] T013 [US1] Confirm test exists for deactivated helper login → 401 `"This account has been deactivated"` in `backend/src/__tests__/auth.test.js`
- [ ] T014 [US1] Confirm test exists for expired/missing token on protected route → 401 in `backend/src/__tests__/auth.test.js`
- [ ] T015 [US1] Confirm test exists for pending `GardenAccess` grants auto-activating on registration in `backend/src/__tests__/auth.test.js`
- [ ] T016 [US1] Manual validation: register, navigate dashboard, log out, log back in — confirm session clears on logout and redirects to `/login`

**Checkpoint**: All P1 auth scenarios confirmed. US1 independently validated.

---

## Phase 4: User Story 2 — Garden Bed Planning & Management (Priority: P2)

**Goal**: Confirm bed CRUD, cell assignment/clearing, and permission enforcement
are all tested and working.

**Independent Test**: Create a bed, fill several cells with plants, rename the
bed, then delete it — without logging any harvests or inviting anyone.

- [ ] T017 [P] [US2] Confirm test exists for `POST /api/beds` → 201 and `GET /api/beds` list in `backend/src/__tests__/beds.test.js`
- [ ] T018 [P] [US2] Confirm test exists for `PUT /api/beds/:id/cells` assigning a plant and clearing it (`plantId: null`) in `backend/src/__tests__/beds.test.js`
- [ ] T019 [P] [US2] Confirm test exists for `PUT /api/beds/:id` (rename) in `backend/src/__tests__/beds.test.js`
- [ ] T020 [P] [US2] Confirm test exists for `DELETE /api/beds/:id` → 200 and subsequent `GET` → 404 in `backend/src/__tests__/beds.test.js`
- [ ] T021 [US2] Confirm test exists: helper with `full` permission can assign cells but `POST /api/beds` → 403 in `backend/src/__tests__/beds.test.js`
- [ ] T022 [US2] Confirm test exists: helper with `analytics` permission gets 403 on all bed routes in `backend/src/__tests__/beds.test.js`
- [ ] T023 [US2] Manual validation: create bed, assign plants to 5 cells, rename bed, clear one cell, delete bed — confirm in browser

**Checkpoint**: All P2 bed scenarios confirmed. US2 independently validated.

---

## Phase 5: User Story 3 — Plant Library Browsing & Custom Plants (Priority: P3)

**Goal**: Confirm system plant visibility, custom plant CRUD, deletion guards,
and the hidden-plants toggle are all tested and working.

**Independent Test**: Search and filter the plant library, create a custom plant,
edit it, hide a system plant, verify it disappears from the picker.

- [ ] T024 [P] [US3] Confirm test exists: `GET /api/plants` returns system plants + owner's custom plants in `backend/src/__tests__/plants.test.js`
- [ ] T025 [P] [US3] Confirm test exists: `?search=` and `?category=` filters narrow results correctly in `backend/src/__tests__/plants.test.js`
- [ ] T026 [P] [US3] Confirm test exists: `POST /api/plants` creates custom plant with `ownerId` set to requesting user in `backend/src/__tests__/plants.test.js`
- [ ] T027 [P] [US3] Confirm test exists: `PUT /api/plants/:id` updates editable fields; 403 if not owner in `backend/src/__tests__/plants.test.js`
- [ ] T028 [US3] Confirm test exists: `DELETE /api/plants/:id` blocked with 400 when plant is in a bed cell in `backend/src/__tests__/plants.test.js`
- [ ] T029 [US3] Confirm test exists: `DELETE /api/plants/:id` blocked with 400 when plant has harvest records in `backend/src/__tests__/plants.test.js`
- [ ] T030 [US3] Confirm test exists: `POST /api/auth/me/hidden-plants` toggles plant in/out of hidden list in `backend/src/__tests__/plants.test.js` or `auth.test.js`
- [ ] T031 [US3] Confirm test exists: `GET /api/plants?showAll=true` includes hidden plants annotated with `hidden: true` in `backend/src/__tests__/plants.test.js`
- [ ] T032 [US3] Manual validation: browse plants, create custom plant, edit it, hide a system plant, verify it leaves picker, reveal it — confirm in browser

**Checkpoint**: All P3 plant scenarios confirmed. US3 independently validated.

---

## Phase 6: User Story 4 — Harvest Logging & History (Priority: P4)

**Goal**: Confirm harvest creation (with auto-season derivation), history
listing/filtering, deletion, and permission enforcement are all tested.

**Independent Test**: Log three harvests for different plants and dates, filter
by plant, delete one — confirm all actions persist correctly.

- [ ] T033 [P] [US4] Confirm test exists: `POST /api/harvests` → 201 with correct `season` derived from `harvestedAt` in `backend/src/__tests__/harvests.test.js`
- [ ] T034 [P] [US4] Add test (or confirm existing): season derivation for all four boundary dates — March 1 (Spring), June 1 (Summer), September 1 (Fall), December 1 (Winter) — in `backend/src/__tests__/harvests.test.js`
- [ ] T035 [P] [US4] Confirm test exists: `GET /api/harvests?season=X` and `?plantId=X` filters return only matching entries in `backend/src/__tests__/harvests.test.js`
- [ ] T036 [P] [US4] Confirm test exists: `DELETE /api/harvests/:id` → 200; subsequent `GET` no longer includes it in `backend/src/__tests__/harvests.test.js`
- [ ] T037 [US4] Confirm test exists: helper with `harvests_analytics` can `POST` and `DELETE`; helper with `analytics` gets 403 on `POST` in `backend/src/__tests__/harvests.test.js`
- [ ] T038 [US4] Confirm test exists: `loggedById` is set to the helper's ID when a helper logs a harvest in `backend/src/__tests__/harvests.test.js`
- [ ] T039 [US4] Manual validation: log harvest with today's date, verify season auto-populated, filter by plant, delete one entry — confirm in browser

**Checkpoint**: All P4 harvest scenarios confirmed. US4 independently validated.

---

## Phase 7: User Story 5 — Analytics & Harvest Reporting (Priority: P5)

**Goal**: Confirm all five analytics endpoints return correct shapes, handle
date-range filters, and return empty arrays (not errors) when no data exists.

**Independent Test**: With seeded data, open Analytics page and confirm at least
one chart is populated; open with empty DB and confirm empty states not errors.

- [ ] T040 [P] [US5] Confirm test exists: `GET /api/harvests/totals` returns `plantId, season, unit, plantName, total, count` shape in `backend/src/__tests__/harvests.test.js`
- [ ] T041 [P] [US5] Confirm test exists: `GET /api/harvests/totals?from=&to=` date-range filter narrows results in `backend/src/__tests__/harvests.test.js`
- [ ] T042 [P] [US5] Confirm test exists: `GET /api/harvests/yoy` returns `{ years: [...], data: [{ month, YYYY_oz, YYYY_count }] }` shape in `backend/src/__tests__/harvests.test.js`
- [ ] T043 [P] [US5] Confirm test exists: `GET /api/harvests/weekly?year=` returns array trimmed to last non-zero week in `backend/src/__tests__/harvests.test.js`
- [ ] T044 [P] [US5] Confirm test exists: `GET /api/harvests/monthly` returns exactly 12 entries with `{ month, totalOz, entries }` shape in `backend/src/__tests__/harvests.test.js`
- [ ] T045 [US5] Confirm test exists (or add): all analytics endpoints return empty array `[]` (not 500) when the garden has no harvest data in `backend/src/__tests__/harvests.test.js`
- [ ] T046 [US5] Manual validation: open Dashboard with seeded data — confirm monthly chart and pie chart render; open Analytics page and verify all four chart sections load in browser

**Checkpoint**: All P5 analytics scenarios confirmed. US5 independently validated.

---

## Phase 8: User Story 6 — Garden Sharing & Collaborative Access (Priority: P6)

**Goal**: Confirm the full invite lifecycle — pending invite, auto-activation on
registration, permission update, revocation — is tested and working.

**Independent Test**: Owner invites new email → grantee registers → access
activates → owner revokes — all testable without bed or harvest operations.

- [ ] T047 [P] [US6] Confirm test exists: `POST /api/access` with unregistered email creates grant with `status: pending` in `backend/src/__tests__/access.test.js`
- [ ] T048 [P] [US6] Confirm test exists: registering with an invited email activates pending grants in `backend/src/__tests__/access.test.js`
- [ ] T049 [P] [US6] Confirm test exists: `POST /api/access` with already-registered email creates grant with `status: active` immediately in `backend/src/__tests__/access.test.js`
- [ ] T050 [P] [US6] Confirm test exists: duplicate invite (same owner + email) → 409 in `backend/src/__tests__/access.test.js`
- [ ] T051 [P] [US6] Confirm test exists: self-invite → 400 `"You cannot invite yourself"` in `backend/src/__tests__/access.test.js`
- [ ] T052 [US6] Confirm test exists: `PUT /api/access/:id` updates permission; `DELETE /api/access/:id` revokes grant in `backend/src/__tests__/access.test.js`
- [ ] T053 [US6] Confirm test exists: `GET /api/access/shared` returns active gardens for grantee with `ownerName, gardenName, permission` shape in `backend/src/__tests__/access.test.js`
- [ ] T054 [US6] Manual validation: invite helper@example.com, register with that email, switch to shared garden in sidebar, verify data scoped to owner — confirm in browser

**Checkpoint**: All P6 sharing scenarios confirmed. US6 independently validated.

---

## Phase 9: User Story 7 — Profile & Account Settings (Priority: P7)

**Goal**: Confirm name update, password change, garden identity, image upload,
and both deletion modes (hard/soft) are tested and working.

**Independent Test**: Update name, set garden name, upload image, change password,
verify new password works on login.

- [ ] T055 [P] [US7] Confirm test exists: `PUT /api/auth/me` updates `name`; returns updated user payload in `backend/src/__tests__/auth.test.js`
- [ ] T056 [P] [US7] Confirm test exists: `PUT /api/auth/me/password` with wrong current password → 400; with correct → 200 in `backend/src/__tests__/auth.test.js`
- [ ] T057 [P] [US7] Confirm test exists: `PUT /api/auth/me/garden` sets `gardenName`; empty string clears it in `backend/src/__tests__/auth.test.js`
- [ ] T058 [US7] Confirm test exists: `DELETE /api/auth/me` for owner role hard-deletes User + GardenBed + Harvest + GardenAccess records in `backend/src/__tests__/auth.test.js`
- [ ] T059 [US7] Confirm test exists: `DELETE /api/auth/me` for helper role sets `active: false` and deletes their GardenAccess records; owner data untouched in `backend/src/__tests__/auth.test.js`
- [ ] T060 [US7] Confirm (or add) test: `POST /api/auth/me/garden-image` with non-image MIME type → 400 error in `backend/src/__tests__/auth.test.js`
- [ ] T061 [US7] Manual validation: update display name, change password, log out, log back in with new password — confirm in browser

**Checkpoint**: All P7 profile scenarios confirmed. US7 independently validated.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Coverage report, CI verification, documentation sync, and
quickstart end-to-end validation.

- [ ] T062 [P] Run `npm run test:coverage` in `backend/` and confirm all 5 route files appear in the coverage report; save output to `backend/coverage/`
- [ ] T063 [P] Verify the GitHub Actions CI workflow (`.github/workflows/deploy.yml`) runs the test step before the build step; confirm test failure blocks deploy
- [ ] T064 Review `README.md` against `specs/001-existing-features/contracts/` and update any outdated route descriptions or missing endpoints (`/api/access`, `/api/auth/me/garden`, `/api/auth/me/garden-image`)
- [ ] T065 Run the full quickstart validation checklist in `specs/001-existing-features/quickstart.md` from a clean environment and confirm all 7 checkboxes pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all story phases
- **US1 Auth (Phase 3)**: Depends on Foundational — no dependency on other stories
- **US2 Beds (Phase 4)**: Depends on Foundational — no dependency on other stories
- **US3 Plants (Phase 5)**: Depends on Foundational — no dependency on other stories
- **US4 Harvests (Phase 6)**: Depends on Foundational — no dependency on other stories
- **US5 Analytics (Phase 7)**: Depends on Foundational — no dependency on other stories
- **US6 Sharing (Phase 8)**: Depends on Foundational — no dependency on other stories
- **US7 Profile (Phase 9)**: Depends on Foundational — no dependency on other stories
- **Polish (Phase 10)**: Depends on all user story phases completing

### User Story Dependencies

All 7 user stories depend only on Phase 2 (Foundational) completing.
They are **fully independent** of each other — all can proceed in parallel once
the test suite is green.

### Within Each User Story

- Parallel confirmation tasks (marked `[P]`) can all run simultaneously
- Manual validation task (last in each story) must follow the parallel tasks
- Complete each story fully before marking it done

---

## Parallel Execution Examples

### Parallel: All Setup tasks simultaneously

```bash
# Launch in parallel:
Task: "Start backend dev server (T001)"
Task: "Run seed:all and verify demo accounts (T002)"
Task: "Start frontend dev server (T003)"
```

### Parallel: Run all story phases simultaneously (after Phase 2 complete)

```bash
# All independent — launch together:
Task: "US1 Auth verification (T009–T016)"
Task: "US2 Beds verification (T017–T023)"
Task: "US3 Plants verification (T024–T032)"
Task: "US4 Harvests verification (T033–T039)"
Task: "US5 Analytics verification (T040–T046)"
Task: "US6 Sharing verification (T047–T054)"
Task: "US7 Profile verification (T055–T061)"
```

### Parallel: Within User Story 4 (Harvests)

```bash
# All can run simultaneously:
Task: "T033 Confirm POST /api/harvests season derivation test"
Task: "T034 Add four-season boundary date tests"
Task: "T035 Confirm GET /api/harvests filter tests"
Task: "T036 Confirm DELETE /api/harvests/:id test"
```

---

## Implementation Strategy

### MVP First (Foundational + User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Auth)
4. **STOP and VALIDATE**: `npm test` passes, manual login/logout cycle works
5. Ship or demo if needed

### Incremental Verification

1. Complete Setup + Foundational → baseline is green
2. Verify US1 (Auth) → login/session management confirmed
3. Verify US2 (Beds) → core planning feature confirmed
4. Verify US3 (Plants) → library and custom plants confirmed
5. Verify US4 (Harvests) → data entry confirmed
6. Verify US5 (Analytics) → reporting confirmed
7. Verify US6 (Sharing) → collaboration confirmed
8. Verify US7 (Profile) → account management confirmed
9. Run Polish → docs synced, coverage captured

### Parallel Team Strategy

With multiple contributors:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Contributor A: US1 + US2
   - Contributor B: US3 + US4
   - Contributor C: US5 + US6 + US7
3. All converge on Polish phase

---

## Notes

- `[P]` = parallelizable (different files, no dependencies on incomplete tasks in same phase)
- `[USN]` = maps task to user story N from `spec.md`
- Manual validation tasks (no `[P]`) require the running dev server
- Verification tasks that find a gap should add a test rather than mark as done without one
- Tests MUST use `mongodb-memory-server` — never a shared DB (constitution principle VI)
- `passwordHash` must never appear in any API response — assert this in every auth test (constitution principle VI)
- Commit after each phase or logical group of tasks
