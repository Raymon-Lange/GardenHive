# Data Model: Standard Garden Plan for Free Users

**Branch**: `011-standard-guest-plan` | **Date**: 2026-02-27

---

## Overview

This feature is **frontend-only**. No new backend models, collections, or database fields are introduced. The guest garden state lives exclusively in the browser (`localStorage`). On sign-up carry-over, it maps to existing backend models via existing API endpoints.

---

## Guest Garden (localStorage — key: `gh_guest_garden`)

The entire guest garden is serialised as a single JSON object stored at `localStorage['gh_guest_garden']`.

### Shape

```ts
interface GuestGarden {
  gardenWidth:  number;   // ft — default 10
  gardenHeight: number;   // ft — default 10
  beds:         GuestBed[];
}

interface GuestBed {
  id:      string;        // client-side UUID (not a MongoDB _id)
  name:    string;        // bed name (required; default "Bed N")
  rows:    number;        // height in ft (≥ 1, ≤ 50)
  cols:    number;        // width in ft  (≥ 1, ≤ 50)
  mapRow:  number;        // top-left row position in garden grid (auto-assigned)
  mapCol:  number;        // top-left col position in garden grid (auto-assigned)
  cells:   GuestCell[];
}

interface GuestCell {
  row:   number;          // 0-indexed row within the bed
  col:   number;          // 0-indexed col within the bed
  plant: GuestPlantRef;   // full snapshot (not just _id) for offline-capable rendering
}

interface GuestPlantRef {
  _id:      string;       // MongoDB ObjectId string — used during carry-over
  name:     string;
  emoji:    string;
  category: string;       // 'vegetable' | 'fruit' | 'herb' | ''
}
```

### Validation rules

| Field | Rule |
|-------|------|
| `gardenWidth` | Integer ≥ 1. Default 10. |
| `gardenHeight` | Integer ≥ 1. Default 10. |
| `GuestBed.id` | UUID v4 generated client-side on bed creation. |
| `GuestBed.name` | Non-empty string. Trimmed. |
| `GuestBed.rows` | Integer 1–50 (mirrors backend `min`/`max`). |
| `GuestBed.cols` | Integer 1–50 (mirrors backend `min`/`max`). |
| `GuestBed.mapRow` | Integer ≥ 0, `mapRow + rows ≤ gardenHeight`. |
| `GuestBed.mapCol` | Integer ≥ 0, `mapCol + cols ≤ gardenWidth`. |
| `GuestCell.plant._id` | Valid MongoDB ObjectId string (system plant). |

### Lifecycle

```
Create planner → load from localStorage (or DEFAULT_GARDEN {w:10, h:10, beds:[]})
    │
    ▼
User edits (add/remove bed, change dimensions, assign plants)
    │
    ▼
Auto-save to localStorage on every state change (useEffect)
    │
    ▼
Sign up → carry-over → localStorage key removed → navigate('/map')
```

---

## Mapping to Backend Models on Sign-Up Carry-Over

No backend schema changes. The guest garden maps to existing collections as follows:

| Guest field | Backend model / field | API call |
|-------------|----------------------|----------|
| `gardenWidth` | `User.gardenWidth` | `PUT /api/auth/me/garden` |
| `gardenHeight` | `User.gardenHeight` | `PUT /api/auth/me/garden` |
| `GuestBed.{ name, rows, cols }` | `GardenBed.{ name, rows, cols }` | `POST /api/beds` |
| `GuestBed.{ mapRow, mapCol }` | `GardenBed.{ mapRow, mapCol }` | `PUT /api/beds/:id` |
| `GuestCell.{ row, col, plant._id }` | `BedCell.{ row, col, plantId }` | `PUT /api/beds/:id/cells` |

**Carry-over call order** (dimensions must precede position validation):
1. `PUT /api/auth/me/garden` — gardenWidth, gardenHeight
2. For each GuestBed (sequential):
   - `POST /api/beds` → returns `{ _id, ... }`
   - `PUT /api/beds/:id` → mapRow, mapCol
   - `PUT /api/beds/:id/cells` → cells (only if cells.length > 0)
3. `localStorage.removeItem('gh_guest_garden')`
4. `navigate('/map')`
