# Implementation Plan: Garden PDF Visual Redesign

**Branch**: `008-improve-garden-pdf` | **Date**: 2026-02-27 | **Spec**: [spec.md](./spec.md)

## Summary

Redesign the in-app garden PDF output — both the Download PDF and Print buttons on the Garden Map page — replacing the current plain grid/table layout with: (1) a spatially accurate garden map where beds are positioned and sized proportionally to their real-world coordinates, plant cells are colour-coded by category and show the plant's emoji + abbreviated name, and compact/pagination fallbacks handle every garden size; and (2) an improved zebra-striped shopping checklist with a totals row and generation footer. The existing React DOM → html2canvas → jsPDF pipeline is retained; only the hidden layout component (`GardenPrintView.jsx`) and the PDF handlers in `GardenMap.jsx` are redesigned.

## Technical Context

**Language/Version**: JavaScript + React 19 (frontend only — no backend changes)
**Primary Dependencies**: jsPDF 4.2.0 + html2canvas 1.4.1 (both already installed — no new packages needed)
**Storage**: N/A — PDF generated in browser memory and downloaded; never persisted
**Testing**: Playwright 1.50.0 — existing `tests/e2e/beds.spec.js` PDF test updated; six new garden-size scenario tests added
**Target Platform**: Browser (all modern browsers; html2canvas 1.4.1 already confirmed working in CI)
**Performance Goals**: Download prompt appears within 5 seconds for gardens up to the "medium mixed" scenario (20 ft × 30 ft, 6–10 beds)
**Constraints**: Frontend-only; no new API endpoints; no new npm packages; data sourced exclusively from existing React Query cache (`useBeds()`) and `AuthContext` (`gardenWidth`, `gardenHeight`, `gardenName`)
**Scale/Scope**: Gardens from 4 ft × 6 ft to 50 ft × 80 ft; 1–20+ beds; up to ~50 plants per bed

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Layered Separation | ✅ Pass | Pure frontend presentation change. No business logic moves to frontend. PDF layout is rendering/formatting only. |
| II. REST-First API Design | ✅ Pass | No new API endpoints. Existing `/api/beds` (with populated `plantId`) provides all data. |
| III. Permission-Gated Multi-Tenancy | ✅ Pass | Existing `requireAccess` middleware already guards `/api/beds`. No new routes = no new permission gates needed. Download/Print buttons already honour owner/helper visibility. |
| IV. Schema-Validated Data Integrity | ✅ Pass | No new Mongoose models or routes. |
| V. Server State via React Query / UI State | ✅ Pass | PDF generation reads from existing `useBeds()` query cache and `AuthContext`. No direct `fetch()` calls added. New error state uses `useState` (UI toggle). |
| VI. Test-Before-Deploy | ✅ Pass | Existing beds.spec.js PDF test updated to assert new layout. Six garden-size scenario tests added. |
| VII. Simplicity & YAGNI | ✅ Pass | No new library, no service layer. PDF logic stays in `GardenMap.jsx` handler + `GardenPrintView.jsx`. Extraction to a hook deferred unless handler grows beyond ~150 lines. Toast is a local `useState` + `setTimeout` — not a new component or library. |
| VIII. Consistent Naming | ✅ Pass | New constants follow `UPPER_SNAKE_CASE` (e.g. `CATEGORY_COLORS`, `COMPACT_THRESHOLD_PX`). New inline state follows `is`/`has` prefix (`pdfError`). File names unchanged. |

## Project Structure

### Documentation (this feature)

```text
specs/008-improve-garden-pdf/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             ← Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (files changed)

```text
frontend/
├── src/
│   ├── pages/
│   │   └── GardenMap.jsx          ← update handleDownloadPdf, handlePrint, add pdfError toast
│   ├── components/
│   │   └── GardenPrintView.jsx    ← full redesign (spatial map, new checklist, palette)
│   └── index.css                  ← remove @media print rules (no longer used)
│
tests/
└── e2e/
    └── beds.spec.js               ← update existing PDF test; add 6 garden-size scenario tests
```

**No new files. No backend changes. No new npm packages.**

## Complexity Tracking

> No constitution violations. No complexity entries required.

---

## Phase 0 — Research

See [research.md](./research.md).

## Phase 1 — Design & Contracts

See [data-model.md](./data-model.md).

No external contracts created — this feature exposes no new public API endpoints, CLI interfaces, or shared library surfaces. The PDF generation is internal to `GardenMap.jsx`.

---

## Implementation Approach

### Rendering Pipeline (unchanged)

```
useBeds() + AuthContext
       │
       ▼
GardenPrintView (hidden DOM portal at left: -9999px)
  ├── Section 1: [page-sized div(s)] — spatial garden map
  └── Section 2: [div]              — shopping checklist
       │
       ▼
html2canvas (scale: 2) → PNG per page-div
       │
       ▼
jsPDF (letter portrait) → addImage per captured PNG
       │
       ▼
pdf.save() (download) OR window.open(blobUrl) (print)
```

### Key Changes in GardenPrintView.jsx

**1 — Spatial layout algorithm**

The existing `printCellPx = Math.min(CELL_PX, floor(PAPER_W / gardenWidth))` already scales beds to fit the page width but ignores height. The redesign uses aspect-ratio-preserving two-axis scaling:

```
USABLE_W = PAPER_W - 2*MARGIN         (e.g. 720px)
USABLE_H = PAPER_H - HEADER_H - MARGIN (e.g. 960px on portrait letter)
scale = min(USABLE_W / gardenWidth, USABLE_H / gardenHeight)  // px per sq ft
```

Each bed card: `left = MARGIN + bed.mapCol * scale`, `top = HEADER_H + bed.mapRow * scale`,
`width = bed.cols * scale`, `height = bed.rows * scale`.

**2 — Compact mode**

Cell size in the rendered DOM = `scale × scale` px. A plant-name label at ~30% of cell height occupies `scale * 0.3` px. The threshold for 8pt in the final PDF (accounting for html2canvas 2× capture and jsPDF Letter placement) is a DOM CSS font of ~`5.3px`. So compact mode activates when:

```
scale * 0.3 < COMPACT_THRESHOLD_PX   (constant set to 5.5px)
→ equivalent to: scale < 18.3px/ft
→ equivalent to: garden wider than ~39 ft at USABLE_W=720px
```

Compact bed card renders: bed name (truncated to 16 chars) + `· N plants` in centre. Full bed boundary and colour are preserved.

**3 — Map pagination**

If `gardenHeight * scale > USABLE_H` (garden doesn't fit vertically at the computed scale), the map paginates. Each page shows a horizontal strip of height `USABLE_H` in garden-space. The number of strips = `ceil(gardenHeight / (USABLE_H / scale))`. Each strip is a separate `data-print-section="map-N"` div captured and added as its own PDF page.

A miniature index thumbnail (fixed 120×80px SVG of the full garden boundary with the current strip highlighted) is rendered in the top-right corner of each map page.

**4 — New design palette**

Replace the existing white/grey palette with the spec's green design system:

| Token | Value | Used for |
|-------|-------|---------|
| `PDF_BG` | `#F0FAF3` | Page background |
| `PDF_CARD_BORDER` | `#52B788` | Bed card border |
| `PDF_HEADER_BG` | `#2D6A4F` | Header bar background |
| `PDF_HEADER_TEXT` | `#FFFFFF` | Header text |
| `PDF_BODY_TEXT` | `#1B1B1B` | General text |
| `PDF_MUTED` | `#6B7280` | Subtitle / footer text |
| `PDF_DIVIDER` | `#CDE8D5` | Table row dividers |

**5 — Category colours**

| Category | Colour | Rationale |
|----------|--------|-----------|
| `vegetable` | `#BBF7D0` | Light green — on-brand, highest contrast vs `#F0FAF3` |
| `fruit` | `#FED7AA` | Light orange — warm, clearly distinct in greyscale |
| `herb` | `#FEF08A` | Light yellow — bright, legible at small sizes |
| `flower` | `#FBCFE8` | Light pink — immediately recognisable; distinct in greyscale |

**6 — Shopping checklist redesign**

- Header bar uses `PDF_HEADER_BG` with white text
- Zebra stripes: even rows `#FFFFFF`, odd rows `#F0FAF3`
- Totals row below table: unique variety count + total cell count
- Footer: `Generated: YYYY-MM-DD` in `PDF_MUTED`

**7 — Plant name abbreviation**

In DOM: `plantName.slice(0, 12) + (plantName.length > 12 ? '…' : '')`. Rendered as a separate `<div>` below the emoji, font-size `scale * 0.28` px (hidden in compact mode).

### Key Changes in GardenMap.jsx

**handleDownloadPdf** — capture multiple `data-print-section` divs (including map strips if paginated) rather than hardcoded section1/section2. Each is captured and added as its own PDF page in order. Change jsPDF format from `{ orientation: 'landscape', format: 'a4' }` to `{ orientation: 'portrait', format: 'letter' }`.

**handlePrint** — generate PDF using the same capture flow as download, then call:
```js
const blobUrl = pdf.output('bloburl');
window.open(blobUrl);
```
Remove the `window.print()` + CSS @media print approach entirely.

**Error toast** — add:
```js
const [pdfError, setPdfError] = useState(null);
```
In catch block: `setPdfError('Could not generate PDF — please try again')`.
Auto-clear with `setTimeout(() => setPdfError(null), 4000)`.
Render as a fixed-position overlay div (bottom-right, z-50, red-500 background).

**index.css** — remove all `@media print` rules (lines 36–100) since CSS print path is fully replaced.

### Existing Playwright Test Updates (beds.spec.js)

The existing test (test 5 — PDF download) verifies a file is downloaded. It continues to work since the button selector and download mechanism are unchanged. Update the assertion to also check the filename format matches `*-YYYY-MM-DD.pdf`.

Add six new tests (one per garden size scenario) using API-created gardens of the specified dimensions. Each test verifies: (a) download completes within 5 seconds for the "small standard" scenario, (b) compact mode beds render correctly for "large sparse", (c) paginated output for "narrow landscape".
