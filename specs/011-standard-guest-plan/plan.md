# Implementation Plan: Standard Garden Plan for Free Users

**Branch**: `011-standard-guest-plan` | **Date**: 2026-02-27 | **Spec**: [spec.md](./spec.md)

## Summary

Replace the single-bed session-only `GuestPlanner` page with a full multi-bed `StandardGuestPlanner` at the same `/planner` URL. The new planner mirrors the authenticated GardenMap experience — garden dimensions (defaulting to 10 × 10 ft), multiple beds with auto-placement on a spatial grid, per-bed plant cell assignment, PDF download, and local-storage persistence across browser sessions. On sign-up, all guest beds carry over to the new account via three API calls per bed (create → position → cells).

## Technical Context

**Language/Version**: JavaScript + React 19 (frontend only — no backend changes)
**Primary Dependencies**: jsPDF 4.x + html2canvas 1.x (already installed), React Router 7, TanStack React Query 5
**Storage**: `localStorage` key `gh_guest_garden` (browser only — no server storage)
**Testing**: Manual verification per quickstart.md; update existing Playwright E2E suite in `tests/e2e/guest-planner.spec.js`
**Target Platform**: Browser (same as existing frontend)
**Performance Goals**: No change — same PDF pipeline as GardenMap
**Constraints**: Frontend-only; no new packages; no new API routes; no new backend models
**Scale/Scope**: Replaces one page component; touches three existing files

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Layered Separation | ✅ Pass | Pure frontend change. All API calls use existing endpoints. |
| II. REST-First API Design | ✅ Pass | Carry-over uses existing `PUT /api/auth/me/garden`, `POST /api/beds`, `PUT /api/beds/:id`, `PUT /api/beds/:id/cells`. No new routes. |
| III. Permission-Gated Multi-Tenancy | ✅ Pass | No new routes. Carry-over posts as the newly registered user — existing `requireAccess` middleware enforces ownership. |
| IV. Schema-Validated Data Integrity | ✅ Pass | No model changes. |
| V. Server State via React Query / UI State | ✅ Pass | Guest planner uses `useState` (local) for in-session state; `localStorage` for persistence. No server state involved until carry-over. `usePublicPlants` uses React Query as before. |
| VI. Test-Before-Deploy | ✅ Pass | Manual verification per quickstart.md; E2E tests updated. |
| VII. Simplicity & YAGNI | ✅ Pass | No drag-and-drop added (future enhancement). Auto-placement keeps bed logic simple. No new helper abstractions. |
| VIII. Consistent Naming | ✅ Pass | `StandardGuestPlanner.jsx` (PascalCase), `gh_guest_garden` (matches existing `gh_*` key convention). |

## Project Structure

### Documentation (this feature)

```text
specs/011-standard-guest-plan/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (files changed)

```text
frontend/
└── src/
    ├── pages/
    │   ├── GuestPlanner.jsx            ← DELETED
    │   ├── StandardGuestPlanner.jsx    ← NEW (replaces GuestPlanner)
    │   └── Signup.jsx                  ← MODIFIED (carry-over: multi-bed + localStorage)
    └── App.jsx                         ← MODIFIED (swap GuestPlanner → StandardGuestPlanner)

tests/
└── e2e/
    └── guest-planner.spec.js           ← MODIFIED (update for multi-bed flow)
```

**No new files beyond `StandardGuestPlanner.jsx`. No backend changes. No new packages.**

## Complexity Tracking

> No constitution violations. No complexity entries required.

---

## Implementation Approach

### New Page: `StandardGuestPlanner.jsx`

#### State & Persistence

```jsx
const STORAGE_KEY  = 'gh_guest_garden';
const DEFAULT_GARDEN = { gardenWidth: 10, gardenHeight: 10, beds: [] };

// Load from localStorage on mount; fall back to default if unavailable
const [garden, setGarden] = useState(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_GARDEN;
  } catch {
    return DEFAULT_GARDEN;
  }
});

// Auto-save on every change
useEffect(() => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(garden)); } catch { /* storage unavailable */ }
}, [garden]);
```

#### Auto-Placement Algorithm

When a bed is added, scan `(row, col)` positions in row-first order to find the first slot where the bed fits entirely within the garden and does not overlap any existing bed:

```js
function findPosition(garden, newBed) {
  for (let r = 0; r <= garden.gardenHeight - newBed.rows; r++) {
    for (let c = 0; c <= garden.gardenWidth - newBed.cols; c++) {
      const candidate = { mapRow: r, mapCol: c, rows: newBed.rows, cols: newBed.cols };
      const overlaps = garden.beds.some((b) =>
        c          < b.mapCol + b.cols &&
        c + newBed.cols > b.mapCol &&
        r          < b.mapRow + b.rows &&
        r + newBed.rows > b.mapRow
      );
      if (!overlaps) return { mapRow: r, mapCol: c };
    }
  }
  return { mapRow: 0, mapCol: 0 }; // fallback: place at origin (show warning)
}
```

#### UI Sections

1. **Top bar**: Garden title ("My Garden"), dimensions badge (`10 × 10 ft · N beds`), "Sign up to save" button, "Download PDF" button.
2. **Unsaved warning** (if localStorage unavailable): "Your plan cannot be saved — enable storage in browser settings."
3. **Add bed form** (toggle): Name, Width (cols), Height (rows) → "Add" button. Mirrors GardenMap's add-bed form.
4. **Garden grid**: SVG dot grid + positioned bed tiles at `mapCol × CELL_PX`, `mapRow × CELL_PX`. Clicking a bed tile opens the cell editor modal.
5. **Cell editor modal**: Shows the bed's rows × cols grid. Click a cell → plant picker → assign/clear plant. Close button dismisses.
6. **Beds legend**: List of beds with their dimensions (like GardenMap legend).

#### PDF Download

Identical to `GardenMap.handleDownloadPdf`. Pass `garden.beds` (formatted as `GardenPrintView` expects: each bed has `_id` = `bed.id`, `cells` with `plantId` = `cell.plant`) to `GardenPrintView`.

```jsx
const printBeds = garden.beds.map((b) => ({
  ...b,
  _id: b.id,
  cells: b.cells.map((c) => ({ row: c.row, col: c.col, plantId: c.plant })),
}));

<GardenPrintView
  ref={printViewRef}
  beds={printBeds}
  gardenWidth={garden.gardenWidth}
  gardenHeight={garden.gardenHeight}
  gardenName="My Garden Plan"
/>
```

#### Sign Up to Save

```js
function handleSignupToSave() {
  // gh_guest_garden is already in localStorage — no action needed
  navigate('/signup');
}
```

Signup.jsx reads it during registration (see below).

---

### Modified: `Signup.jsx`

Replace the single-bed `sessionStorage` carry-over block with a multi-bed `localStorage` carry-over:

```js
// After register() succeeds:
const saved = localStorage.getItem('gh_guest_garden');
if (saved) {
  const guestGarden = JSON.parse(saved);
  // 1. Set garden dimensions
  await api.put('/auth/me/garden', {
    gardenWidth:  guestGarden.gardenWidth,
    gardenHeight: guestGarden.gardenHeight,
  });
  // 2. Create each bed sequentially
  for (const guestBed of guestGarden.beds) {
    const { data: newBed } = await api.post('/beds', {
      name: guestBed.name,
      rows: guestBed.rows,
      cols: guestBed.cols,
    });
    await api.put(`/beds/${newBed._id}`, {
      mapRow: guestBed.mapRow,
      mapCol: guestBed.mapCol,
    });
    if (guestBed.cells.length > 0) {
      await api.put(`/beds/${newBed._id}/cells`, {
        cells: guestBed.cells.map((c) => ({
          row: c.row, col: c.col, plantId: c.plant._id,
        })),
      });
    }
  }
  localStorage.removeItem('gh_guest_garden');
  navigate('/map');
} else {
  navigate('/dashboard');
}
```

Remove the old `sessionStorage.getItem('gh_guest_bed')` block entirely.

---

### Modified: `App.jsx`

```jsx
// Remove:
import GuestPlanner from './pages/GuestPlanner';
// Add:
import StandardGuestPlanner from './pages/StandardGuestPlanner';

// Route unchanged:
<Route path="/planner" element={<StandardGuestPlanner />} />
```

---

### Modified: `tests/e2e/guest-planner.spec.js`

Update four existing tests and add one new persistence test:

| Test | Change |
|------|--------|
| `guest can access /planner without being redirected` | Update selector — no longer looks for rows/cols inputs |
| `plant picker opens when clicking a cell after setup` | Add bed first, then click bed tile, then click cell |
| `sign-up carry-over` | Verify both beds appear on `/map` after signup; verify localStorage cleared |
| `landing page CTA links to /planner` | No change needed |
| **NEW**: `plan persists after reload` | Add bed, reload page, verify bed still present |
