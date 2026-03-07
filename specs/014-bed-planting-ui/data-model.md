# Data Model: Improved Bed Planting UI

**Branch**: `014-bed-planting-ui` | **Date**: 2026-03-07

---

## No new Mongoose models

This feature introduces no new collections or models. All data already exists:

- `GardenBed` — existing model; cells array is already structured to support clearing.
- `Plant` — existing model; no changes.

---

## Backend change: bulk cell clear

The only data-layer change is a new write path on the existing `GardenBed` document.

### Operation: Clear all cells

```
DELETE /beds/:id/cells
```

**Mongoose operation**:
```js
await GardenBed.findByIdAndUpdate(id, {
  $set: { cells: [] }
}, { new: true });
```

Clears the entire `cells` sub-document array. Cells with no `plantId` are stripped anyway, so this is equivalent to removing all plant assignments.

**Response**: `200` with the updated bed document (same shape as `GET /beds/:id`).

---

## Frontend state additions

These are local React state changes in `BedDetail.jsx` — no new API keys or persisted state.

| State | Type | Purpose |
|-------|------|---------|
| `selectedPlant` | `Plant \| null` | Currently active plant in the panel. Determines what gets stamped on cell click. |
| `search` | `string` | Controlled input value for the plant panel search bar. |

Both are `useState` — no React Query keys, no localStorage.

---

## Query key unchanged

Existing query key `['beds', id]` continues to serve the bed data. The `DELETE /beds/:id/cells` mutation invalidates this key on success, triggering a re-fetch.
