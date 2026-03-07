# Tasks: Improved Bed Planting UI

**Input**: Design documents from `/specs/014-bed-planting-ui/`
**Branch**: `014-bed-planting-ui`
**Prerequisites**: plan.md ✓ spec.md ✓ research.md ✓ data-model.md ✓ contracts/ ✓ quickstart.md ✓

**Tests**: Backend route tests included (required by Constitution §VI for new endpoints). Frontend tests not requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Confirm no new dependencies are needed; branch is ready.

- [X] T001 Confirm no new npm packages are required (all dependencies already installed: Tailwind, Lucide React, TanStack Query, clsx)

---

## Phase 2: Foundational (Blocking — complete before user stories)

**Purpose**: Restructure `BedDetail.jsx` to the two-column layout scaffold and remove the modal. This unblocks all three user stories working in the same file.

**⚠️ CRITICAL**: US1, US2, and US3 all live in `BedDetail.jsx`. This foundation must land first.

- [X] T002 In `frontend/src/pages/BedDetail.jsx` — remove the `PlantPicker` modal component (lines 23–108), the `selectedCell` state, and all references to it
- [X] T003 In `frontend/src/pages/BedDetail.jsx` — replace the page's single-column `<div>` wrapper with a two-column flex layout: `<div className="flex flex-col lg:flex-row lg:gap-6">` with a left column for the grid and a right column placeholder `<aside>` for the plant panel
- [X] T004 Verify the page renders without errors after removal: grid still displays, cells are visible, no console errors (manual check at http://localhost:5173)

**Checkpoint**: BedDetail renders the grid in the left column; right column is empty. No modal code remains.

---

## Phase 3: User Story 1 — Inline Plant Panel (Priority: P1) 🎯 MVP

**Goal**: Plant list always visible beside the grid. Search bar narrows results by partial name match.

**Independent Test**: Open any bed. Without clicking anything, a list of plants with a search input is visible to the right of the grid (desktop) or below it (mobile). Typing "tom" in the search bar shows only tomato-related plants.

- [X] T005 [US1] In `frontend/src/pages/BedDetail.jsx` — extract plant fetching into a `usePlants(ownerId)` hook (already exists as a function — convert to named hook, keep query key `['plants', ownerId]`)
- [X] T006 [US1] In `frontend/src/pages/BedDetail.jsx` — add `search` state (`useState('')`) and build the `<aside>` plant panel: search `<input>` with Lucide `<Search>` icon, filtered plant list (case-insensitive partial match on `plant.name`), each plant shown with emoji + name + `perSqFt`/`daysToHarvest` subtitle
- [X] T007 [US1] In `frontend/src/pages/BedDetail.jsx` — make the plant panel `<aside>` independently scrollable (`overflow-y-auto`) with a fixed max-height on desktop (`lg:max-h-[calc(100vh-12rem)]`) so it does not scroll with the grid
- [X] T008 [US1] In `frontend/src/pages/BedDetail.jsx` — add empty-state ("No plants found") when filtered list is empty

**Checkpoint**: Panel visible, search works, independent scroll confirmed. No stamp behaviour yet — cells do nothing when clicked.

---

## Phase 4: User Story 2 — Stamp Mode (Priority: P2)

**Goal**: Click a plant in the panel to select it (highlighted). Click cells to stamp. Toggle off by clicking the same plant again or the same cell.

**Independent Test**: Select "Tomato" — it highlights. Click three empty cells — all show tomato. Click one tomato cell — it clears. Click "Tomato" in panel again — highlight removed. With no plant selected, clicking a cell does nothing.

- [X] T009 [US2] In `frontend/src/pages/BedDetail.jsx` — add `selectedPlant` state (`useState(null)`) and a `handlePlantSelect(plant)` function: if `plant._id === selectedPlant?._id` → set to null (deselect), else → set to plant
- [X] T010 [US2] In `frontend/src/pages/BedDetail.jsx` — apply visual highlight to the selected plant row in the panel: `bg-garden-100 ring-2 ring-garden-400` when `plant._id === selectedPlant?._id`, otherwise default hover style
- [X] T011 [US2] In `frontend/src/pages/BedDetail.jsx` — implement `handleCellClick(row, col)`: if no `selectedPlant` → no-op; if cell already holds `selectedPlant` → call `updateCell.mutate({ row, col, plantId: null })`; otherwise → call `updateCell.mutate({ row, col, plantId: selectedPlant._id })`
- [X] T012 [US2] In `frontend/src/pages/BedDetail.jsx` — wire `handleCellClick` to cell `onClick`; update the cell subtitle hint text from "Click a cell to assign a plant" to "Select a plant, then click cells to plant"
- [X] T013 [US2] In `frontend/src/pages/BedDetail.jsx` — add a visual cue when a plant is selected: a thin banner or label above the grid ("Stamping: 🍅 Tomato · click to change") that disappears when `selectedPlant` is null

**Checkpoint**: Full stamp-mode workflow works end-to-end. Selecting, stamping, toggling all verified manually.

---

## Phase 5: User Story 3 — Clear Bed (Priority: P3)

**Goal**: One-click button removes all plant assignments from the entire bed. Backed by a new `DELETE /beds/:id/cells` endpoint.

**Independent Test**: Assign plants to 3 cells, click "Clear bed", all cells empty instantly. Button present with no plants in bed — click produces no error.

### Backend (constitution §VI requires tests for new routes)

- [X] T014 [P] [US3] In `backend/src/routes/beds.js` — add `router.delete('/:id/cells', requireAccess('owner'), handler)`: find bed by `req.params.id`, return 404 if missing, set `bed.cells = []`, `await bed.save()`, return 200 with updated bed document
- [X] T015 [P] [US3] In `backend/src/__tests__/beds.test.js` — add test: `DELETE /beds/:id/cells` with valid owner → 200, `cells` is empty array
- [X] T016 [P] [US3] In `backend/src/__tests__/beds.test.js` — add test: `DELETE /beds/:id/cells` on bed with no cells → 200, `cells` is empty array (idempotent)
- [X] T017 [P] [US3] In `backend/src/__tests__/beds.test.js` — add test: `DELETE /beds/:id/cells` without auth → 401
- [X] T018 [P] [US3] In `backend/src/__tests__/beds.test.js` — add test: `DELETE /beds/:id/cells` by non-owner → 403
- [X] T019 [US3] Run `npm test` in `backend/` and confirm all new tests pass (depends on T014–T018)

### Frontend

- [X] T020 [US3] In `frontend/src/pages/BedDetail.jsx` — add `useClearBed` mutation: `mutationFn: () => api.delete('/beds/${id}/cells').then(r => r.data)`, `onSuccess: updated => queryClient.setQueryData(['beds', id], updated)`
- [X] T021 [US3] In `frontend/src/pages/BedDetail.jsx` — add "Clear bed" button at the bottom of the plant panel (`btn-secondary` or `text-red-600 hover:bg-red-50` style), `disabled={useClearBed.isPending}`, calls `useClearBed.mutate()`

**Checkpoint**: "Clear bed" empties all cells in one click. Backend tests all green.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Mobile layout, error handling, final cleanup.

- [X] T022 [P] In `frontend/src/pages/BedDetail.jsx` — verify mobile layout: plant panel stacks below grid on narrow viewports (Tailwind `flex-col` default, `lg:flex-row` override); manually test at 375px width
- [X] T023 [P] In `frontend/src/pages/BedDetail.jsx` — add inline error display if `updateCell` mutation fails (revert optimistic visual + show brief error message)
- [X] T024 Run full Playwright suite (`npx playwright test` from repo root) and confirm all 28 existing tests still pass
- [X] T025 Run `npm run lint` in `frontend/` and fix any ESLint errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): No dependencies — start immediately
- **Phase 2** (Foundational): Depends on Phase 1 — **blocks all user stories**
- **Phase 3** (US1): Depends on Phase 2
- **Phase 4** (US2): Depends on Phase 3 (needs panel to exist before wiring click handlers)
- **Phase 5** (US3): Backend tasks (T014–T019) parallel with Phase 3/4; frontend tasks (T020–T021) depend on Phase 2
- **Phase 6** (Polish): Depends on all story phases

### Parallel Opportunities

Within Phase 5, backend (T014–T019) and frontend panel work (US1/US2) can run in parallel since they touch different files.

```
Phase 2 complete
      │
      ├──► US1 panel (T005–T008)
      │         │
      │         └──► US2 stamp mode (T009–T013)
      │
      └──► US3 backend (T014–T019) ──► US3 frontend (T020–T021)
```

---

## Implementation Strategy

### MVP (US1 + US2 only — no backend changes)

1. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2)
2. **STOP and validate**: Panel visible, stamp mode works, existing tests pass
3. Ship if clear-bed can wait

### Full delivery

1. Complete all phases in order
2. Each phase is an independently testable increment
3. Suggested commit points: after T004, T008, T013, T019, T021, T025

---

## Notes

- [P] tasks touch different files — safe to parallelise
- `selectedPlant` is local `useState` only — not persisted anywhere
- `PlantPicker` modal is fully deleted — not kept alongside the new panel
- Constitution §VI mandates backend test coverage for the new DELETE route (T015–T018)
- Cells remain populated server-side until explicitly changed — clearing is not reversible without replanting
