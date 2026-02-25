# Data Model: Harvest CSV Import

**Branch**: `006-harvest-csv-import`
**Date**: 2026-02-25

---

## Persistent Models

### No new Mongoose models required

The existing `Harvest` model already supports all fields needed for imported rows:

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId (ref: User) | Set from `req.userId` on import |
| `plantId` | ObjectId (ref: Plant) | Resolved from plant match |
| `quantity` | Number (min: 0) | Parsed from CSV `Quantity (oz)` column |
| `unit` | String enum | All imported rows use `'oz'` |
| `harvestedAt` | Date | Parsed from CSV `Date` column (MM/DD/YYYY or MM/DD/YY) |
| `season` | String | Computed by Mongoose pre-save hook (no change needed) |
| `createdAt` / `updatedAt` | Date | Auto-managed via `{ timestamps: true }` |

---

## New Backend Utility

### `backend/src/utils/fuzzyMatch.js`

Not a Mongoose model — a pure utility module for plant name resolution.

| Export | Signature | Description |
|---|---|---|
| `findClosestPlant` | `(input: string, plants: Plant[], maxDistance?: number) → { plant: Plant, distance: number } \| null` | Returns the closest matching plant by Levenshtein edit distance, or `null` if nothing within `maxDistance` (default 3) |

---

## Transient Shapes (API response only — not persisted)

These are plain objects returned by `POST /api/harvests/import`. They are never stored in MongoDB.

### `MatchedRow`

A CSV row where the plant name resolved to a known plant.

| Field | Type | Description |
|---|---|---|
| `row` | Number | 1-based row number in the CSV (excluding header) |
| `plantId` | String | ObjectId of the matched plant |
| `plantName` | String | Canonical name of the matched plant |
| `plantEmoji` | String | Emoji of the matched plant (for preview display) |
| `date` | String | ISO 8601 date string parsed from the CSV date |
| `quantity` | Number | Parsed quantity in oz |

### `UnmatchedRow`

A CSV row where the plant name had no case-insensitive exact match.

| Field | Type | Description |
|---|---|---|
| `row` | Number | 1-based row number in the CSV |
| `rawName` | String | Original plant name as typed in the CSV |
| `suggestion` | Object \| null | `{ plantId, plantName, plantEmoji }` — best fuzzy match, or `null` if no plant is within `maxDistance` |

### `ErrorRow`

A CSV row that failed validation and cannot be imported.

| Field | Type | Description |
|---|---|---|
| `row` | Number | 1-based row number in the CSV |
| `field` | String | Which column failed: `'plantName'`, `'date'`, or `'quantity'` |
| `message` | String | Human-readable reason (e.g., `"Invalid date format — expected MM/DD/YYYY or MM/DD/YY"`) |

### `ImportPreview` (full `POST /api/harvests/import` response body)

| Field | Type | Description |
|---|---|---|
| `matched` | MatchedRow[] | Rows with confirmed plant matches |
| `unmatched` | UnmatchedRow[] | Rows needing user resolution |
| `errors` | ErrorRow[] | Rows that cannot be imported |
| `totalRows` | Number | Total data rows in the uploaded CSV |

### `BulkCreateRow` (each element in `POST /api/harvests/bulk` request body)

The payload the frontend sends after the user resolves all unmatched rows.

| Field | Type | Description |
|---|---|---|
| `plantId` | String | ObjectId of the plant (confirmed by user) |
| `harvestedAt` | String | ISO 8601 date string |
| `quantity` | Number | Quantity in oz |

### `BulkCreateResult` (`POST /api/harvests/bulk` response body)

| Field | Type | Description |
|---|---|---|
| `imported` | Number | Count of harvest records created |
| `harvests` | Harvest[] | The created harvest documents |

---

## CSV Template Format

The downloadable template is a plain text CSV — not a Mongoose model, but documented here for completeness.

**Filename**: `harvest-template.csv`

**Columns** (in order):

| Column header | Type | Constraints | Example |
|---|---|---|---|
| `Plant Name` | String | Must match a plant name (case-insensitive) | `Tomato` |
| `Date` | String | MM/DD/YYYY or MM/DD/YY | `06/15/2025` |
| `Quantity (oz)` | Number | Positive number | `8` |

**Example file**:
```
Plant Name,Date,Quantity (oz)
Tomato,06/15/2025,8
Cucumber,07/04/2025,12.5
```

---

## Validation Rules

| Rule | Source | Error message |
|---|---|---|
| `Plant Name` must not be blank | FR-013 | "Plant name is required" |
| `Date` must match MM/DD/YYYY or MM/DD/YY | FR-005, FR-013 | "Invalid date format — expected MM/DD/YYYY or MM/DD/YY" |
| `Quantity (oz)` must be a positive number | FR-012 | "Quantity must be a positive number" |
| Uploaded file must be a CSV | FR-003 | "Only CSV files are accepted" |
| CSV must contain all three required columns | FR-003 | "Missing required columns: [list]" |
