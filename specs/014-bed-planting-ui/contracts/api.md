# API Contract: Improved Bed Planting UI

**Branch**: `014-bed-planting-ui` | **Date**: 2026-03-07

---

## New endpoint

### `DELETE /api/beds/:id/cells`

Clears all plant assignments from all cells in a bed. Equivalent to setting every cell's `plantId` to null, then compacting the array.

**Auth**: Required (`requireAccess('owner')` — only the garden owner may bulk-clear a bed).

**URL params**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | The bed document ID |

**Request body**: none

**Success response** `200`:
```json
{
  "_id": "...",
  "name": "Raised Bed 1",
  "rows": 4,
  "cols": 4,
  "cells": [],
  "gardenId": "...",
  "mapRow": null,
  "mapCol": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Returns the full updated bed document (same shape as `GET /beds/:id`). `cells` will be an empty array.

**Error responses**:

| Status | Condition | Body |
|--------|-----------|------|
| `401` | No valid session token | `{ "error": "Unauthorised" }` |
| `403` | Caller does not own this bed | `{ "error": "Forbidden" }` |
| `404` | Bed not found | `{ "error": "Bed not found" }` |

---

## Unchanged endpoints used by this feature

| Endpoint | Purpose |
|----------|---------|
| `GET /api/beds/:id` | Load bed with populated cells |
| `PUT /api/beds/:id/cells` | Assign or clear a single cell |
| `GET /api/plants` | Load plant list for the panel |
