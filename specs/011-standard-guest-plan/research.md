# Research: Standard Garden Plan for Free Users

**Branch**: `011-standard-guest-plan` | **Date**: 2026-02-27

---

## Decision 1 — localStorage for Guest Plan Persistence

**Decision**: Store the guest garden in `localStorage` under key `gh_guest_garden`, replacing the existing `sessionStorage` key `gh_guest_bed`.

**Rationale**: `sessionStorage` is cleared on tab/browser close. FR-004 requires the plan to survive browser restart, so `localStorage` is the only appropriate browser storage primitive. The `gh_guest_garden` key is namespaced consistently with the existing `gh_token` / `gh_user` / `gh_guest_bed` conventions already in the codebase. If `localStorage` is unavailable (FR edge case), the planner falls back to React state for the current session only.

**Alternatives considered**:
- **Keep sessionStorage**: Rejected — does not survive browser close per spec FR-004.
- **IndexedDB**: Rejected — far more complex than needed for a flat JSON object; `localStorage` is sufficient for this data size.

---

## Decision 2 — Guest Garden State Shape

**Decision**: Persist the full guest garden as a single JSON object:

```json
{
  "gardenWidth": 10,
  "gardenHeight": 10,
  "beds": [
    {
      "id": "uuid-v4-string",
      "name": "Raised Bed 1",
      "rows": 2,
      "cols": 4,
      "mapRow": 0,
      "mapCol": 0,
      "cells": [
        { "row": 0, "col": 0, "plant": { "_id": "...", "name": "Tomato", "emoji": "🍅", "category": "vegetable" } }
      ]
    }
  ]
}
```

**Rationale**: Mirrors the shape that the authenticated `GardenMap` + `GardenPrintView` pipeline already understands. Beds carry `mapRow`/`mapCol` so `GardenPrintView` can render them spatially without transformation. Client-side `id` (UUID) is used as the React key within the planner — it is not the MongoDB `_id` (which doesn't exist until carry-over). Plant cells store the full plant object snapshot (name, emoji, category) so the planner can render without an API call per cell.

**Alternatives considered**:
- **Store plant `_id` only**: Rejected — would require re-fetching all plants on load to render emoji; the full snapshot is small and self-contained.
- **Separate localStorage keys per bed**: Rejected — atomic single-key read/write avoids partial-state corruption.

---

## Decision 3 — Auto-Placement of New Beds

**Decision**: When a bed is added, assign it the first available `(mapRow, mapCol)` position that fits within the garden bounds and does not overlap any existing placed bed, using a row-first scan. If no position fits, place the bed at `(0, 0)` and show a warning that it overlaps.

**Rationale**: Drag-and-drop repositioning adds significant UI complexity (pointer event capture, overlap detection, position persistence) that is out of scope for this feature. Auto-placement provides a coherent spatial layout for the PDF without burdening the user. Row-first scan is deterministic and understandable. The warning covers the edge case where the garden is too small for the beds created.

**Alternatives considered**:
- **Drag-and-drop**: Rejected for this feature — can be added in a future enhancement. The spec does not require it.
- **No positioning (all at 0,0)**: Rejected — GardenPrintView renders beds by position; all-at-0 would stack them invisibly.

---

## Decision 4 — Bed Cell Assignment via Click-to-Open Modal

**Decision**: The garden grid shows beds as positioned tiles (like GardenMap). Clicking a bed tile opens a full-screen modal containing that bed's cell grid (rows × cols) with the same plant picker already used in both GuestPlanner and BedDetail.

**Rationale**: Inline expansion of multiple bed grids simultaneously would produce a very tall, hard-to-navigate page. A modal cleanly scopes the interaction to one bed at a time, matching the GuestPlanner pattern users already know. The `PlantPicker` component in the existing GuestPlanner is self-contained and can be lifted into the new page with minimal changes.

**Alternatives considered**:
- **Separate route per bed (`/planner/beds/:id`)**: Rejected — adds routing complexity; the guest planner is a single-page experience with no server-side IDs.
- **Accordion expand per bed**: Rejected — with many beds the page becomes unwieldy; modal keeps the grid accessible at any time.

---

## Decision 5 — Sign-Up Carry-Over API Call Sequence

**Decision**: On registration, Signup.jsx reads `gh_guest_garden` from `localStorage` and performs these API calls in order:

1. `PUT /api/auth/me/garden` — sets `gardenWidth` and `gardenHeight` on the new account.
2. For each bed (sequentially): `POST /api/beds` → `PUT /api/beds/:id` (position) → `PUT /api/beds/:id/cells` (if cells).
3. `localStorage.removeItem('gh_guest_garden')` — clean up.
4. `navigate('/map')` — land on full garden map.

**Rationale**: Garden dimensions must be set **before** `PUT /api/beds/:id` because the backend validates that `mapRow + bed.rows ≤ gardenHeight` (and same for width). Sequential bed creation avoids concurrent write conflicts. Navigating to `/map` is the correct destination because the user now has a multi-bed garden, not a single bed detail page.

**Alternatives considered**:
- **Parallel bed creation**: Rejected — `PUT /api/beds/:id` (position) requires the `_id` returned by `POST /api/beds`; parallelising within each bed is not possible.
- **Navigate to `/beds/:id` of first bed**: Rejected — user has multiple beds; the garden map gives the right overview.
- **Keep gh_guest_bed sessionStorage key as fallback**: Rejected — dual-path complicates Signup logic; old key is removed as part of this feature.

---

## Decision 6 — Old GuestPlanner Removed, Not Redirected

**Decision**: Delete `frontend/src/pages/GuestPlanner.jsx` and replace the `/planner` route in `App.jsx` with the new `StandardGuestPlanner`. No redirect — the URL is the same.

**Rationale**: The spec requires the old page to be removed (FR-007). Since the URL `/planner` does not change, no redirect is needed. The Landing page CTA and any bookmarked direct links continue to work without modification.

**Alternatives considered**:
- **Keep old file, import new one at same route**: Rejected — leaves dead code in the codebase, violating Principle VII (Simplicity & YAGNI).
