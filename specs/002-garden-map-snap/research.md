# Research: Garden Map with Drag-and-Snap Bed Placement

**Branch**: `002-garden-map-snap` | **Date**: 2026-02-23

---

## Decision 1: Drag-and-drop implementation approach

**Decision**: Use the **Pointer Events API** (browser-native, zero dependencies).

**Rationale**: The spec requires drag-to-position with snap-to-grid and overlap detection. All four candidate approaches (HTML5 DnD, Pointer Events, react-dnd, @dnd-kit) perform identical grid arithmetic at drop time; the difference is how the live drag position is exposed. Pointer Events provides continuous `pointermove` coordinates, enabling a real-time snap preview. HTML5 DnD does not expose live coordinates and is broken on iOS. Both library options (react-dnd ~29 kB; @dnd-kit ~13 kB) add dependencies without removing any logic — they wrap the same pointer math. Constitution Principle VII (YAGNI) requires justifying new dependencies; there is no justification here since the browser already provides everything needed.

**Alternatives considered**:
- **HTML5 Drag and Drop API** — rejected: no continuous coordinates during drag (cannot show snap preview), non-functional on iOS/Android.
- **react-dnd** — rejected: ~29 kB across three packages, requires a separate touch backend, known React 19 compatibility issues with `ReactDOM.findDOMNode` removal, all overlap/snap logic still written manually.
- **@dnd-kit/core** — rejected: ~13 kB across two packages, some React 19 compatibility risk, all overlap/snap logic still written manually. A valid fallback if the raw implementation proves too complex.

**Key implementation patterns**:

```js
// Snap pixel position → grid cell (CELL_PX = 28)
const col = Math.round(rawX / CELL_PX);
const row = Math.round(rawY / CELL_PX);

// Overlap detection — AABB check
function bedsOverlap(a, b) {
  return (
    a.mapCol          < b.mapCol + b.cols  &&
    a.mapCol + a.cols > b.mapCol           &&
    a.mapRow          < b.mapRow + b.rows  &&
    a.mapRow + a.rows > b.mapRow
  );
}
```

On `pointerdown`: call `element.setPointerCapture(e.pointerId)` to keep events flowing during fast moves. Apply `style={{ touchAction: 'none' }}` to draggable beds to suppress browser scroll interference.

Dragged bed renders from local `dragging` state during the move; all other beds render from React Query cache. On `pointerup`: check overlap against all other beds; if clear, call the position mutation; if not, revert to origin position.

---

## Decision 2: Garden dimensions storage

**Decision**: Add `gardenWidth` and `gardenHeight` as flat integer fields directly on the **User model** with `default: null`.

**Rationale**: These are optional, per-user, garden-level scalars — the same kind as the existing `gardenName` and `gardenImage` fields already on User. A `null` value signals "not yet configured," which the frontend uses to gate the dimension-setup prompt. Adding flat fields with `default: null` satisfies Constitution Principle IV (additive changes must use defaults) and requires zero migration. Principle VII (YAGNI) rules out a separate collection (extra round-trip per read, new model file, new route) and a sub-document (awkward null guard, unnecessary nesting for two integers).

**Alternatives considered**:
- **Separate `GardenDimensions` collection** — rejected: extra DB round-trip on every read, new model file + route registration, violates YAGNI for two scalar fields with no independent lifecycle.
- **Embedded sub-document on User** — rejected: `user.gardenDimensions?.gardenWidth` null guards in every consumer vs. the simpler `user.gardenWidth ?? null`; inconsistent with how `gardenName`/`gardenImage` are stored.

---

## Decision 3: API surface for saving dimensions

**Decision**: Extend the existing `PUT /api/auth/me/garden` endpoint to accept `gardenWidth` and `gardenHeight` as optional body fields.

**Rationale**: The route already handles optional garden-level scalar fields (`gardenName`). Adding `gardenWidth`/`gardenHeight` follows the same pattern — callers send whichever keys they need, the handler updates only those present. A dedicated `PUT /api/auth/me/garden-dimensions` endpoint would be justified only if the handler approached ~150 lines of logic (the constitution threshold) or the fields had a different permission boundary. Neither condition applies; the validation is four lines.

**Note**: If FR-016 (allow owner to update dimensions after initial setup) is implemented with validation against placed bed positions (edge case from spec: new dimensions smaller than bounding box of placed beds), that logic stays in this same handler — it queries `GardenBed` directly, which the constitution permits without a service layer.

---

## Decision 4: API surface for saving bed map position

**Decision**: Extend the existing `PUT /api/beds/:id` endpoint to accept `mapRow` and `mapCol` as optional body fields alongside `name`.

**Rationale**: The GardenBed model already has `mapRow` and `mapCol` fields. The existing PUT handler uses `findOneAndUpdate` and currently only passes `name`. Adding `mapRow`/`mapCol` to the update payload (when present in the body) requires one additional guard and two lines in the handler — well under the ~150 line threshold. No new route file is needed. This aligns with Constitution Principle VII (no new files that aren't immediately used) and Principle II (PUT with partial body rather than a verb-in-URL endpoint like `/api/beds/:id/move`).

---

## Decision 5: Existing `GardenMap.jsx` as the base

**Decision**: The existing `GardenMap.jsx` page is the correct base for the interactive implementation. It already handles `mapRow`/`mapCol` filtering, grid sizing, and absolute bed positioning.

**What must be added**:
1. Garden dimensions prompt (shown when `user.gardenWidth == null`; reads from `AuthContext`).
2. "Add bed" affordance on the map (opens a small form to specify width/height; calls `POST /api/beds`).
3. `onPointerDown`/`onPointerMove`/`onPointerUp` handlers on the grid container and each bed.
4. React Query mutation for `PUT /api/beds/:id` (position update).
5. React Query mutation for `PUT /api/auth/me/garden` (dimensions update).

**What must change**: Grid dimensions sourced from `user.gardenWidth`/`user.gardenHeight` (via `AuthContext`) instead of being derived from max bed positions. Beds rendered as draggable elements instead of non-interactive `<button>` elements. (Navigation to bed detail moves to a separate button or click on the bed label, since drag must not conflict with navigation.)
