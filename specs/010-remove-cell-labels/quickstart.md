# Quickstart: Remove Plant Name Labels from Garden Map PDF

**Branch**: `010-remove-cell-labels`

## What changes

One file, one edit:

| File | Change |
|------|--------|
| `frontend/src/components/GardenPrintView.jsx` | Remove label `<div>` from cell renderer; remove `marginTop` offset wrapper; remove unused `labelFontPx` and `shortName` variables |

No backend changes. No new packages.

## Verify the output manually

1. Log in as `mike@gardenhive.com` / `321qaz` at http://localhost:5173
2. Go to Garden Map → click **Download PDF**
3. Open the file and verify:
   - **Page 1 (map)**: Plant cells show only the emoji — no text label below or near it
   - **Page 1 (map)**: Emoji appears vertically centred in each cell (no upward shift)
   - **Page 1 (map)**: Empty cells remain visually empty
   - **Page 1 (map)**: Compact mode beds (if any) still show bed name + plant count

## Run lint

```bash
cd frontend && npm run lint
```

No new ESLint errors should be introduced in `GardenPrintView.jsx`.
