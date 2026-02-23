# Tasks: Garden Map with Drag-and-Snap Bed Placement

**Input**: Design documents from `/specs/002-garden-map-snap/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included — Constitution Principle VI mandates test coverage for all modified route files.

**Organization**: Tasks grouped by user story (P1 → P2 → P3) to enable independent delivery of each increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in every description

## Path Conventions

- Backend source: `backend/src/`
- Backend tests: `backend/src/__tests__/`
- Frontend source: `frontend/src/`

---

## Phase 1: Setup (Baseline Verification)

**Purpose**: Confirm the feature branch is clean before any changes.

- [ ] T001 Run `npm test` in `backend/` on branch `002-garden-map-snap` to establish a passing baseline before any modifications

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend model and route changes that ALL three user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 [P] Add `gardenWidth: { type: Number, min: 1, default: null }` and `gardenHeight: { type: Number, min: 1, default: null }` fields to the userSchema in `backend/src/models/User.js`
- [ ] T003 [P] Update `userPayload()` in `backend/src/routes/auth.js` to include `gardenWidth: user.gardenWidth ?? null` and `gardenHeight: user.gardenHeight ?? null` so all auth responses expose the new fields
- [ ] T004 Extend the `PUT /api/beds/:id` handler in `backend/src/routes/beds.js` to accept optional `mapRow` and `mapCol` body fields — validate non-negative integers; load owner's `gardenWidth`/`gardenHeight` from User and return 400 if not set; check footprint fits within garden boundary (400); run AABB overlap check against all other placed beds and return 409 if collision; update the document only when all checks pass (depends on T002)

**Checkpoint**: Foundation ready — all user story work can now begin.

---

## Phase 3: User Story 1 — Set Up Garden Dimensions (Priority: P1) 🎯 MVP

**Goal**: Owner sets garden width and height on first visit; the map grid renders at those dimensions from then on.

**Independent Test**: Register a new account, navigate to Garden Map, observe the dimension prompt, submit valid values, verify the correctly-sized grid appears, refresh, confirm no re-prompt.

### Implementation for User Story 1

- [ ] T005 [US1] Extend the `PUT /api/auth/me/garden` handler in `backend/src/routes/auth.js` to accept optional `gardenWidth` and `gardenHeight` — validate positive integers (400 on failure); when reducing size, check that no placed bed's footprint `(mapCol + cols > new width || mapRow + rows > new height)` would be clipped (400 `"Garden dimensions are smaller than existing bed placements"`); save and return `userPayload(user)` (depends on T002, T003)
- [ ] T006 [P] [US1] Write backend tests for `PUT /api/auth/me/garden` dimensions in `backend/src/__tests__/auth.test.js` — cover: happy path sets width/height, fractional value rejected (400), zero rejected (400), negative rejected (400), null clears the field, reducing below a placed bed's bounding box rejected (400) (depends on T005)
- [ ] T007 [P] [US1] Create `frontend/src/components/GardenDimensionsModal.jsx` — two controlled number inputs (width, height), client-side validation (positive integer required), submit calls `PUT /api/auth/me/garden` via Axios mutation, on success invalidates `['user']` query via `queryClient.invalidateQueries`, passes result to `onSave(width, height)` prop; modal is not dismissible without submitting on first visit
- [ ] T008 [US1] Update `frontend/src/pages/GardenMap.jsx` to read `user.gardenWidth` and `user.gardenHeight` from `AuthContext`; render `<GardenDimensionsModal>` in place of the grid when either is null; replace the derived `totalCols`/`totalRows` (currently computed from max bed positions) with `user.gardenWidth`/`user.gardenHeight`; show an empty grid with grid-dot background when no beds are placed yet (depends on T007)

**Checkpoint**: US1 complete — a new user can configure garden dimensions and see the correct grid. Independently testable.

---

## Phase 4: User Story 2 — Create and Place a New Garden Bed (Priority: P2)

**Goal**: Owner creates a bed with specified dimensions, it appears on the map, and can be dragged to snap to any empty grid position.

**Independent Test**: With garden dimensions set, click "+ Add Bed", fill in the form, confirm the bed appears as an unplaced tile, drag it to an empty area of the grid, release, confirm snap to nearest cell, refresh, confirm position persists.

### Implementation for User Story 2

- [ ] T009 [P] [US2] Write backend tests for `PUT /api/beds/:id` with `mapRow`/`mapCol` in `backend/src/__tests__/beds.test.js` — cover: happy path positions a bed and returns 200 with updated document; boundary violation returns 400; overlap with another placed bed returns 409; owner without garden dimensions set returns 400; helper role attempting position update returns 403 (depends on T004)
- [ ] T010 [US2] Add unplaced bed staging area and "+ Add Bed" creation form to `frontend/src/pages/GardenMap.jsx` — add a "+ Add Bed" button (owner-only, hidden for helpers); inline form collects bed name, rows (height in ft), cols (width in ft); on submit calls `POST /api/beds` mutation and invalidates `['beds']`; render unplaced beds (where `mapRow == null || mapCol == null`) as draggable tiles in a staging row below the grid (depends on T008)
- [ ] T011 [US2] Implement pointer-events drag-and-snap in `frontend/src/pages/GardenMap.jsx` — add `ref` to the grid container for `getBoundingClientRect()`; add `useState` for `dragging: null | { bedId, grabOffsetX, grabOffsetY, liveRow, liveCol, originRow, originCol }`; on `onPointerDown` (beds): record grab offset from bed top-left, call `e.currentTarget.setPointerCapture(e.pointerId)`; on `onPointerMove` (grid container): compute snap col/row from pointer minus grab offset divided by `CELL_PX`, clamp within `[0, gardenWidth - bed.cols]` × `[0, gardenHeight - bed.rows]`, update `dragging.liveRow`/`liveCol`; on `onPointerUp` (grid container): run AABB overlap check against all non-dragging placed beds; if clear call `PUT /api/beds/:id` mutation with `{ mapRow: liveRow, mapCol: liveCol }` and invalidate `['beds']`; if overlap revert to origin; render dragged bed at `liveRow`/`liveCol` from state with reduced opacity; add `style={{ touchAction: 'none' }}` to every draggable bed element (depends on T010, T004)

**Checkpoint**: US2 complete — new beds can be created and dragged onto the grid with snap. Independently testable.

---

## Phase 5: User Story 3 — Move an Existing Placed Bed (Priority: P3)

**Goal**: Any placed bed on the map can be picked up and dragged to a new position using the same snap interaction.

**Independent Test**: With at least two beds placed on the map, drag one to a different empty position, release, confirm new position, refresh, confirm persistence.

### Implementation for User Story 3

- [ ] T012 [US3] Apply drag-and-snap handlers to existing placed beds in `frontend/src/pages/GardenMap.jsx` — confirm that placed beds (where `mapRow != null && mapCol != null`) also receive `onPointerDown` with the same drag handler as unplaced staging tiles; add a pointer-distance threshold check (≥ 8 px of movement before activating drag) to distinguish an intentional drag from an accidental tap (depends on T011)
- [ ] T013 [US3] Resolve click-to-navigate vs drag conflict on placed beds in `frontend/src/pages/GardenMap.jsx` — replace the full-bed `<button onClick={navigate}>` with a small "Open" icon button (e.g., Lucide `ExternalLink` icon) positioned at the top-right corner of each placed bed; the rest of the bed surface handles pointer events for dragging; update the beds legend at the bottom to also navigate on click (depends on T012)

**Checkpoint**: US3 complete — existing placed beds are repositionable. All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation sync, validation, and final quality gate.

- [ ] T014 [P] Update `specs/001-existing-features/contracts/auth.md` — add `gardenWidth: number | null` and `gardenHeight: number | null` to the user object shape at the top of the file to keep the baseline contract in sync
- [ ] T015 [P] Run the manual validation checklist from `specs/002-garden-map-snap/quickstart.md` — work through all scenarios (US1, US2, US3) and confirm every checklist item passes
- [ ] T016 Run `npm test` in `backend/` and confirm all tests pass (T006 + T009 new tests included); run `npm run lint` in `frontend/` and confirm zero errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 complete
- **US2 (Phase 4)**: Depends on Phase 2 complete AND US1 Phase 3 complete (frontend gating on dimensions requires US1's grid to be in place)
- **US3 (Phase 5)**: Depends on US2 Phase 4 complete (drag infrastructure built in US2)
- **Polish (Phase 6)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2 — no inter-story dependencies
- **US2 (P2)**: Unblocked after US1 (frontend grid must exist before placing beds via drag)
- **US3 (P3)**: Unblocked after US2 (drag infrastructure is built in US2; US3 extends it)

### Within Each Phase

- **Phase 2**: T002 and T003 can run in parallel; T004 depends on T002
- **Phase 3**: T005 sequential (backend route); T006 and T007 can run in parallel after T005; T008 depends on T007
- **Phase 4**: T009 and T010 can run in parallel (different files — backend test vs frontend); T011 depends on T010
- **Phase 5**: T012 then T013 sequentially (same file, logical dependency)
- **Phase 6**: T014, T015 can run in parallel; T016 must be last

---

## Parallel Execution Examples

### Phase 2 — Foundation

```text
Parallel start:
  Task A: T002 — Add gardenWidth/gardenHeight to User model in backend/src/models/User.js
  Task B: T003 — Update userPayload() in backend/src/routes/auth.js

Then sequentially:
  Task C: T004 — Extend PUT /api/beds/:id in backend/src/routes/beds.js  (depends on T002)
```

### Phase 3 — User Story 1

```text
Sequentially:
  T005 — Extend PUT /me/garden handler (backend/src/routes/auth.js)

Parallel after T005:
  Task A: T006 — Write backend tests (backend/src/__tests__/auth.test.js)
  Task B: T007 — Create GardenDimensionsModal (frontend/src/components/GardenDimensionsModal.jsx)

Then sequentially:
  T008 — Update GardenMap.jsx (depends on T007)
```

### Phase 4 — User Story 2

```text
Parallel (both depend only on T004 and T008 being done):
  Task A: T009 — Write backend tests (backend/src/__tests__/beds.test.js)
  Task B: T010 — Add staging area + Add Bed form (frontend/src/pages/GardenMap.jsx)

Then sequentially:
  T011 — Implement drag-and-snap (frontend/src/pages/GardenMap.jsx, depends on T010)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Baseline verification
2. Complete Phase 2: Foundational backend changes (T002, T003, T004)
3. Complete Phase 3: US1 — dimension setup + grid display (T005–T008)
4. **STOP and VALIDATE**: Does the Garden Map show a dimension prompt on first visit? Does the correct grid appear after setup? Does it persist?
5. Ship MVP: users can see and configure their garden grid

### Incremental Delivery

1. Phases 1–2 → Foundation ready
2. Phase 3 (US1) → Map has correct grid size → **Demo: "Your garden is 20×12 ft"**
3. Phase 4 (US2) → Create and place beds → **Demo: Drag-and-snap placement**
4. Phase 5 (US3) → Move existing beds → **Demo: Full interactive layout**
5. Phase 6 → Polish, sync docs, final test pass

---

## Notes

- `[P]` tasks touch different files and have no shared state dependency
- `[Story]` label maps each task to the user story it delivers
- All 3 user stories share the same `GardenMap.jsx` file — work sequentially within phases that touch it
- The AABB overlap check is implemented twice: frontend (immediate UX feedback, revert on fail) and backend (authoritative, 409 on conflict). Both are required per Constitution Principle I.
- `touchAction: 'none'` is required on draggable elements (not a Tailwind v3 utility — use inline `style` prop)
- `setPointerCapture` on `pointerdown` prevents pointer events from escaping the element on fast moves
- Helpers: ensure drag handlers are only attached when `req.gardenPermission === 'owner'` is reflected in the frontend (read from `AuthContext` `user.role`)
