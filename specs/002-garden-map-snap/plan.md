# Implementation Plan: Garden Map with Drag-and-Snap Bed Placement

**Branch**: `002-garden-map-snap` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)

---

## Summary

Add interactive drag-and-snap bed placement to the existing Garden Map view. Users set garden dimensions once (stored on their user record); the map grid renders at that size. Beds can be created with specified dimensions and placed on the grid by dragging — they snap to the nearest square-foot cell on release. Overlap and boundary checks are enforced both on the frontend (immediate feedback) and the backend (authoritative validation). Existing beds can also be picked up and repositioned. The `GardenBed` model already stores `mapRow`/`mapCol`; the `GardenMap.jsx` page already renders a static grid from those fields. This feature makes that grid interactive.

---

## Technical Context

**Language/Version**: Node.js 22 (backend) / React 19 (frontend)
**Primary Dependencies**: Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React
**Storage**: MongoDB 7
**Testing**: Jest 29 + Supertest + `mongodb-memory-server`
**Target Platform**: Web (desktop + mobile — pointer events required for touch support)
**Performance Goals**: Drag preview renders in real time (no perceptible lag); snap animation completes in one visual frame
**Constraints**: Zero new npm dependencies; no `findDOMNode`; `touch-action: none` on draggable elements; no real-time collaboration
**Scale/Scope**: Single-user garden (one `gardenWidth`/`gardenHeight` per owner); up to ~50 beds

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Layered Separation | ✅ | All position validation (overlap, boundary) enforced in Express route. Frontend does pre-flight check for immediate UX only; backend is authoritative. |
| II. REST-First API Design | ✅ | Extends `PUT /api/beds/:id` with optional `mapRow`/`mapCol` fields. Extends `PUT /api/auth/me/garden` with `gardenWidth`/`gardenHeight`. No verb-in-URL patterns. Uses 409 for conflict, 400 for bad input. |
| III. Permission-Gated Multi-Tenancy | ✅ | `PUT /api/beds/:id` already uses `requireAccess('full')`. Position update checks `req.gardenPermission === 'owner'`. Helpers see map read-only. |
| IV. Schema-Validated Data Integrity | ✅ | `gardenWidth`/`gardenHeight` added with `default: null` — additive change, no migration. `mapRow`/`mapCol` already in schema with `default: null`. |
| V. Server State via React Query / Context | ✅ | Bed positions read via existing `['beds']` query. Dimension save via mutation invalidating `['user']`/`['beds']`. Drag state is local `useState`. `AuthContext` provides `user.gardenWidth`/`gardenHeight`. |
| VI. Test-Before-Deploy | ✅ | New backend validation (overlap, boundary, dimension fields) covered by tests before merge. CI blocks deploy on failure. |
| VII. Simplicity & YAGNI | ✅ | Zero new npm dependencies. No service layer (handler stays under 150 lines). No new model files. Extend two existing routes. |
| VIII. Consistent Naming & Code Style | ✅ | `mapRow`, `mapCol`, `gardenWidth`, `gardenHeight` (camelCase). `isDragging`, `handlePointerDown` (correct prefixes). `useBeds` hook pattern preserved. |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-garden-map-snap/
├── spec.md              ✅
├── plan.md              ✅ (this file)
├── research.md          ✅
├── data-model.md        ✅
├── quickstart.md        ✅
├── contracts/
│   ├── auth.md          ✅
│   └── beds.md          ✅
└── checklists/
    └── requirements.md  ✅
```

### Source Code — Files Modified

```text
backend/
├── src/
│   ├── models/
│   │   └── User.js                  MODIFY — add gardenWidth, gardenHeight fields
│   ├── routes/
│   │   ├── auth.js                  MODIFY — update userPayload(); extend PUT /me/garden
│   │   └── beds.js                  MODIFY — extend PUT /:id to accept mapRow, mapCol
│   └── __tests__/
│       ├── auth.test.js             MODIFY — add tests for gardenWidth/gardenHeight
│       └── beds.test.js             MODIFY — add tests for position update, overlap, boundary

frontend/
├── src/
│   ├── pages/
│   │   └── GardenMap.jsx            MODIFY — major rework: dimensions prompt, drag-and-snap, add bed
│   ├── components/
│   │   └── GardenDimensionsModal.jsx  NEW — isolated modal for first-time dimension setup
│   └── context/
│       └── AuthContext.jsx          MODIFY — expose gardenWidth/gardenHeight from user payload
```

**Structure Decision**: Web application layout (backend + frontend). No new route files, no new model files, no new service layer. Two existing routes extended; two existing components modified; one new focused component added for the dimensions modal.

---

## Implementation Details

### Backend: User model change

`backend/src/models/User.js` — add after `gardenImage`:

```js
gardenWidth:  { type: Number, min: 1, default: null },
gardenHeight: { type: Number, min: 1, default: null },
```

### Backend: userPayload update

`backend/src/routes/auth.js` — update `userPayload()`:

```js
function userPayload(user) {
  return {
    id:           user._id,
    name:         user.name,
    email:        user.email,
    role:         user.role || 'owner',
    gardenName:   user.gardenName   || null,
    gardenImage:  user.gardenImage  || null,
    gardenWidth:  user.gardenWidth  ?? null,
    gardenHeight: user.gardenHeight ?? null,
  };
}
```

### Backend: Extend PUT /me/garden

`backend/src/routes/auth.js` — extend the garden handler to accept dimensions and validate them:

1. Parse `gardenWidth` and `gardenHeight` from body (both optional).
2. If provided and not null: validate positive integer → 400 on failure.
3. If reducing dimensions: check that no placed bed's footprint exceeds the new size → 400 if violation.
4. Save and return `userPayload(user)`.

### Backend: Extend PUT /api/beds/:id

`backend/src/routes/beds.js` — extend the update handler:

1. Parse `mapRow` and `mapCol` from body (both optional).
2. If both provided and not null:
   - Validate non-negative integers → 400.
   - Load owner's `gardenWidth`/`gardenHeight` from User → 400 if not set.
   - Check boundary: `mapCol + bed.cols ≤ gardenWidth && mapRow + bed.rows ≤ gardenHeight` → 400 if violated.
   - Overlap check: query all other placed beds, run AABB test → 409 if collision.
3. Update `mapRow`/`mapCol` on the bed document.

### Frontend: GardenDimensionsModal

New isolated component. Props: `onSave(width, height)`, `onCancel` (optional — modal is not dismissible without submitting on first visit). Contains: two number inputs, validation, submit button. Calls `PUT /api/auth/me/garden` mutation; on success, calls `onSave` and invalidates `['user']` query.

### Frontend: GardenMap rework

Key changes:
1. Read `gardenWidth`/`gardenHeight` from `AuthContext` user.
2. If either is null, show `<GardenDimensionsModal>` instead of the grid.
3. Replace derived `totalCols`/`totalRows` with `user.gardenWidth`/`user.gardenHeight`.
4. Add `ref` to the grid container div for `getBoundingClientRect()` during drag.
5. Add `useState` for drag state: `null | { bedId, grabOffsetX, grabOffsetY, liveRow, liveCol }`.
6. `onPointerDown` on each bed: capture pointer, record grab offset.
7. `onPointerMove` on the grid container: compute live snap position, clamp to boundary, update drag state.
8. `onPointerUp` on the grid container: run overlap check; if clear, fire position mutation; if not, revert.
9. Add `style={{ touchAction: 'none' }}` to each draggable bed element.
10. Add **+ Add Bed** button that opens a small inline form (name, width, height) → `POST /api/beds` mutation.
11. Beds being dragged render from `dragging.liveRow`/`liveCol`; all others render from React Query data.
12. Helper role: beds rendered without pointer event handlers (read-only).

### Frontend: AuthContext

Add `gardenWidth` and `gardenHeight` to the `user` shape returned by `updateUser()`. No structural change needed — the `updateUser(fields)` merge helper already handles partial payloads.
