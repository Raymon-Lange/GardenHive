# Tasks: Standard Garden Plan for Free Users

**Input**: Design documents from `/specs/011-standard-guest-plan/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Not requested — manual verification per quickstart.md + E2E suite update.

**Organization**: Two user stories (US1, US2), both P1. US2 (route swap + delete) depends on US1 (new page) existing, so US1 must complete first.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

No new packages, no new infrastructure. Nothing to set up.

---

## Phase 2: Foundational (Blocking Prerequisites)

No shared infrastructure changes required before user stories. Proceed directly to Phase 3.

---

## Phase 3: User Story 1 — Multi-Bed Garden Planning (Priority: P1) 🎯 MVP

**Goal**: Build `StandardGuestPlanner.jsx` — a full multi-bed, localStorage-persisted garden planner at `/planner`. Update `Signup.jsx` carry-over to transfer all guest beds to the new account.

**Independent Test**: Navigate to `/planner` without logging in. Add two beds with different dimensions and plant at least one cell in each. Download the PDF and verify both beds appear on the map. Close the browser, reopen `/planner`, confirm both beds are still present. Click "Sign up to save", register, and verify both beds appear on `/map`.

### Implementation for User Story 1

- [X] T001 [US1] Create `frontend/src/pages/StandardGuestPlanner.jsx` with: localStorage state management (`gh_guest_garden`, default `{gardenWidth:10, gardenHeight:10, beds:[]}`) auto-saved via `useEffect`; garden dimensions display with editable width/height inputs; add-bed form (name, cols/width, rows/height) with auto-placement algorithm (row-first scan for first non-overlapping position within garden bounds); garden grid (SVG dot grid + positioned bed tiles at `mapCol×CELL_PX` / `mapRow×CELL_PX`, `CELL_PX=28`); click-bed → cell editor modal (rows×cols grid with plant picker reusing the `PlantPicker` component from the existing file); PDF download reusing `GardenMap.handleDownloadPdf` logic with `GardenPrintView` (pass `printBeds` mapped from guest beds: `_id=bed.id`, `cells` with `plantId=cell.plant`); "Sign up to save" button that calls `navigate('/signup')` (localStorage already contains the plan); localStorage-unavailable warning banner; remove-bed button per bed; beds legend list — per plan.md Implementation Approach

- [X] T002 [P] [US1] Update `frontend/src/pages/Signup.jsx`: replace the `sessionStorage.getItem('gh_guest_bed')` carry-over block with a `localStorage.getItem('gh_guest_garden')` multi-bed carry-over — call `PUT /api/auth/me/garden` first (gardenWidth, gardenHeight), then for each bed sequentially: `POST /api/beds`, `PUT /api/beds/:id` (mapRow/mapCol), `PUT /api/beds/:id/cells` (if cells.length > 0); call `localStorage.removeItem('gh_guest_garden')`; `navigate('/map')` instead of `/beds/:id` — per plan.md carry-over sequence and data-model.md API mapping table

**Checkpoint**: `/planner` loads the new multi-bed planner with 10×10 default dimensions. Beds persist across reload. PDF shows all beds. Sign-up carry-over transfers all beds to `/map`.

---

## Phase 4: User Story 2 — Replace the Planner Route (Priority: P1)

**Goal**: Swap the `/planner` route to use `StandardGuestPlanner`, then delete the now-unused `GuestPlanner.jsx`.

**Independent Test**: Navigate to `/planner` — old single-bed setup form (rows/cols inputs, "Start planning" button) is gone. Landing page "Try free planner" CTA reaches the new experience.

### Implementation for User Story 2

- [X] T003 [US2] Update `frontend/src/App.jsx`: replace `import GuestPlanner from './pages/GuestPlanner'` with `import StandardGuestPlanner from './pages/StandardGuestPlanner'`; replace `<Route path="/planner" element={<GuestPlanner />} />` with `<Route path="/planner" element={<StandardGuestPlanner />} />`

- [X] T004 [US2] Delete `frontend/src/pages/GuestPlanner.jsx` (no longer imported after T003)

**Checkpoint**: `/planner` serves `StandardGuestPlanner`. Old single-bed form cannot be reached. Landing CTA works.

---

## Phase 5: Polish & Validation

- [X] T005 [P] Update `tests/e2e/guest-planner.spec.js`: update existing tests — (1) `guest can access /planner` — change selector from rows/cols inputs to the new planner heading or add-bed button; (2) `plant picker opens when clicking a cell after setup` — add a bed first, click bed tile, then click a cell; (3) `sign-up carry-over` — verify redirect lands on `/map` and multiple beds are present, verify `gh_guest_garden` localStorage key is removed; (4) `landing page CTA` — no change needed; add new test: `plan persists after reload` — add a bed, reload page, verify bed still present

- [X] T006 Run ESLint — `cd frontend && npm run lint` — confirm zero new errors in `StandardGuestPlanner.jsx`, `Signup.jsx`, `App.jsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 3 (US1)**: No dependencies — start immediately
  - T001 and T002 are in different files and can run in **parallel**
- **Phase 4 (US2)**: Depends on T001 completing (App.jsx must import an existing file)
  - T003 depends on T001
  - T004 depends on T003 (safe to delete only after App.jsx no longer imports it)
- **Phase 5 (Polish)**: T005 depends on T001 + T003 (needs new page behaviour); T006 after all code changes

### User Story Dependencies

- **US1 (P1)**: No dependencies — start immediately
- **US2 (P1)**: Depends on US1 completing T001 (file must exist before App.jsx imports it)

### Within Each Story

- T001 and T002 touch different files → **parallel**
- T003 → T004 (sequential within US2)

---

## Parallel Opportunities

```
# Phase 3 — run in parallel:
T001  Create frontend/src/pages/StandardGuestPlanner.jsx
T002  Update frontend/src/pages/Signup.jsx

# Phase 4 — sequential:
T003  Update frontend/src/App.jsx          (after T001 done)
T004  Delete frontend/src/pages/GuestPlanner.jsx  (after T003 done)

# Phase 5 — run in parallel after T001+T003:
T005  Update tests/e2e/guest-planner.spec.js
T006  Run lint
```

---

## Implementation Strategy

### MVP (US1 + US2 together — inseparable)

1. Complete T001 (new page) in parallel with T002 (Signup carry-over)
2. Complete T003 (App.jsx swap) — makes new page live
3. Complete T004 (delete old page) — removes dead code
4. **STOP and VALIDATE**: manual quickstart Scenarios A–G
5. Complete T005 (E2E tests) + T006 (lint)

### Notes

- T001 is the largest task — the plan.md Implementation Approach section contains the exact code structure needed
- The `PlantPicker` component can be copied verbatim from `GuestPlanner.jsx` before that file is deleted — or extracted to a shared component if reuse becomes a concern (currently only two consumers)
- `CELL_PX = 28` matches `GardenMap.jsx` for visual consistency
- Garden dimensions validation in `PUT /api/beds/:id` requires `PUT /api/auth/me/garden` to be called first during carry-over — critical ordering
