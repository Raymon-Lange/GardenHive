# Contract: Beds Routes — Changes for 002-garden-map-snap

**Scope**: Only changes and additions relative to `specs/001-existing-features/contracts/beds.md`.

---

## Updated: PUT /api/beds/:id

Update a bed's name **and/or** map position.

**Auth**: Bearer token + `requireAccess('full')` (owner permission enforced for write operations)

**Request body** (all fields optional — omit any field to leave it unchanged):

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name for the bed |
| `mapRow` | number \| null | Zero-indexed row of the top-left corner. Send `null` to unplace. |
| `mapCol` | number \| null | Zero-indexed column of the top-left corner. Send `null` to unplace. |

**Validation** (when `mapRow` and/or `mapCol` are provided and not null):
- Both `mapRow` and `mapCol` must be non-negative integers.
- The bed footprint `(mapCol to mapCol + cols, mapRow to mapRow + rows)` must fit within the owner's `gardenWidth` × `gardenHeight`. Returns 400 if garden dimensions are not set.
- The proposed position must not overlap any other placed bed owned by the same user.

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `GardenBed` object | Updated successfully |
| 400 | `{ error: "mapRow and mapCol must be non-negative integers" }` | Invalid position values |
| 400 | `{ error: "Garden dimensions not set — configure garden size before placing beds" }` | Owner has no gardenWidth/gardenHeight |
| 400 | `{ error: "Bed position is outside the garden boundary" }` | Footprint exceeds garden size |
| 403 | `{ error: "Only the garden owner can update beds" }` | Helper attempting write |
| 404 | `{ error: "Garden bed not found" }` | Wrong id or wrong owner |
| 409 | `{ error: "Bed position overlaps an existing bed" }` | AABB collision with another placed bed |
| 500 | `{ error: message }` | |

**Note**: `mapRow` and `mapCol` may be sent together with `name` in a single request, or independently.
