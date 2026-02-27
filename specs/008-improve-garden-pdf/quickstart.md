# Quickstart: Garden PDF Visual Redesign

**Branch**: `008-improve-garden-pdf`

## What changes

Two frontend files are redesigned; one CSS section is removed. No backend work.

| File | Change |
|------|--------|
| `frontend/src/components/GardenPrintView.jsx` | Full redesign — spatial map, new palette, compact mode, pagination, improved checklist |
| `frontend/src/pages/GardenMap.jsx` | Update `handleDownloadPdf` (letter portrait, multi-section capture) + `handlePrint` (PDF blob → `window.open`) + add `pdfError` toast state |
| `frontend/src/index.css` | Remove `@media print` block (lines 36–100) |
| `tests/e2e/beds.spec.js` | Update existing PDF test; add 6 garden-size scenario tests |

## Local dev setup

```bash
# Start dev stack (if not already running)
docker compose -f docker-compose.dev.yml up

# Dev server available at http://localhost:5173
# Download PDF button is on the Garden Map page
```

## Key constants (GardenPrintView.jsx)

```js
const PAPER_W_PX           = 816;   // US Letter width at 96dpi
const PAPER_H_PX           = 1056;  // US Letter height at 96dpi
const MARGIN_PX            = 48;    // 0.5" page margin
const HEADER_H_PX          = 72;    // 0.75" header bar
const USABLE_W_PX          = 720;   // PAPER_W_PX - 2*MARGIN_PX
const USABLE_H_PX          = 888;   // PAPER_H_PX - HEADER_H_PX - 2*MARGIN_PX
const COMPACT_THRESHOLD_PX = 18;    // px/ft below which compact mode activates

const CATEGORY_COLORS = {
  vegetable: '#BBF7D0',
  fruit:     '#FED7AA',
  herb:      '#FEF08A',
  flower:    '#FBCFE8',
};

const PDF_PALETTE = {
  bg:          '#F0FAF3',
  cardBorder:  '#52B788',
  headerBg:    '#2D6A4F',
  headerText:  '#FFFFFF',
  bodyText:    '#1B1B1B',
  muted:       '#6B7280',
  divider:     '#CDE8D5',
};
```

## Scale formula

```js
const scale = Math.min(USABLE_W_PX / gardenWidth, USABLE_H_PX / gardenHeight);
// Each bed card:
//   left  = MARGIN_PX + bed.mapCol * scale
//   top   = HEADER_H_PX + bed.mapRow * scale
//   width = bed.cols * scale
//   height = bed.rows * scale
// Compact mode: scale < COMPACT_THRESHOLD_PX
// Pagination:   gardenHeight * scale > USABLE_H_PX
```

## Run E2E tests

```bash
# From repo root
npx playwright test tests/e2e/beds.spec.js

# With visible browser (useful for PDF visual inspection)
npx playwright test tests/e2e/beds.spec.js --headed

# View HTML report
npx playwright show-report
```

## Verify the output manually

1. Log in as `e2e-fixture@test.local` / `TestPass123`
2. Go to Garden Map → click **Download PDF**
3. Open the file — verify:
   - Page 1: spatial map, coloured cells, bed labels, header with garden name + date
   - Last page: zebra-striped checklist, totals row, footer date
4. Click **Print** → PDF opens in new tab → print dialog appears
