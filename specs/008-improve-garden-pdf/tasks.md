# Tasks: Garden PDF Visual Redesign

**Input**: Design documents from `/specs/008-improve-garden-pdf/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Tests**: E2E tests (Playwright) included — updating existing PDF test and adding 6 garden-size scenario tests as specified in the plan.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files or non-conflicting sections)
- **[Story]**: Which user story this task belongs to (US1–US4)

## Path Conventions

Web app — frontend-only feature:

```text
frontend/src/components/GardenPrintView.jsx   ← full redesign
frontend/src/pages/GardenMap.jsx              ← handler + toast updates
frontend/src/index.css                        ← remove @media print block
tests/e2e/beds.spec.js                        ← update + new scenario tests
```

---

## Phase 1: Setup

**Purpose**: Remove legacy print infrastructure that conflicts with the new approach.

- [x] T001 Remove the `@media print` CSS block (lines 36–100) from `frontend/src/index.css` — this block drives the old print path and will conflict with the new PDF-blob print approach

**Checkpoint**: Old CSS print path removed. The Print button will temporarily do nothing until Phase 3 restores it via PDF blob.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared constants and the scale algorithm that every user story phase builds on. Must be complete before any map or checklist rendering work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Add `PDF_PALETTE` and `CATEGORY_COLORS` constant objects at the top of `frontend/src/components/GardenPrintView.jsx`, replacing the existing white/grey inline colour strings throughout the component
- [x] T003 [P] Add `PAPER_W_PX`, `PAPER_H_PX`, `MARGIN_PX`, `HEADER_H_PX`, `USABLE_W_PX`, `USABLE_H_PX`, and `COMPACT_THRESHOLD_PX` constants and the `computeLayout(gardenWidth, gardenHeight)` helper in `frontend/src/components/GardenPrintView.jsx` — returns `{ scale, isPaginated, stripCount, stripHeightFt }`

**Checkpoint**: Constants and scale formula in place. All subsequent tasks import from these values.

---

## Phase 3: User Story 1 — Download a Visually Redesigned Garden PDF (Priority: P1) 🎯 MVP

**Goal**: The Download PDF and Print buttons both produce a letter-size portrait PDF using the new layout. Error toast surfaces failures. File is named `{slug}-{date}.pdf`.

**Independent Test**: Click Download PDF → file appears in downloads with correct filename format → opens as a 2-page (or more) letter-size PDF. Click Print → PDF opens in a new browser tab. Trigger a generation error → toast notification appears and auto-dismisses.

### Implementation for User Story 1

- [x] T004 [US1] Update `handleDownloadPdf` in `frontend/src/pages/GardenMap.jsx`: change `new jsPDF(...)` from `{ orientation: 'landscape', format: 'a4' }` to `{ orientation: 'portrait', format: 'letter' }`; replace the hardcoded section1/section2 capture with a dynamic loop over all `[data-print-section]` elements (supports variable map-strip count from US3)
- [x] T005 [P] [US1] Replace `handlePrint` in `frontend/src/pages/GardenMap.jsx`: remove `window.print()` and CSS `--print-scale` logic; generate PDF via the same capture flow as `handleDownloadPdf` then call `const url = pdf.output('bloburl'); window.open(url)`
- [x] T006 [P] [US1] Add `const [pdfError, setPdfError] = useState(null)` to `frontend/src/pages/GardenMap.jsx`; wrap both handlers in try/catch that calls `setPdfError('Could not generate PDF — please try again')` with `setTimeout(() => setPdfError(null), 4000)`; render the toast as a `fixed bottom-4 right-4 z-50` div with `bg-red-500 text-white` classes
- [x] T007 [US1] Update the existing PDF download E2E test in `tests/e2e/beds.spec.js` to assert: (a) downloaded filename matches `/\w+-\d{4}-\d{2}-\d{2}\.pdf$/`, (b) download completes within 5 seconds for the fixture garden

**Checkpoint**: Download PDF and Print both work end-to-end with the new letter-portrait format. Error toast visible on failure. Existing Playwright PDF test passes.

---

## Phase 4: User Story 2 — Spatially Accurate Garden Map Page (Priority: P2)

**Goal**: Page 1 of the PDF renders each bed as a bordered card at its proportional real-world position and size within the garden boundary. Each plant cell shows a category-coloured background, centred emoji, and abbreviated name. A styled header bar shows garden name, date, dimensions, and bed count.

**Independent Test**: Download PDF for a garden with 2+ beds of different sizes at different positions → on page 1 verify: beds appear in correct relative positions; a larger bed (more sq ft) renders with a larger card; plant cells show coloured backgrounds matching the plant's category; each cell shows emoji and truncated name; header bar shows garden name and date.

### Implementation for User Story 2

- [x] T008 [US2] Redesign the Page 1 section container in `frontend/src/components/GardenPrintView.jsx`: add a full-width header bar div with `PDF_PALETTE.headerBg` background and `PDF_PALETTE.headerText` text showing garden name (bold, 18px), date + dimensions + bed count (12px, `PDF_PALETTE.muted`)
- [x] T009 [US2] Replace the existing bed card layout in `frontend/src/components/GardenPrintView.jsx` with spatially positioned cards: `left = MARGIN_PX + bed.mapCol * scale`, `top = HEADER_H_PX + bed.mapRow * scale`, `width = bed.cols * scale`, `height = bed.rows * scale`; apply `PDF_PALETTE.cardBorder` as border colour and `PDF_PALETTE.bg` as page background; set `data-print-section="map-1"` on the outer page div
- [x] T010 [US2] Implement plant cell rendering within each bed card in `frontend/src/components/GardenPrintView.jsx`: cell size = `scale × scale` px; background = `CATEGORY_COLORS[cell.plantId.category] ?? CATEGORY_COLORS.vegetable`; emoji centred at `Math.max(10, scale * 0.65)` px font; abbreviated name (`name.slice(0,12) + (name.length > 12 ? '…' : '')`) in a div below the emoji at `scale * 0.30` px font in `PDF_PALETTE.bodyText`
- [x] T011 [P] [US2] Add bed name label to each bed card in `frontend/src/components/GardenPrintView.jsx`: render a small overlay div at the top of the card (`position: absolute, top: 2px, left: 4px`) showing `bed.name.slice(0,16) + (bed.name.length > 16 ? '…' : '')` at 9px in `PDF_PALETTE.headerBg` colour (semi-bold, legible against the card background)
- [x] T012 [P] [US2] Update the dot-grid background SVG in `frontend/src/components/GardenPrintView.jsx` to use the new scale value (`scale` px per sq ft instead of `printCellPx`) and `PDF_PALETTE.divider` dot colour; set SVG dimensions to `gardenWidth * scale` × `gardenHeight * scale`

**Checkpoint**: Page 1 renders a spatially accurate, colour-coded garden map with labelled beds. Beds with no plants show an empty card in the correct position. Download and open PDF to verify visually.

---

## Phase 5: User Story 3 — Responsive Map Layout for Any Garden Size (Priority: P3)

**Goal**: Compact mode activates for beds below the 18px/ft scale threshold (shows name + plant count). Map paginates into horizontal strips when the garden exceeds the usable page height. Each paginated page includes a miniature index thumbnail.

**Independent Test**: Using the 6 garden-size scenarios from quickstart.md — "large sparse" (50×80 ft) triggers compact mode on small beds; "narrow landscape" (8×40 ft) triggers pagination; all scenarios produce a valid PDF with no layout overflow.

### Implementation for User Story 3

- [x] T013 [US3] Implement compact mode in `frontend/src/components/GardenPrintView.jsx`: in the bed card renderer, check `scale < COMPACT_THRESHOLD_PX`; if true, replace the plant cell grid with a centred text block showing `bed.name` (bold) and `· ${plantedCount} plants` (muted); preserve the card's border, background, and spatial position
- [x] T014 [US3] Implement map pagination in `frontend/src/components/GardenPrintView.jsx`: when `isPaginated` is true (from `computeLayout`), render `stripCount` separate `data-print-section="map-N"` divs each sized `PAPER_W_PX × PAPER_H_PX`; each strip renders only the beds whose `mapRow` falls within `[stripIndex * stripHeightFt, (stripIndex+1) * stripHeightFt)`; beds that straddle a strip boundary render in the strip where their top edge falls
- [x] T015 [US3] Add miniature index SVG thumbnail to each paginated map page in `frontend/src/components/GardenPrintView.jsx`: render a 120×80px SVG in the top-right corner of the header bar showing the full garden boundary outline (stroke `PDF_PALETTE.cardBorder`) with the current strip's extent highlighted (fill `PDF_PALETTE.headerBg` at 20% opacity); add a "Map N of M" label below the thumbnail in 8px `PDF_PALETTE.muted`
- [x] T016 [US3] Update `handleDownloadPdf` in `frontend/src/pages/GardenMap.jsx` to capture all `data-print-section` divs dynamically: `querySelectorAll('[data-print-section]')` sorted by the section attribute value; each captured PNG is added as its own PDF page in order (map-1, map-2, …, checklist)
- [x] T017 [US3] Add 6 garden-size scenario E2E tests to `tests/e2e/beds.spec.js`: for each scenario (tiny/dense 4×6, small standard 10×12, medium mixed 20×30, large sparse 50×80, narrow landscape 8×40, many beds 30×50) — create a garden via API with the specified dimensions, place the appropriate number of beds, click Download PDF, assert download completes and file is non-empty; for "large sparse" and "narrow landscape" assert that a download occurs without error (visual validation done manually per quickstart.md)

**Checkpoint**: All 6 garden-size scenarios produce a downloadable PDF without errors. Large/paginated gardens produce multi-page output. Run `npx playwright test tests/e2e/beds.spec.js`.

---

## Phase 6: User Story 4 — Improved Shopping Checklist Page (Priority: P4)

**Goal**: The checklist page has a styled header bar, zebra-striped rows, a totals summary (total cells + unique varieties), and a generation date footer.

**Independent Test**: Download PDF for a garden with plants in 2+ beds → navigate to the checklist page → verify: header bar matches the map page style; rows alternate white/`#F0FAF3`; a totals line appears below the last row; a footer shows "Generated: YYYY-MM-DD".

### Implementation for User Story 4

- [x] T018 [US4] Redesign the Page 2 section in `frontend/src/components/GardenPrintView.jsx`: add a header bar matching the map page style (`PDF_PALETTE.headerBg` background, "Shopping List" title in `PDF_PALETTE.headerText` at 16px bold); set `data-print-section="checklist"` on the outer div
- [x] T019 [US4] Implement zebra-stripe row alternation in the checklist table in `frontend/src/components/GardenPrintView.jsx`: even-indexed rows use `background: '#FFFFFF'`, odd-indexed rows use `background: PDF_PALETTE.bg`; replace the existing solid `border: '1px solid #d1d5db'` cell borders with `borderBottom: '1px solid ' + PDF_PALETTE.divider`; update table header row to use `PDF_PALETTE.headerBg` background and `PDF_PALETTE.headerText` text
- [x] T020 [P] [US4] Add totals summary section below the table in `frontend/src/components/GardenPrintView.jsx`: compute `totalCells = shoppingRows.reduce((s, r) => s + r.cellCount, 0)` and `totalVarieties = new Set(shoppingRows.map(r => r.plantName)).size`; render as a right-aligned paragraph `"${totalVarieties} varieties · ${totalCells} plants total"` in `PDF_PALETTE.bodyText` at 12px bold, separated from the table by a `PDF_PALETTE.divider` top border
- [x] T021 [P] [US4] Add generation date footer to the checklist section in `frontend/src/components/GardenPrintView.jsx`: render `"Generated: ${today}"` at the bottom of the section div in 10px `PDF_PALETTE.muted`, right-aligned

**Checkpoint**: Checklist page visually matches the design spec. Download and verify all 4 checklist features in the output PDF.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, regression check, lint pass.

- [x] T022 [P] Run `npx playwright test tests/e2e/beds.spec.js` from repo root and fix any regressions — all existing beds tests plus the 6 new garden-size scenario tests must pass
- [x] T023 [P] Run `npm run lint` in `frontend/` and resolve any ESLint warnings introduced by the new JSX in `GardenPrintView.jsx` and `GardenMap.jsx`
- [x] T024 Follow the manual validation checklist in `specs/008-improve-garden-pdf/quickstart.md`: download PDF with the fixture garden, verify spatial map + coloured cells + checklist + print path; spot-check compact mode by temporarily setting a small garden width

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 — can start once foundational constants exist
- **US2 (Phase 4)**: Depends on Phase 2 — can start in parallel with US1 (different files / sections)
- **US3 (Phase 5)**: Depends on Phase 4 (compact mode extends bed card rendering from US2)
- **US4 (Phase 6)**: Depends on Phase 2 — can start in parallel with US2/US3 (separate section of GardenPrintView)
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| US1 (P1) | Foundational | GardenMap.jsx handler changes; independent of map/checklist content |
| US2 (P2) | Foundational | Core spatial map; US3 extends it |
| US3 (P3) | US2 | Compact mode and pagination wrap the bed card renderer from US2 |
| US4 (P4) | Foundational | Checklist section is independent of map section |

### Within Each Story

- Implement in task order within each phase (later tasks reference outputs of earlier ones)
- US2 → US3 is the only cross-story implementation dependency
- US1 and US4 can proceed fully in parallel with US2/US3 if working across separate files

### Parallel Opportunities

- T002 and T003 (Phase 2): both touch top of GardenPrintView.jsx — do sequentially in one pass
- T005 and T006 (Phase 3): both in GardenMap.jsx — do in one pass
- T011 and T012 (Phase 4): independent additions within the map section — parallel
- T020 and T021 (Phase 6): independent additions to the checklist section — parallel
- T022, T023, T024 (Phase 7): fully parallel — different commands / files

---

## Parallel Example: US2 + US4 (run concurrently)

```
Agent A (US2 — map):
  T008 → T009 → T010 → T011+T012 in parallel

Agent B (US4 — checklist):
  T018 → T019 → T020+T021 in parallel
```

Both agents modify different `data-print-section` divs within `GardenPrintView.jsx` — merge conflict risk is low if working top-to-bottom in the file.

---

## Implementation Strategy

### MVP First (US1 + US2 only — pages render, spatial map works)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002–T003)
3. Phase 3: US1 — Download plumbing (T004–T007)
4. Phase 4: US2 — Spatial map (T008–T012)
5. **STOP and VALIDATE**: Download PDF, open it, verify spatial map renders correctly
6. Ship MVP — gardeners get a spatially accurate coloured map immediately

### Incremental Delivery

1. MVP above → spatial map works ✅
2. Add US3 (T013–T017) → adaptive sizing and pagination ✅
3. Add US4 (T018–T021) → improved checklist ✅
4. Polish (T022–T024) → all tests green ✅

---

## Notes

- [P] tasks can run in parallel when they touch different files or non-conflicting sections of the same file
- GardenPrintView.jsx is the largest change — work top-to-bottom (header → map → checklist) to minimise merge conflicts
- Commit after each phase checkpoint (not after every task)
- The `computeLayout` helper (T003) is the most critical function — get the scale formula right before any rendering work
- Run `npx playwright test tests/e2e/beds.spec.js --headed` to visually inspect the PDF download during development
