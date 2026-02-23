# Contract: Harvest Routes

**Base path**: `/api/harvests`
**File**: `backend/src/routes/harvests.js`

All routes use `requireAccess()`. Read routes require `analytics` (level 1);
write/delete routes require `harvests_analytics` (level 2).

Errors always return `{ error: "message" }`.

A **Harvest** response object (from list/create endpoints) has this shape:
```json
{
  "_id": "...",
  "userId": "...",
  "plantId": { "_id": "...", "name": "Tomato", "emoji": "🍅", "category": "vegetable" },
  "bedId": { "_id": "...", "name": "Raised Bed A" } | null,
  "quantity": 2.5,
  "unit": "lbs",
  "loggedById": { "_id": "...", "name": "Alice" } | null,
  "harvestedAt": "2026-02-23T00:00:00.000Z",
  "season": "Winter 2026",
  "notes": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Important**: `quantity` is stored as raw numbers in the unit provided.
The analytics routes sum these raw values — no unit conversion is performed.
YoY and monthly routes label the sum as `oz` but the value is whatever unit
was logged.

---

## GET /api/harvests

List recent harvest entries for the active garden.

**Auth**: `requireAccess('analytics')` (level ≥ 1)

**Query params**:

| Param | Type | Notes |
|---|---|---|
| `ownerId` | string | Optional — active garden owner override |
| `season` | string | Optional — exact match e.g. `"Spring 2026"` |
| `plantId` | string (ObjectId) | Optional — filter by plant |
| `limit` | number | Optional — default 50 |

**Response**: Array of Harvest objects sorted by `harvestedAt` descending.

| Status | Body | Condition |
|---|---|---|
| 200 | `[Harvest, ...]` | Success |
| 401 | auth error | |
| 403 | access error | |
| 500 | `{ error: message }` | |

---

## POST /api/harvests

Log a new harvest entry.

**Auth**: `requireAccess('harvests_analytics')` (level ≥ 2)

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `plantId` | string (ObjectId) | yes | |
| `quantity` | number | yes | Must be ≥ 0 |
| `unit` | string | yes | `lbs`, `oz`, `kg`, `g`, or `count` |
| `bedId` | string (ObjectId) | no | Which bed the harvest came from |
| `harvestedAt` | ISO date string | no | Defaults to current date/time |
| `notes` | string | no | |

**Side effects**:
- `userId` is always set to `req.gardenOwnerId` (the garden owner, not necessarily the caller).
- `loggedById` is set to `req.userId` (the caller — may be a helper).
- `season` is auto-derived from `harvestedAt` in the pre-save hook.

**Response**: Created Harvest object with `plantId`, `bedId`, and `loggedById` populated.

| Status | Body | Condition |
|---|---|---|
| 201 | `Harvest` | Created |
| 400 | `{ error: "plantId, quantity, and unit are required" }` | Missing required fields |
| 401 | auth error | |
| 403 | access error | |
| 500 | `{ error: message }` | |

---

## DELETE /api/harvests/:id

Permanently delete a harvest entry.

**Auth**: `requireAccess('harvests_analytics')` (level ≥ 2)

**Path params**: `id` — ObjectId of the harvest

**Scope**: Harvest must belong to the effective garden owner (`userId` match).

| Status | Body | Condition |
|---|---|---|
| 200 | `{ message: "Harvest deleted" }` | Deleted |
| 401 | auth error | |
| 403 | access error | |
| 404 | `{ error: "Harvest not found" }` | Not found or belongs to different owner |
| 500 | `{ error: message }` | |

---

## GET /api/harvests/totals

Return harvest totals grouped by plant + season + unit.

**Auth**: `requireAccess('analytics')` (level ≥ 1)

**Query params**:

| Param | Type | Notes |
|---|---|---|
| `ownerId` | string | Optional |
| `season` | string | Optional — filter to one season |
| `from` | ISO date string | Optional — `harvestedAt` start (inclusive) |
| `to` | ISO date string | Optional — `harvestedAt` end (inclusive) |

**Response**: Array of aggregated totals, sorted by `season` desc then `total` desc.

```json
[
  {
    "plantId": "...",
    "season": "Summer 2025",
    "unit": "lbs",
    "plantName": "Tomato",
    "plantEmoji": "🍅",
    "plantCategory": "vegetable",
    "total": 14.5,
    "count": 3
  }
]
```

| Status | Condition |
|---|---|
| 200 | Success (empty array if no data) |
| 401 | auth error |
| 403 | access error |
| 500 | server error |

---

## GET /api/harvests/yoy

Return monthly harvest totals grouped by calendar year for year-over-year comparison.

**Auth**: `requireAccess('analytics')` (level ≥ 1)

**Query params**:

| Param | Type | Notes |
|---|---|---|
| `ownerId` | string | Optional |
| `plantId` | string (ObjectId) | Optional — filter to one plant |

**Response**:

```json
{
  "years": ["2024", "2025", "2026"],
  "data": [
    { "month": "Jan", "2024_oz": 0, "2024_count": 0, "2025_oz": 12, "2025_count": 2, "2026_oz": 0, "2026_count": 0 },
    { "month": "Feb", ... },
    ...
  ]
}
```

- 12 rows, one per calendar month (Jan–Dec).
- Dynamic keys per year: `{year}_oz` and `{year}_count`.
- Values are rounded integers.

---

## GET /api/harvests/weekly

Return week-by-week harvest totals for a given year.

**Auth**: `requireAccess('analytics')` (level ≥ 1)

**Query params**:

| Param | Type | Notes |
|---|---|---|
| `ownerId` | string | Optional |
| `year` | number | Optional — defaults to current year |
| `plantId` | string (ObjectId) | Optional — filter to one plant |

**Response**: Array of up to 52 week entries, trailing empty weeks trimmed.

```json
[
  { "week": "Wk 1", "oz": 0, "count": 0 },
  { "week": "Wk 14", "oz": 5, "count": 2 },
  ...
]
```

Uses ISO week numbers. `oz` values are rounded integers.

---

## GET /api/harvests/years

Return the distinct calendar years that have at least one harvest entry.

**Auth**: `requireAccess('analytics')` (level ≥ 1)

**Query params**: `ownerId` (optional)

**Response**: Array of year numbers, sorted descending.

```json
[2026, 2025, 2024]
```

---

## GET /api/harvests/monthly

Return rolling 12-month harvest totals (current month back 11 months).

**Auth**: `requireAccess('analytics')` (level ≥ 1)

**Query params**: `ownerId` (optional)

**Response**: Array of 12 entries, oldest month first.

```json
[
  { "month": "Mar 25", "totalOz": 0, "entries": 0 },
  { "month": "Apr 25", "totalOz": 8, "entries": 1 },
  ...
  { "month": "Feb 26", "totalOz": 12, "entries": 3 }
]
```

Month labels are `"{Mon} {2-digit year}"` (e.g. `"Feb 26"`).
`totalOz` values are rounded integers.
