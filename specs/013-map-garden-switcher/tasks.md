# Tasks: Garden Map Switcher with Harvest Indicator (013)

**Input**: Design documents from `/specs/013-map-garden-switcher/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Tests**: No new backend tests required (no new routes). Existing E2E suite validated in Polish phase.

**Spec clarifications applied**:
- Single-garden owners see a disabled dropdown (communicates multi-garden capability)
- In-page selector is owner-only; helpers use the sidebar
- Harvest attribution = bed picker filtered by active garden + garden label on harvest form
- No backend changes — all APIs exist from feature 012

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to

## Path Conventions

- Frontend: `frontend/src/`
- E2E tests: `tests/e2e/`

---

## Phase 1: Setup

**Purpose**: No new dependencies, models, or infrastructure needed. All APIs and context exist from feature 012. No setup tasks required — proceed directly to user story phases.

**Checkpoint**: Ready to implement — `useGarden()` already exposes `gardens`, `currentGardenId`, `setCurrentGardenId` to all pages.

---

## Phase 2: User Story 1 — Garden Selector on the Map Page (Priority: P1) 🎯 MVP

**Goal**: Owner can switch between their garden plans directly from the Garden Map header. A dropdown always appears — disabled with one option when only one garden exists (teaching the user multi-garden is possible), interactive when two or more gardens exist.

**Independent Test**: Create two gardens with different bed configurations. Open `/map`, confirm the garden selector appears in the header with the active garden selected. Switch to the second garden — the map redraws showing the second garden's beds and plant assignments. Reload the page — the switched garden is still active.

- [x] T001 [US1] Update `frontend/src/pages/GardenMap.jsx` — add a garden `<select>` to the page header (right side, alongside existing action buttons): destructure `gardens` and `setCurrentGardenId` from the existing `useGarden()` call; render `<select value={currentGardenId} onChange={(e) => setCurrentGardenId(e.target.value)} disabled={gardens.length <= 1}>` with one `<option>` per garden; style with Tailwind `input` class; show only when `user?.role === 'owner'`

**Checkpoint**: US1 fully functional — switching gardens on the map page reloads beds and plant assignments; selection persists on reload.

---

## Phase 3: User Story 2 — Active Harvest Garden Indicator (Priority: P2)

**Goal**: The active garden on the map is clearly labelled as the harvest default. The Harvests page bed picker is scoped to the active garden and shows the garden name — making the harvest-default link functional and visible.

**Independent Test**: With two gardens (A and B): verify the active garden has a "Harvest default" label on the map. Switch to garden B — label moves to B. Navigate to `/harvests` — confirm only garden B's beds appear in the bed picker, and the garden name is shown as a label near the picker. Record a harvest selecting a B bed — harvest is implicitly attributed to B via the bed's `gardenId`.

### Backend Note — US2

- [x] T002 [P] [US2] Update `frontend/src/pages/GardenMap.jsx` — add a "Harvest default" badge/pill next to (or below) the garden selector in the header; render it unconditionally when `user?.role === 'owner'`; use a small `<span>` with Tailwind classes (e.g., `text-xs bg-garden-100 text-garden-700 rounded-full px-2 py-0.5`); text: "Harvest default"

- [x] T003 [P] [US2] Update `frontend/src/pages/Harvests.jsx` — (a) import `useGarden` from `../context/GardenContext`; (b) destructure `currentGardenId` and `gardens` from `useGarden()`; (c) update the bed fetch query key to `['beds', currentGardenId]` and add `params: { gardenId: currentGardenId }` — disable when `currentGardenId` is null; (d) add a garden name label above the bed picker showing the active garden name (e.g., `"Recording harvest for: {currentGarden?.name}"`) where `currentGarden = gardens.find(g => g._id === currentGardenId)`

**Checkpoint**: US2 fully functional — harvest indicator visible on map; Harvests bed picker scoped to active garden; garden label shown on harvest form.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Lint validation and E2E regression check.

- [x] T004 [P] Run frontend lint `cd frontend && npm run lint` — zero ESLint errors
- [x] T005 [P] Run full E2E suite `npx playwright test` from repo root — 28/28 passing (existing tests must not regress)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No tasks — proceed immediately
- **Phase 2 (US1)**: No dependencies — start immediately
- **Phase 3 (US2)**: T002 depends on T001 (same file — GardenMap.jsx); T003 [P] is independent (different file)
- **Phase 4 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: No dependencies — start immediately
- **US2 (P2)**: T002 depends on T001 (GardenMap.jsx header already modified); T003 is fully independent

### Within Each User Story

- GardenMap.jsx changes: T001 → T002 (sequential, same file)
- Harvests.jsx change (T003): fully independent, can run alongside T001 or T002

### Parallel Opportunities

- T002 and T003 can run in parallel (different files — GardenMap.jsx vs Harvests.jsx)
- T004 and T005 can run in parallel

---

## Parallel Example: Phase 3 (US2)

```bash
# After T001 is complete, run T002 and T003 in parallel:
Task T002: Add "Harvest default" badge to frontend/src/pages/GardenMap.jsx
Task T003: Update frontend/src/pages/Harvests.jsx (fully independent)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 2: US1 (T001)
2. **STOP and VALIDATE**: Garden selector works on the map; switching loads the correct garden; single-garden shows disabled dropdown
3. Demo to confirm behaviour matches expectation

### Incremental Delivery After MVP

1. Add Phase 3 (US2): T002 + T003 in parallel
2. Validate: Harvest default badge visible; harvest bed picker scoped to active garden
3. Run Phase 4 (Polish): lint + E2E
4. Ready to merge

---

## Notes

- No new files to create — T001–T003 are all edits to existing files
- `useGarden()` is already imported in `GardenMap.jsx` — only new destructured values needed
- `Harvests.jsx` currently calls `GET /api/beds` without `gardenId` → broken since 012; T003 is a correctness fix as well as a feature addition
- The `isOwner` check already exists in GardenMap.jsx — use the same pattern for the selector visibility
- Commit after each checkpoint to keep rollback points clean
