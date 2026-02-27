# Quickstart: Standard Garden Plan for Free Users

**Branch**: `011-standard-guest-plan`

---

## What changes

| File | Change |
|------|--------|
| `frontend/src/pages/GuestPlanner.jsx` | **Deleted** — replaced by StandardGuestPlanner |
| `frontend/src/pages/StandardGuestPlanner.jsx` | **New** — multi-bed guest planner with localStorage persistence |
| `frontend/src/App.jsx` | Import `StandardGuestPlanner`; swap route at `/planner` |
| `frontend/src/pages/Signup.jsx` | Update carry-over: read `gh_guest_garden` from localStorage, create all beds + positions + cells, navigate to `/map` |
| `tests/e2e/guest-planner.spec.js` | Update tests to cover multi-bed flow and localStorage persistence |

No backend changes. No new packages.

---

## Verify manually

### Scenario A — New guest starts planning

1. Open a **private/incognito** browser window (ensures clean localStorage).
2. Go to **http://localhost:5173/planner** (no login).
3. Verify:
   - Page loads the new standard planner — **no single-bed setup form**.
   - Garden dimensions default to **10 × 10 ft**.
   - An **"Add bed"** button is visible.

---

### Scenario B — Add multiple beds and assign plants

1. Click **Add bed** → enter "Raised Bed 1", 2 ft × 4 ft → confirm.
2. Click **Add bed** again → enter "Herb Box", 1 ft × 3 ft → confirm.
3. Verify both beds appear on the garden grid, each at a distinct position.
4. Click **Raised Bed 1** → a cell grid opens (2 rows × 4 cols).
5. Click cell (0,0) → plant picker opens → choose a plant → verify emoji appears.
6. Close the cell editor.

---

### Scenario C — Persistence across browser close

1. After Scenario B, **close the browser tab entirely**.
2. Reopen **http://localhost:5173/planner**.
3. Verify:
   - Both beds are still present.
   - The plant assigned in Scenario B is still in its cell.

---

### Scenario D — Download PDF

1. With at least two planted beds, click **Download PDF**.
2. Open the file and verify:
   - **Page 1 (map)**: Both beds appear as spatially positioned tiles on the garden grid.
   - **Page 2 (checklist)**: Plants are listed with quantities.

---

### Scenario E — Sign up carry-over (multi-bed)

1. From the planner with two beds planted, click **Sign up to save**.
2. Complete registration with a new unique email.
3. Verify:
   - Redirected to **/map** (not `/beds/:id`).
   - Both beds appear on the garden map.
   - Bed positions and plant assignments match what was set in the guest planner.
   - `localStorage` key `gh_guest_garden` is **gone** after redirect.

---

### Scenario F — Login with existing account does not overwrite

1. Load the guest planner and add one bed.
2. Navigate to **/login** and sign in as `mike@gardenhive.com` / `321qaz`.
3. Verify:
   - Mike's existing garden is **unchanged**.
   - No guest bed appears in his garden.

---

### Scenario G — Landing page CTA still works

1. Go to **http://localhost:5173**.
2. Click **"Try free planner"**.
3. Verify the new standard planner loads at `/planner`.

---

## Run lint

```bash
cd frontend && npm run lint
```

No new ESLint errors should be introduced in `StandardGuestPlanner.jsx`, `Signup.jsx`, or `App.jsx`.
