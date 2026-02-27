# Tasks: Garden PDF Layout Simplification

**Input**: Design documents from `/specs/009-simplify-pdf-layout/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Tests**: No new test tasks — both changes are visual and verified via manual PDF inspection per `quickstart.md` and the existing Playwright download tests.

**Organization**: Two independent user stories, both in the same file (`GardenPrintView.jsx`), touching different sections. US1 edits the cell renderer. US2 edits `deriveShoppingRows` and the checklist table — can proceed in parallel with US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different sections of the same file)
- **[Story]**: Which user story this task belongs to (US1–US2)

## Path Conventions

```text
frontend/src/components/GardenPrintView.jsx   ← all changes
```

---

## Phase 1: User Story 1 — Remove Category Colours from Map (Priority: P1) 🎯 MVP

**Goal**: All plant cells on the garden map render with a neutral white background instead of a category-specific colour. Emoji and abbreviated name remain visible.

**Independent Test**: Download PDF for a garden with plants from 2+ categories (e.g., vegetable + herb) → open page 1 → all plant cells show white backgrounds, not green/orange/yellow/pink tints.

### Implementation for User Story 1

- [x] T001 [US1] In the plant cell renderer in `frontend/src/components/GardenPrintView.jsx` (around line 240), replace `CATEGORY_COLORS[plant.category] ?? CATEGORY_COLORS.vegetable` with `'#FFFFFF'`; leave the empty-cell fallback as `'transparent'`

**Checkpoint**: Download PDF — all plant cells show white backgrounds regardless of plant category. Emoji and names still visible.

---

## Phase 2: User Story 2 — Remove Bed Column from Checklist (Priority: P2)

**Goal**: The shopping checklist table has no Bed column. Each plant appears once with quantities summed across all beds.

**Independent Test**: Download PDF for a garden where the same plant appears in 2+ beds → navigate to checklist → table header shows `Plant | Qty | ☐ Seed | ☐ Starts | ☐ Purchased` (no Bed column); that plant appears as one row with the combined quantity.

### Implementation for User Story 2

- [x] T002 [P] [US2] Replace the `deriveShoppingRows` function in `frontend/src/components/GardenPrintView.jsx`: remove the per-bed `flatMap` and replace with a single cross-bed loop that groups by `String(cell.plantId._id)`, sums `cellCount` across all beds, removes `bedName` from the row shape, and sorts results by `plantName` ascending
- [x] T003 [P] [US2] In the checklist table in `frontend/src/components/GardenPrintView.jsx`: remove `'Bed'` from the header array (`['Bed', 'Plant', ...]` → `['Plant', ...]`) and remove the `<td>{row.bedName}</td>` cell from each row

**Checkpoint**: Download PDF — checklist table has no Bed column; a plant used in multiple beds appears as one row with combined quantity; totals summary remains correct.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [x] T004 [P] Run `npm run lint` in `frontend/` and resolve any ESLint warnings introduced by the changes in `GardenPrintView.jsx`
- [ ] T005 [P] Follow the manual validation checklist in `specs/009-simplify-pdf-layout/quickstart.md`: download PDF with Mike's fixture garden, verify white cells on map page, verify simplified checklist with merged rows

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)**: No dependencies — start immediately
- **US2 (Phase 2)**: No dependencies on US1 — can run in parallel (different sections of `GardenPrintView.jsx`)
- **Polish (Phase 3)**: Depends on both US1 and US2 complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| US1 (P1) | Nothing | Edit is in the cell renderer section |
| US2 (P2) | Nothing | Edits are in `deriveShoppingRows` function and table JSX — no overlap with US1 |

### Parallel Opportunities

- T001 (US1) and T002+T003 (US2) can all run simultaneously — they touch different sections of the same file
- T002 and T003 within US2 can be done in a single pass (consecutive edits in the same file)
- T004 and T005 (Polish) are fully independent

---

## Parallel Example: US1 + US2 (run concurrently)

```
Agent A (US1 — map cell colour):
  T001 only

Agent B (US2 — checklist):
  T002 → T003 (sequential, same function area)
```

Both agents modify different sections of `GardenPrintView.jsx` — T001 is ~line 240 (cell renderer), T002 is ~line 40 (deriveShoppingRows), T003 is ~line 340 (table JSX).

---

## Implementation Strategy

### MVP (Both stories together — 3 edits, one file)

1. Phase 1: US1 — T001 (one-line change)
2. Phase 2: US2 — T002 + T003 (refactor function + remove table column)
3. Phase 3: Polish — lint + manual validation

Total: 5 tasks, all in `GardenPrintView.jsx`.

---

## Notes

- Both stories touch `GardenPrintView.jsx` but in non-conflicting sections — safe to do in sequence or parallel
- `CATEGORY_COLORS` constant is intentionally left in place per research.md Decision 3
- No backend changes, no new packages, no new files
- Commit after both US1 and US2 are complete and validated
