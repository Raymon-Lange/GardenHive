# Data Model: Garden Map with Drag-and-Snap Bed Placement

**Branch**: `002-garden-map-snap` | **Date**: 2026-02-23

---

## Changes to Existing Entities

### User (modified)

Two new fields added. All other fields unchanged.

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `gardenWidth` | Number | no | `null` | `min: 1`, integer | Overall garden width in feet. `null` = not yet configured. |
| `gardenHeight` | Number | no | `null` | `min: 1`, integer | Overall garden height in feet. `null` = not yet configured. |

**Migration**: None required. Existing documents have no `gardenWidth`/`gardenHeight` key; Mongoose reads these as the schema default (`null`).

**`userPayload()` shape** (updated — all routes that return a user object reflect this):

```json
{
  "id":           "ObjectId",
  "name":         "string",
  "email":        "string",
  "role":         "owner | helper",
  "gardenName":   "string | null",
  "gardenImage":  "/uploads/... | null",
  "gardenWidth":  "number | null",
  "gardenHeight": "number | null"
}
```

---

### GardenBed (unchanged schema, existing fields used)

The map position fields already exist in the schema. No schema change is required.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `mapRow` | Number | no | `null` | Zero-indexed row of the bed's top-left corner on the garden grid. `null` = unplaced. |
| `mapCol` | Number | no | `null` | Zero-indexed column of the bed's top-left corner on the garden grid. `null` = unplaced. |

**Position occupancy rule**: A placed bed with top-left `(mapRow, mapCol)` occupies all cells where `mapRow ≤ r < mapRow + rows` and `mapCol ≤ c < mapCol + cols`. Two beds overlap if and only if their occupied cell sets intersect.

**Boundary rule**: A placed bed must satisfy `mapCol + cols ≤ gardenWidth` and `mapRow + rows ≤ gardenHeight`.

**Unplaced beds**: Beds where `mapRow == null || mapCol == null` are valid documents. They appear in the beds list but are not rendered on the map grid.

---

## Entity Relationships (unchanged)

```
User ──< GardenBed   (userId FK on GardenBed)
GardenBed ──< Cell   (embedded sub-document, _id: false)
Cell >── Plant        (plantId FK, populated on read)
```

No new relationships are introduced by this feature.

---

## Validation Rules (enforced at route level)

### Setting garden dimensions (`PUT /api/auth/me/garden`)

| Field | Rule | Error |
|---|---|---|
| `gardenWidth` | Must be a positive integer (if provided) | 400 `gardenWidth must be a positive integer` |
| `gardenHeight` | Must be a positive integer (if provided) | 400 `gardenHeight must be a positive integer` |
| Both | Reducing below the bounding box of placed beds is rejected | 400 `Garden dimensions are smaller than existing bed placements` |

### Updating bed map position (`PUT /api/beds/:id`)

| Field | Rule | Error |
|---|---|---|
| `mapRow` | Must be a non-negative integer (if provided) | 400 `mapRow must be a non-negative integer` |
| `mapCol` | Must be a non-negative integer (if provided) | 400 `mapCol must be a non-negative integer` |
| Position | Proposed position must not overlap any other bed owned by this user | 409 `Bed position overlaps an existing bed` |
| Boundary | Bed footprint must fit within `gardenWidth` × `gardenHeight` | 400 `Bed position is outside the garden boundary` |
