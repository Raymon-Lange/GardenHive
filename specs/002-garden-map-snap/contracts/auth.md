# Contract: Auth Routes — Changes for 002-garden-map-snap

**Scope**: Only changes and additions relative to `specs/001-existing-features/contracts/auth.md`.

---

## Updated: User object shape

All endpoints that return a `user` object now include two additional fields:

```json
{
  "id":           "...",
  "name":         "...",
  "email":        "...",
  "role":         "owner | helper",
  "gardenName":   "string | null",
  "gardenImage":  "/uploads/... | null",
  "gardenWidth":  "number | null",
  "gardenHeight": "number | null"
}
```

`gardenWidth` and `gardenHeight` are `null` for users who have not yet configured their garden dimensions. Existing users see `null` on first login after deployment (no migration needed).

---

## Updated: PUT /api/auth/me/garden

Set or clear the current user's garden name **and/or** garden dimensions.

**Auth**: Bearer token required

**Request body** (all fields optional — omit any field to leave it unchanged):

| Field | Type | Notes |
|---|---|---|
| `gardenName` | string | Omit or send empty string to clear |
| `gardenWidth` | number \| null | Positive integer in feet. Send `null` to clear. |
| `gardenHeight` | number \| null | Positive integer in feet. Send `null` to clear. |

**Validation**:
- `gardenWidth` / `gardenHeight`: must be a positive integer or `null` if provided.
- Reducing dimensions below the bounding box of already-placed beds is rejected.

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `user` object (updated) | Success |
| 400 | `{ error: "gardenWidth must be a positive integer" }` | Non-positive or non-integer width |
| 400 | `{ error: "gardenHeight must be a positive integer" }` | Non-positive or non-integer height |
| 400 | `{ error: "Garden dimensions are smaller than existing bed placements" }` | New size clips a placed bed |
| 401 | auth error | |
| 404 | `{ error: "User not found" }` | |
| 500 | `{ error: message }` | |
