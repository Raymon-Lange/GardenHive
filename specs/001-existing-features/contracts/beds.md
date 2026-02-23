# Contract: Garden Bed Routes

**Base path**: `/api/beds`
**File**: `backend/src/routes/beds.js`
**Auth**: All routes require `requireAccess('full')` — owner or full-access helper.

Errors always return `{ error: "message" }`.

A **GardenBed** response object has this shape:
```json
{
  "_id": "...",
  "userId": "...",
  "name": "...",
  "rows": 4,
  "cols": 4,
  "mapRow": null,
  "mapCol": null,
  "cells": [
    { "row": 0, "col": 1, "plantId": { "_id": "...", "name": "Tomato", "emoji": "🍅", "category": "vegetable" } }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```
Only assigned cells appear in `cells[]`. Empty cells are absent.

---

## GET /api/beds

List all garden beds for the active garden owner.

**Auth**: `requireAccess('full')` (owner or full-access helper)

**Query params**:

| Param | Type | Notes |
|---|---|---|
| `ownerId` | string (ObjectId) | Optional. If provided, returns that owner's beds (requires active grant). Defaults to current user. |

**Response**: Array of GardenBed objects (cells populated with `name`, `emoji`, `category`).
Sorted by `createdAt` descending.

| Status | Body | Condition |
|---|---|---|
| 200 | `[GardenBed, ...]` | Success (empty array if no beds) |
| 401 | auth error | |
| 403 | `{ error: "Access denied" \| "Insufficient permission" }` | No grant or below `full` |
| 500 | `{ error: message }` | |

---

## GET /api/beds/:id

Retrieve a single garden bed with fully populated cells.

**Auth**: `requireAccess('full')`

**Path params**: `id` — ObjectId of the bed

**Query params**: `ownerId` (optional, same as list)

**Response**: Single GardenBed object. Cells populated with `name`, `emoji`,
`category`, `perSqFt`.

| Status | Body | Condition |
|---|---|---|
| 200 | `GardenBed` | Found |
| 401 | auth error | |
| 403 | access/permission error | |
| 404 | `{ error: "Garden bed not found" }` | Not found or not owned by effective owner |
| 500 | `{ error: message }` | |

---

## POST /api/beds

Create a new garden bed. **Owner only** (helpers with `full` permission cannot create beds).

**Auth**: `requireAccess('full')` + `req.gardenPermission === 'owner'`

**Query params**: `ownerId` not applicable — always creates for the current user.

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Bed display name |
| `rows` | number | yes | 1–50 (capped at 50 server-side) |
| `cols` | number | yes | 1–50 (capped at 50 server-side) |

**Response**: Newly created GardenBed object (empty `cells: []`).

| Status | Body | Condition |
|---|---|---|
| 201 | `GardenBed` | Created |
| 400 | `{ error: "name, rows, and cols are required" }` | Missing fields |
| 401 | auth error | |
| 403 | `{ error: "Only the garden owner can create beds" }` | Helper attempted |
| 500 | `{ error: message }` | |

---

## PUT /api/beds/:id

Rename an existing garden bed.

**Auth**: `requireAccess('full')`

**Path params**: `id` — ObjectId of the bed

**Request body**:

| Field | Type | Required |
|---|---|---|
| `name` | string | yes |

**Response**: Updated GardenBed object.

| Status | Body | Condition |
|---|---|---|
| 200 | `GardenBed` | Updated |
| 401 | auth error | |
| 403 | access/permission error | |
| 404 | `{ error: "Garden bed not found" }` | Not found or not owned by effective owner |
| 500 | `{ error: message }` | |

---

## PUT /api/beds/:id/cells

Set or clear the plant for one cell in a bed.

**Auth**: `requireAccess('full')`

**Path params**: `id` — ObjectId of the bed

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `row` | number | yes | 0-based row index |
| `col` | number | yes | 0-based column index |
| `plantId` | string (ObjectId) \| null | yes | ObjectId assigns a plant; `null` clears the cell |

**Behaviour**:
- `plantId = null`: removes the cell element from the array if it exists.
- `plantId = ObjectId`: upserts — updates existing cell at `(row, col)` or
  appends a new cell element.

**Response**: Updated GardenBed with cells populated (`name`, `emoji`, `category`, `perSqFt`).

| Status | Body | Condition |
|---|---|---|
| 200 | `GardenBed` | Updated |
| 401 | auth error | |
| 403 | access/permission error | |
| 404 | `{ error: "Garden bed not found" }` | Not found or not owned by effective owner |
| 500 | `{ error: message }` | |

---

## DELETE /api/beds/:id

Delete a garden bed and all its cell data. **Owner only**.

**Auth**: `requireAccess('full')` + `req.gardenPermission === 'owner'`

**Path params**: `id` — ObjectId of the bed

| Status | Body | Condition |
|---|---|---|
| 200 | `{ message: "Garden bed deleted" }` | Deleted |
| 401 | auth error | |
| 403 | `{ error: "Only the garden owner can delete beds" }` | Helper attempted |
| 404 | `{ error: "Garden bed not found" }` | Not found or not owned by effective owner |
| 500 | `{ error: message }` | |
