# Contract: Plant Library Routes

**Base path**: `/api/plants`
**File**: `backend/src/routes/plants.js`
**Auth**: All routes require a valid Bearer token (`requireAuth`).

Errors always return `{ error: "message" }`.

A **Plant** response object has this shape:
```json
{
  "_id": "...",
  "name": "Tomato",
  "category": "vegetable",
  "perSqFt": 1,
  "daysToHarvest": 75,
  "daysToGermination": 7,
  "spacingIn": 18,
  "depthIn": 0.25,
  "description": "...",
  "emoji": "🍅",
  "ownerId": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`ownerId: null` = system plant. `ownerId: ObjectId` = custom plant.

---

## GET /api/plants

Return the plant library: all system plants plus the effective owner's custom plants.

**Auth**: Bearer token required

**Query params**:

| Param | Type | Notes |
|---|---|---|
| `ownerId` | string (ObjectId) | Optional. Use that owner's custom plants (for helpers). Defaults to current user. |
| `showAll` | `"true"` | Optional. Include hidden plants; annotates each with `hidden: boolean`. |
| `category` | string | Optional. Filter by `vegetable`, `fruit`, `herb`, or `flower`. |
| `search` | string | Optional. Case-insensitive substring match on `name`. |

**Behaviour without `showAll`**:
- Returns system plants + effective owner's custom plants.
- Excludes plants in the requesting user's `hiddenPlants` list.

**Behaviour with `showAll=true`**:
- Returns all matching plants regardless of hidden status.
- Each plant object gains a `hidden: boolean` property based on the requesting
  user's `hiddenPlants` list.
- Plants sorted by `name` ascending.

**Response**: Array of Plant objects (with optional `hidden` annotation).

| Status | Body | Condition |
|---|---|---|
| 200 | `[Plant, ...]` | Success (empty array if no matches) |
| 401 | auth error | |
| 500 | `{ error: message }` | |

---

## GET /api/plants/:id

Retrieve a single plant by ID.

**Auth**: Bearer token required

**Path params**: `id` — ObjectId of the plant

| Status | Body | Condition |
|---|---|---|
| 200 | `Plant` | Found |
| 401 | auth error | |
| 404 | `{ error: "Plant not found" }` | Not found |
| 500 | `{ error: message }` | |

---

## POST /api/plants

Create a custom plant owned by the current user.

**Auth**: Bearer token required

**Request body** (all optional except `name`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | |
| `category` | string | no | `vegetable` (default), `fruit`, `herb`, `flower` |
| `emoji` | string | no | Default: `🌱` |
| `description` | string | no | |
| `perSqFt` | number | no | Default: 1 |
| `daysToHarvest` | number | no | |
| `daysToGermination` | number | no | |
| `spacingIn` | number | no | |
| `depthIn` | number | no | |

`ownerId` is always set to the current user; it cannot be overridden.

| Status | Body | Condition |
|---|---|---|
| 201 | `Plant` | Created |
| 400 | `{ error: "Name is required" }` | Missing or empty name |
| 401 | auth error | |
| 500 | `{ error: message }` | |

---

## PUT /api/plants/:id

Update a custom plant. The requesting user must be the plant's owner.

**Auth**: Bearer token required

**Path params**: `id` — ObjectId of the plant

**Request body**: Any subset of editable fields:
`name`, `category`, `emoji`, `description`, `perSqFt`, `daysToHarvest`,
`daysToGermination`, `spacingIn`, `depthIn`

| Status | Body | Condition |
|---|---|---|
| 200 | `Plant` | Updated |
| 401 | auth error | |
| 403 | `{ error: "Not your plant" }` | Plant owned by another user or is a system plant |
| 404 | `{ error: "Plant not found" }` | |
| 500 | `{ error: message }` | |

---

## DELETE /api/plants/:id

Permanently delete a custom plant. The requesting user must be the plant's owner.

**Auth**: Bearer token required

**Path params**: `id` — ObjectId of the plant

**Deletion guards** (checked in order):
1. Plant must not be a system plant (`ownerId: null`)
2. Plant must not be assigned to any bed cell
3. Plant must not be referenced by any harvest record

| Status | Body | Condition |
|---|---|---|
| 200 | `{ message: "Deleted" }` | Deleted successfully |
| 400 | `{ error: "System plants cannot be deleted" }` | Attempt to delete system plant |
| 400 | `{ error: "This plant is in use in a garden bed and cannot be deleted" }` | Plant in bed |
| 400 | `{ error: "This plant has harvest records and cannot be deleted" }` | Plant has harvests |
| 401 | auth error | |
| 403 | `{ error: "Not your plant" }` | Not the owner |
| 404 | `{ error: "Plant not found" }` | |
| 500 | `{ error: message }` | |
