# Quickstart & Validation: UI Regression Test Suite

**Branch**: `005-ui-regression-tests` | **Date**: 2026-02-24

---

## Prerequisites

1. Local dev stack is running: `./scripts/start.sh`
2. Verify the app is accessible: `curl http://localhost:5173` returns HTML
3. Verify the backend is seeded (system plants exist): `curl http://localhost:5173/api/plants/public` returns a non-empty array

---

## Running the Suite

```bash
# From the project root

# Install Playwright (first time only)
npm install
npx playwright install chromium

# Run full suite
npx playwright test

# Run a single spec file
npx playwright test tests/e2e/auth.spec.js

# Run with browser visible (headed mode, useful for debugging)
npx playwright test --headed

# Show HTML report after run
npx playwright show-report
```

---

## Manual Validation Checklist

Work through each suite independently. Each can be validated by running its spec file in headed mode and observing browser behaviour.

---

### Suite 1 — Authentication

```bash
npx playwright test tests/e2e/auth.spec.js --headed
```

- [ ] Valid login navigates to `/dashboard` with garden name in sidebar
- [ ] Sign out redirects to `/` and prevents re-access to `/dashboard`
- [ ] Direct navigation to `/dashboard` without auth redirects to `/login`
- [ ] Signup with a new email lands on `/dashboard` with no errors
- [ ] Wrong password shows error message, stays on `/login`

---

### Suite 2 — Garden Bed Management

```bash
npx playwright test tests/e2e/beds.spec.js --headed
```

- [ ] New owner sees the garden setup form on Garden Map; submitting dimensions shows the grid
- [ ] Creating a bed with name + dimensions makes the bed appear in the beds list
- [ ] Clicking an empty cell opens the plant picker; selecting a plant shows its emoji on the cell
- [ ] Clicking an assigned cell and choosing "Remove plant" clears the cell
- [ ] `/beds` lists all created beds with correct names and dimensions
- [ ] Clicking "Download PDF" with a planted bed triggers a `.pdf` file download

---

### Suite 3 — Harvest Logging

```bash
npx playwright test tests/e2e/harvests.spec.js --headed
```

- [ ] Logging a harvest (plant + quantity + date) adds it to the harvest list immediately
- [ ] Existing harvest entries show the correct plant name, quantity, and date
- [ ] `/analytics` loads without error and shows season totals when harvest data exists

---

### Suite 4 — Guest Planner

```bash
npx playwright test tests/e2e/guest-planner.spec.js --headed
```

- [ ] `/planner` loads without login redirect (no token in browser)
- [ ] Setup form accepts rows + cols; grid is shown after submit
- [ ] Clicking a cell opens plant picker showing only system plants (no custom plants)
- [ ] "Sign up to save" with plants placed → signup → lands on saved bed detail page
- [ ] Landing page `/` has a "Try free planner" link that navigates to `/planner`

---

### Suite 5 — Navigation & Layout

```bash
npx playwright test tests/e2e/navigation.spec.js --headed
```

- [ ] Sidebar shows: Dashboard, Garden Map, Harvests, Analytics, Profile, Admin (for owner)
- [ ] Sidebar collapse button hides labels and shows icons only
- [ ] Mobile viewport (375px): menu icon opens sidebar overlay

---

## Interpreting Results

```
✓  5 passed (12s)   ← all green
✗  2 failed         ← check the HTML report: npx playwright show-report
```

Playwright generates a `playwright-report/` directory at the root with screenshots and traces for failed tests. For any failure, the trace viewer (`npx playwright show-report`) shows exactly which assertion failed and a step-by-step recording.
