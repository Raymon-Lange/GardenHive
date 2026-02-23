# Quickstart: Garden Map with Drag-and-Snap — Manual Test Guide

**Branch**: `002-garden-map-snap` | **Date**: 2026-02-23

---

## Setup

1. Start the stack: `docker compose up`
2. Seed demo data: `cd backend && npm run seed:all`
3. Open `http://localhost:5173`
4. Log in as the demo owner: `owner@demo.com` / `password123`

---

## Test Scenarios

### US1 — Garden dimension setup

**Scenario A: First visit, no dimensions set**
1. Log in as a freshly registered account (no beds, no dimensions).
2. Navigate to **Garden Map** via the nav menu.
3. **Expected**: A modal or inline form prompts for garden width and height in feet. Map grid is NOT shown yet.
4. Enter `20` for width and `12` for height. Submit.
5. **Expected**: A 20 × 12 grid appears. Each cell is one square foot.
6. Refresh the page.
7. **Expected**: The grid appears immediately without re-prompting.

**Scenario B: Validation**
1. Open the dimensions form.
2. Submit with empty fields.
3. **Expected**: Error — fields are required.
4. Enter `0` for width.
5. **Expected**: Error — must be positive.
6. Enter `-5`.
7. **Expected**: Error — must be positive.

**Scenario C: Demo account already has dimensions**
1. Log in as `owner@demo.com`.
2. Navigate to **Garden Map**.
3. **Expected**: Grid is shown immediately. No dimension prompt.

---

### US2 — Create and place a new bed

**Pre-condition**: Logged in as `owner@demo.com` with garden dimensions set.

**Scenario A: Create and drag a new bed**
1. On the Garden Map, click **+ Add Bed** (or equivalent button).
2. Enter name `Test Bed`, width `3`, height `2`.
3. Submit.
4. **Expected**: New bed appears on the map (unplaced staging area or default top-left position).
5. Click and drag the bed to an empty area of the grid.
6. **Expected**: Bed moves with the pointer. A snap preview shows the nearest grid-aligned position as you drag.
7. Release the mouse/touch.
8. **Expected**: Bed snaps to the nearest valid grid cell and stays there.
9. Refresh the page.
10. **Expected**: Bed is shown at the same grid position.

**Scenario B: Overlap prevention**
1. Drag a bed onto a position fully occupied by another bed.
2. **Expected**: Drop is rejected. Bed returns to its previous position. A brief error indicator is shown.

**Scenario C: Boundary enforcement**
1. Drag a bed so it would extend beyond the right or bottom edge of the garden.
2. **Expected**: Bed is clamped to fit within the garden boundary. It cannot be dropped outside.

---

### US3 — Move an existing placed bed

**Pre-condition**: At least two beds are placed on the map.

**Scenario A: Move to empty space**
1. Pick up a placed bed by clicking and dragging.
2. Drag to a different empty area.
3. Release.
4. **Expected**: Bed snaps to new position. Old position is now empty.
5. Refresh.
6. **Expected**: Bed is at the new position.

**Scenario B: Attempted move into overlap**
1. Drag a placed bed on top of another placed bed.
2. Release.
3. **Expected**: Bed returns to its original position. No change is saved.

---

## API Verification

```bash
# Confirm gardenWidth / gardenHeight in user payload
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/me

# Set garden dimensions
curl -X PUT http://localhost:3000/api/auth/me/garden \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"gardenWidth": 20, "gardenHeight": 12}'

# Update bed position
curl -X PUT http://localhost:3000/api/beds/<bedId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mapRow": 2, "mapCol": 3}'

# Attempt overlap — should return 409
curl -X PUT http://localhost:3000/api/beds/<anotherBedId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mapRow": 2, "mapCol": 3}'
```

---

## Validation Checklist

- [ ] Dimension prompt appears on first visit, not on subsequent visits
- [ ] Grid matches entered dimensions exactly (count cells)
- [ ] New bed creation form works with valid and invalid inputs
- [ ] Drag shows real-time snap preview
- [ ] Drop on empty space: position saved and persists after refresh
- [ ] Drop on overlap: reverted, no API call made or API returns 409
- [ ] Drop outside boundary: clamped to valid position
- [ ] Existing beds can be moved with same drag-and-snap behaviour
- [ ] `GET /api/auth/me` returns `gardenWidth` and `gardenHeight`
- [ ] `PUT /api/auth/me/garden` accepts and persists dimensions
- [ ] `PUT /api/beds/:id` with `mapRow`/`mapCol` returns 409 on overlap
- [ ] Helper role sees map read-only (no drag handles)
