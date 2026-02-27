# Quickstart: Garden PDF Layout Simplification

**Branch**: `009-simplify-pdf-layout`

## What changes

One frontend file, two edits:

| File | Change |
|------|--------|
| `frontend/src/components/GardenPrintView.jsx` | (1) Plant cell background → white; (2) `deriveShoppingRows` groups by plant across all beds; (3) Bed column removed from checklist table |

No backend changes. No new packages.

## Verify the output manually

1. Log in as `mike@gardenhive.com` / `321qaz` at http://localhost:5173
2. Go to Garden Map → click **Download PDF**
3. Open the file and verify:
   - **Page 1 (map)**: All plant cells have a white background — no green/orange/yellow/pink category tints
   - **Page 1 (map)**: Emoji and plant name still visible in each cell
   - **Last page (checklist)**: Table header shows `Plant | Qty | ☐ Seed | ☐ Starts | ☐ Purchased` — no Bed column
   - **Last page (checklist)**: If the same plant appears in multiple beds, it appears as one row with the combined quantity

## Run E2E tests

```bash
# From repo root
npx playwright test tests/e2e/beds.spec.js

# With visible browser
npx playwright test tests/e2e/beds.spec.js --headed
```

## Manual spot-check for row merging

Mike's garden has Tomato (Cherry), Bell Pepper, etc. planted across multiple beds.
After the change, each plant variety should appear **once** in the checklist with the total
count across all beds. You can verify totals by checking the garden map page in the app:
count the coloured cells for one plant variety across all beds and confirm it matches
the Qty column in the PDF.
