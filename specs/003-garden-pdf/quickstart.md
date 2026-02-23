# Quickstart & Manual Validation: Garden Layout PDF & Shopping List

**Branch**: `003-garden-pdf`
**Date**: 2026-02-23

---

## Prerequisites

- Dev environment running: `docker-compose up` or `npm run dev` in both `backend/` and `frontend/`
- Seed data applied: `npm run seed:all` in `backend/` (provides demo user with `gardenWidth: 32, gardenHeight: 20` and beds with planted cells)
- Logged in as `mike@gardenhive.com` / `321qaz`

---

## Scenario 1 — Download PDF from a Seeded Garden (US1, P1)

**Goal**: Verify the two-page PDF is generated and downloaded correctly.

1. Navigate to **Garden Map** (`/garden-map`)
2. Confirm at least one placed bed is visible with plant emojis in its cells
3. Click **"Download PDF"** in the page header
4. Observe: a `.pdf` file begins downloading in the browser (no dialog)
5. Open the downloaded file in a PDF viewer

**Verify page 1:**
- [ ] The garden grid is drawn — beds appear at their correct positions
- [ ] Each planted cell shows the plant's emoji character
- [ ] Unplanted cells are shown as empty (no emoji, no placeholder)
- [ ] The grid fits within the page — no content is clipped at the right or bottom edge
- [ ] The garden name and date appear as a heading above the grid

**Verify page 2:**
- [ ] A table titled "Shopping List" appears
- [ ] Each row has: bed name | emoji + plant name | cell count | ☐ Seed | ☐ Starts | ☐ Purchased
- [ ] Each unique (bed, plant) combination appears exactly once — not once per cell
- [ ] The checkboxes are empty squares suitable for pen-and-paper marking
- [ ] Rows are sorted alphabetically by bed name, then by plant name within each bed

**Verify filename:**
- [ ] The downloaded file is named `<garden-name>-<YYYY-MM-DD>.pdf` (or similar — check spec assumption)

---

## Scenario 2 — Download PDF Honours Deduplication (US1 acceptance scenario 4)

**Goal**: Confirm a bed with multiple cells of the same plant produces one row (not one row per cell).

1. Navigate to any bed detail page that has the same plant in 3+ cells
2. Return to Garden Map
3. Download PDF, open page 2
4. Find the row for that bed + plant
5. Verify: [ ] The `Qty` column shows the total count (e.g. 3), not 1

---

## Scenario 3 — Empty Garden (US1 acceptance scenario 5)

**Goal**: Confirm graceful handling of an empty garden.

1. Create a new test account (or temporarily clear beds in the DB)
2. Set garden dimensions if prompted (e.g. 10 × 8 ft)
3. Add a bed but do NOT place any plants in it
4. Download PDF

**Verify:**
- [ ] Page 1 shows the empty garden grid (no beds rendered, or beds with no emoji content)
- [ ] Page 2 shows "No plants to list." (no table, or empty-state message)

---

## Scenario 4 — Print Dialog (US2, P2)

**Goal**: Verify the browser's native print dialog opens with the correct two-page layout.

1. Navigate to **Garden Map**
2. Click **"Print"** in the page header
3. The browser's print dialog opens (do NOT click Print — just inspect the preview)

**Verify in print preview:**
- [ ] Page 1 shows the garden grid with bed positions and plant emojis
- [ ] Page 2 shows the shopping list table
- [ ] Navigation sidebar, top bar, and action buttons are hidden from the print preview
- [ ] Both pages fit within the paper dimensions (no horizontal overflow clipping)
- [ ] The suggested filename field shows the garden name or a descriptive name (Chrome/Edge)

4. Cancel the print dialog without printing

---

## Scenario 5 — Long Shopping List (edge case from spec)

**Goal**: Confirm table header repeats on continuation pages.

1. Seed or create enough beds with plants so the shopping list exceeds one page
2. Download PDF:
   - [ ] The table continues across multiple pages
   - [ ] The header row ("Bed / Plant / Qty / Seed / Starts / Purchased") appears at the top of every page of the shopping list
3. Print preview:
   - [ ] Same header repetition visible in print preview on every continuation page

---

## Scenario 6 — Helper Access (US1 acceptance scenario 6)

**Goal**: Verify the download and print buttons are also visible to a helper.

1. Log in as the helper account (`helper@gardenhive.com` / `321qaz` — from seed data)
2. Navigate to Garden Map
3. Verify: [ ] Both "Download PDF" and "Print" buttons are visible
4. Click Download PDF — verify it works (produces the same file)

---

## Scenario 7 — Wide Garden Scaling (edge case from spec)

**Goal**: Confirm the grid scales to fit the paper width for a large garden.

1. Update garden dimensions to 50 × 30 ft (via the garden dimensions setting)
2. Download PDF
3. Open PDF: [ ] The garden grid fits on page 1 without any content being cut off
4. Print preview: [ ] Same — grid scaled to fit paper width

---

## Checklist Summary

| Scenario | Covers |
|---|---|
| 1 | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-008 |
| 2 | FR-005, FR-006 (deduplication) |
| 3 | FR-004, FR-007, edge case (empty garden) |
| 4 | FR-010, FR-008 |
| 5 | FR-012 (repeating header) |
| 6 | FR-011 (helper access) |
| 7 | FR-009 (scaling) |
