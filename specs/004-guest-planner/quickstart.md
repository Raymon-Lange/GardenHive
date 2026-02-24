# Quickstart & Validation: Guest Garden Planner

**Branch**: `004-guest-planner` | **Date**: 2026-02-24

---

## Manual Validation Checklist

Work through each scenario in order. Each can be tested independently.

---

### US1 — Design a Garden Bed as a Guest

**Setup**: Open the app in an incognito window (no token in localStorage).

- [ ] Navigate to `/planner` directly — confirm no login prompt appears.
- [ ] The bed creation form is shown with fields: Name (optional), Rows, Cols.
- [ ] Submit with empty rows/cols — confirm validation error, no grid rendered.
- [ ] Submit with rows=4, cols=3, name="Test Bed" — confirm a 4×3 grid appears.
- [ ] A banner is visible stating the layout is not saved and will be lost on exit.
- [ ] Click an empty cell — confirm the plant picker opens showing only system plants.
- [ ] Assign a plant to a cell — confirm the cell updates with the plant's emoji.
- [ ] Assign a different plant to another cell.
- [ ] Click an assigned cell again — confirm the plant can be changed or removed.
- [ ] Confirm there is no option to create a custom plant anywhere on the page.
- [ ] Refresh the page — confirm the grid is gone and the form is shown again.

---

### US2 — Download the Layout as a PDF

**Setup**: Continue from US1 with at least one plant assigned.

- [ ] Click "Download PDF" — confirm a PDF file is downloaded.
- [ ] Open the PDF — confirm it shows the bed grid with plant emojis in the correct cells.
- [ ] Confirm the PDF title shows "Test Bed" (the name entered in the form).
- [ ] Confirm a shopping list is included listing the plants used.
- [ ] Confirm the PDF format matches the format produced for registered users.
- [ ] Remove all plants from the grid — confirm the "Download PDF" button is disabled or shows a message.

---

### US3 — Access the Free Planner from the Landing Page

**Setup**: Open the landing page (`/`) in an incognito window.

- [ ] Confirm a "Try Free Planner" button is visible in the hero section without scrolling (desktop).
- [ ] Confirm the button is visible without scrolling on a mobile viewport.
- [ ] Click "Try Free Planner" — confirm it navigates to `/planner` with no login prompt.
- [ ] Confirm the primary "Start for free" button still links to `/signup`.

---

### Sign-Up Carry-Over

**Setup**: Start from the guest planner with a designed bed (at least 2 plants placed).

- [ ] Click "Sign up to save" — confirm it navigates to `/signup`.
- [ ] Complete registration with a new account.
- [ ] After signup, confirm the app navigates directly to the saved bed detail page.
- [ ] Confirm the bed exists with the correct name, dimensions, and plant assignments.
- [ ] Open a second incognito tab and navigate to `/planner` — confirm no carry-over data leaks between sessions.

---

### AppLayout Guest Behaviour

- [ ] On `/planner`, confirm the app shell renders without errors (no crash from null user).
- [ ] Confirm the nav does not show a logged-in user's name or profile link.
- [ ] Click a protected nav link (e.g., "Beds") — confirm it redirects to `/login`.
