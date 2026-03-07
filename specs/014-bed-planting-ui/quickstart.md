# Quickstart: Improved Bed Planting UI

**Branch**: `014-bed-planting-ui`

---

## What changed

| Before | After |
|--------|-------|
| Click a cell → modal appears → pick plant → dismiss | Click a plant in the side panel → click cells to stamp |
| Clearing a cell requires opening the modal | Clicking a stamped cell with the same plant selected clears it |
| No bulk clear | "Clear bed" button empties all cells at once |
| Category filter chips in modal | Search bar only (type partial name to filter) |

---

## Dev setup

No new packages. No new env vars. Just rebuild:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Then open **http://localhost:5173**, log in, open any bed.

---

## Manual test flow

1. Open a bed detail page — plant panel should be visible on the right without clicking anything.
2. Type "tom" in the search bar — list narrows to tomato varieties.
3. Click "Tomato" — it highlights.
4. Click three empty cells — all three fill with the tomato emoji.
5. Click one of those tomato cells again — it clears.
6. Click a different plant in the panel — the highlight moves.
7. Click a tomato cell — it replaces with the new plant.
8. Click "Clear bed" — all cells empty.
9. Resize browser to mobile width — plant panel drops below the grid.

---

## Backend test

```bash
cd backend && npm test
```

New test cases in `beds.test.js`:
- `DELETE /beds/:id/cells` → 200 with empty cells array.
- `DELETE /beds/:id/cells` on a bed with no cells → 200 with empty array.
- `DELETE /beds/:id/cells` without auth → 401.
- `DELETE /beds/:id/cells` by non-owner → 403.

---

## Files changed

```
backend/src/routes/beds.js         — new DELETE /beds/:id/cells handler
backend/src/__tests__/beds.test.js — new test cases

frontend/src/pages/BedDetail.jsx   — full refactor (inline panel, stamp mode)
```
