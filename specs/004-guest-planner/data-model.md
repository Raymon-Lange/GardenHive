# Data Model: Guest Garden Planner

**Branch**: `004-guest-planner` | **Date**: 2026-02-24

---

## No New Mongoose Models

The guest planner requires no new backend models. All guest data is transient and lives client-side.

---

## Client-Side State (GuestPlanner.jsx)

### Guest Bed (useState)

```js
{
  name: string,          // optional, defaults to "My Garden Plan" in PDF
  rows: number,          // positive integer ≥ 1, set on form submit
  cols: number,          // positive integer ≥ 1, set on form submit
  cells: Array<{
    row: number,         // 0-indexed row within the bed
    col: number,         // 0-indexed column within the bed
    plant: PlantObject,  // fully populated system plant (from GET /api/plants/public)
  }>                     // sparse — only assigned cells stored
}
```

**Lifecycle**: Created on dimension form submit. Mutated as the guest assigns/removes plants. Destroyed on page refresh or tab close.

---

## sessionStorage Bridge (signup carry-over)

**Key**: `gh_guest_bed`

**Written by**: `GuestPlanner.jsx` when the guest clicks "Sign up to save"

**Read and cleared by**: `Signup.jsx` after successful account creation

**Shape**: JSON-serialised guest bed object (same as above)

**Lifecycle**: Written immediately before navigating to `/signup`. Removed after the bed is saved to the new account. Automatically cleared by the browser when the tab closes.

---

## Existing Models Used (read-only for guests)

### Plant (system plants only)

Served via `GET /api/plants/public`. Only documents where `ownerId: null` are returned.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Used as cell plant reference |
| `name` | String | Displayed in plant picker and PDF |
| `emoji` | String | Rendered in grid cells and PDF |
| `category` | String | Used for filtering in plant picker |
| `perSqFt` | Number | Shown in plant picker detail |
| `daysToHarvest` | Number | Shown in plant picker detail |
| `daysToGermination` | Number | Shown in plant picker detail |
| `spacingIn` | Number | Shown in plant picker detail |
| `depthIn` | Number | Shown in plant picker detail |

---

## Data Flow: Sign-Up Carry-Over

```
GuestPlanner (useState)
  → sessionStorage.setItem('gh_guest_bed', JSON.stringify(bed))
  → navigate('/signup')

Signup.jsx (after successful POST /api/auth/register)
  → sessionStorage.getItem('gh_guest_bed')
  → POST /api/beds  { name, rows, cols }           → creates bed, returns { _id }
  → PUT  /api/beds/:id/cells  { cells }             → assigns each plant cell
  → sessionStorage.removeItem('gh_guest_bed')
  → navigate('/beds/:id')                           → lands on the saved bed
```
