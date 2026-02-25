# Quickstart: Harvest CSV Import

**Branch**: `006-harvest-csv-import`
**Date**: 2026-02-25

---

## Scenario 1 — Happy Path (all plants match)

**Setup**: User has a plant library that includes "Tomato" and "Cucumber".

1. User navigates to **Harvests** page
2. User clicks **"Download template"** → browser downloads `harvest-template.csv`
3. User opens the file and fills in:
   ```
   Plant Name,Date,Quantity (oz)
   tomato,06/15/2025,8
   CUCUMBER,07/04/2025,12.5
   ```
4. User clicks **"Import CSV"** and selects the saved file
5. System calls `POST /api/harvests/import` → returns `{ matched: [2 rows], unmatched: [], errors: [] }`
6. Frontend shows an import preview table: 2 rows ready to import
7. User clicks **"Confirm import"**
8. System calls `POST /api/harvests/bulk` → returns `{ imported: 2 }`
9. Both harvests appear in the Harvests list; React Query invalidates `['harvests']`

**Expected outcome**: 2 harvest records created. No manual resolution needed.

---

## Scenario 2 — Unmatched name with accepted suggestion

**Setup**: User has "Tomato" in their library.

1. User uploads a CSV containing `Tomatoe,06/15/2025,8`
2. `POST /api/harvests/import` returns:
   ```json
   {
     "unmatched": [{
       "row": 1, "rawName": "Tomatoe",
       "suggestion": { "plantName": "Tomato", "plantEmoji": "🍅" }
     }]
   }
   ```
3. Frontend shows the resolution UI: **"'Tomatoe' — did you mean Tomato 🍅?"**
4. User clicks **"Yes, use Tomato"**
5. User clicks **"Confirm import"**
6. `POST /api/harvests/bulk` creates the record with `plantId` = Tomato's ID

**Expected outcome**: 1 harvest record created for Tomato.

---

## Scenario 3 — Unmatched name with overridden suggestion

**Setup**: User meant to write "Cherry Tomato" but typed "Tomatoe".

1. System suggests "Tomato" (closest match)
2. User disagrees and opens the **plant selector dropdown**
3. User selects "Cherry Tomato" from the full plant library list
4. User confirms import
5. `POST /api/harvests/bulk` creates the record with `plantId` = Cherry Tomato's ID

**Expected outcome**: 1 harvest record created for Cherry Tomato.

---

## Scenario 4 — Skip an unmatched row

**Setup**: CSV contains `XYZ PLANT,06/15/2025,5` — completely unrecognised, no suggestion returned.

1. `POST /api/harvests/import` returns:
   ```json
   { "unmatched": [{ "row": 1, "rawName": "XYZ PLANT", "suggestion": null }] }
   ```
2. Frontend shows: **"'XYZ PLANT' — no match found"** with a plant selector and a **"Skip this row"** button
3. User clicks **"Skip this row"**
4. Import proceeds with the remaining rows
5. Summary shows: `Imported: 3, Skipped: 1, Failed: 0`

**Expected outcome**: Skipped row is excluded; other rows imported.

---

## Scenario 5 — Validation errors

**Setup**: CSV contains a row with a bad date format.

```
Plant Name,Date,Quantity (oz)
Tomato,2025-06-15,8
```

1. `POST /api/harvests/import` returns:
   ```json
   {
     "errors": [{
       "row": 1,
       "field": "date",
       "message": "Invalid date format — expected MM/DD/YYYY or MM/DD/YY"
     }]
   }
   ```
2. Frontend shows the error in the preview table highlighted in red
3. The row cannot be imported — user must fix the file and re-upload

**Expected outcome**: 0 rows imported, 1 error shown with row number and reason.

---

## Scenario 6 — Invalid file upload

**Setup**: User accidentally selects an `.xlsx` file instead of `.csv`.

1. `POST /api/harvests/import` returns 400:
   ```json
   { "error": "Only CSV files are accepted" }
   ```
2. Frontend shows an inline error message

**Expected outcome**: No processing; user is told to upload a CSV.

---

## API Call Sequence

```
User action                   API call
──────────────────────────────────────────────────────
Click "Download template"  →  GET  /api/harvests/template
Upload CSV file            →  POST /api/harvests/import    (preview, no DB write)
Confirm / resolve          →  POST /api/harvests/bulk      (creates records)
```

---

## Key React Query Cache Invalidations

After `POST /api/harvests/bulk` succeeds:

```js
queryClient.invalidateQueries({ queryKey: ['harvests'] });
```

This refreshes the harvest list, harvest totals, and analytics queries automatically.
