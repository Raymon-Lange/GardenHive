# Research: Improved Bed Planting UI

**Branch**: `014-bed-planting-ui` | **Date**: 2026-03-07

---

## Decision 1: Stamp mode vs. modal per cell

**Decision**: Stamp mode (select plant first, then click cells to apply).

**Rationale**: The modal-per-cell workflow interrupts flow for any repetitive planting task. Stamp mode allows a user to fill a row of identical crops with N clicks rather than N×3 interactions (click cell, pick plant, dismiss). This is the primary UX improvement requested.

**Alternatives considered**:
- Keep modal, add "pin plant" toggle that re-opens pre-selected → more complex state, still interrupts flow.
- Drag from panel into cell → harder to implement with touch support, overkill for current scope.

---

## Decision 2: Inline panel vs. persistent sidebar

**Decision**: Inline panel inside the bed detail page, two-column layout (grid left, panel right) on desktop; stacked (grid above, panel below) on mobile.

**Rationale**: The app already has a global sidebar. Adding a second sidebar-level fixture would clash with the layout. An inline panel scoped to the bed detail page is the minimum change and keeps the layout predictable.

**Alternatives considered**:
- Floating sticky panel on the right → obscures grid on small screens.
- Drawer that slides in → adds an open/close interaction that defeats the "always visible" goal.

---

## Decision 3: Clear bed — client loop vs. dedicated backend endpoint

**Decision**: New backend endpoint `DELETE /beds/:id/cells` that clears all cell assignments server-side in a single DB write.

**Rationale**: A bed can have up to 2,500 cells (50×50). Firing 2,500 sequential `PUT /beds/:id/cells` requests client-side is unacceptable. A single server-side `$set` on the cells array is O(1) network, O(1) DB.

**Alternatives considered**:
- Client loop with `Promise.all` → still 2,500 HTTP requests, DoS risk.
- Reuse `PUT /beds/:id` with `clearCells: true` flag → avoids a new route but overloads an existing endpoint with unrelated behaviour; harder to test.

**Constitution alignment**: `DELETE` on a sub-resource (`/cells`) is the correct REST verb per §II. Requires a new route file entry and a matching backend test per §VI.

---

## Decision 4: No category filter in inline panel

**Decision**: Remove the category filter buttons from the inline panel; keep only the search bar.

**Rationale**: The panel is space-constrained when rendered beside a grid. The search bar covers the filter use case (typing "herb" narrows to herbs). Removing the category chips simplifies the component and reduces vertical space usage.

**Alternatives considered**:
- Keep category chips → clutters the panel header, requires horizontal scrolling on narrow viewports.
- Collapsible filter row → adds interaction complexity for marginal benefit.

---

## Decision 5: No persistence of selected plant

**Decision**: `selectedPlant` is local `useState` only — not persisted to localStorage or the server.

**Rationale**: The selection is a transient UI state tied to the current editing session. If the user navigates away and returns, starting with no plant selected is the correct default (prevents accidental stamping).

---

## Decision 6: Existing PlantPicker modal

**Decision**: Remove the `PlantPicker` modal component entirely from `BedDetail.jsx`. It is not used anywhere else in the codebase.

**Rationale**: The inline panel fully replaces the modal's function. Keeping dead code violates §VII (YAGNI).

---

## Files affected

| File | Change |
|------|--------|
| `frontend/src/pages/BedDetail.jsx` | Full refactor — inline panel, stamp mode, clear bed button |
| `backend/src/routes/beds.js` | Add `DELETE /beds/:id/cells` handler |
| `backend/src/__tests__/beds.test.js` | Add tests for new endpoint |
