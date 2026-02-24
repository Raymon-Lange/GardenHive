# Tasks: UI Regression Test Suite

**Input**: Design documents from `/specs/005-ui-regression-tests/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not applicable — this feature IS the test suite.

**Organization**: Tasks grouped by user story (P1 → P2) to enable independent delivery of each spec file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in every description

## Path Conventions

- E2E tests: `tests/e2e/`
- Config: `playwright.config.js` (project root)
- Root package: `package.json` (project root)

---

## Phase 1: Setup

**Purpose**: Create directory structure, install Playwright, configure the runner.

- [X] T001 Create `tests/e2e/` directory tree: `tests/e2e/.auth/`, `tests/e2e/fixtures/` — add a `.gitkeep` to `.auth/` so the folder is tracked but its contents are not
- [X] T002 [P] Create root `package.json` with `{ "type": "module", "devDependencies": { "@playwright/test": "^1.50.0" } }` and run `npm install` then `npx playwright install chromium` (depends on T001)
- [X] T003 [P] Create `playwright.config.js` at project root — set `testDir: './tests/e2e'`, `globalSetup: './tests/e2e/global-setup.js'`, `globalTeardown: './tests/e2e/global-teardown.js'`, `use: { baseURL: process.env.BASE_URL ?? 'http://localhost:5173', storageState: './tests/e2e/.auth/user.json', trace: 'retain-on-failure' }`, `reporter: [['list'], ['html', { open: 'never' }]]` — no `webServer` block (depends on T001)
- [X] T004 [P] Update `.gitignore` at project root — append `tests/e2e/.auth/`, `playwright-report/`, `test-results/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure all spec files depend on — fixture user lifecycle and the `isolatedPage` custom fixture.

**⚠️ CRITICAL**: No spec file can be written until this phase is complete.

- [X] T005 [P] Create `tests/e2e/global-setup.js` — attempt `POST http://localhost:5000/api/auth/login` with `{ email: 'e2e-fixture@test.local', password: 'TestPass123' }`; if login returns 401 register first via `POST /api/auth/register` with `{ name: 'E2E Fixture', email: 'e2e-fixture@test.local', password: 'TestPass123', role: 'owner' }`; inject `gh_token` and `gh_user` into `localStorage` via `page.evaluate`; write `storageState` to `tests/e2e/.auth/user.json`; use `chromium.launch()` + `page.goto('http://localhost:5173')` pattern (depends on T002, T003)
- [X] T006 [P] Create `tests/e2e/global-teardown.js` — read token from `tests/e2e/.auth/user.json` (parse `origins[0].localStorage`), call `DELETE http://localhost:5000/api/auth/me` with the token and `{ password: 'TestPass123' }` body (depends on T002)
- [X] T007 [P] Create `tests/e2e/fixtures/index.js` — export `test` extended from `@playwright/test` with an `isolatedPage` fixture: setup creates a unique user via `POST /api/auth/register` with email `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local` + password `TestPass123`, stores `token` and `user` response, opens a new browser context with no storageState, navigates to `http://localhost:5173`, injects `gh_token`/`gh_user` into localStorage, yields `page`; teardown calls `DELETE /api/auth/me` with the user's token (depends on T002)

**Checkpoint**: Foundation ready — all spec files can now be written independently.

---

## Phase 3: User Story 1 — Authentication Flows (Priority: P1) 🎯 MVP

**Goal**: Automated tests confirming login, logout, signup, protected route redirect, and wrong-password error all work correctly.

**Independent Test**: `npx playwright test tests/e2e/auth.spec.js` passes all 5 cases against a running dev stack.

- [X] T008 [US1] Create `tests/e2e/auth.spec.js` with 5 test cases (import `{ test, expect }` from `@playwright/test`):
  1. **Valid login** — new unauthenticated context; navigate to `/login`; fill email `e2e-fixture@test.local` + password `TestPass123`; click "Sign in"; assert `page.url()` contains `/dashboard` and sidebar contains the fixture user's garden name
  2. **Logout** — use default storageState (logged-in); navigate to `/dashboard`; click "Sign out"; assert redirect to `/` and subsequent navigation to `/dashboard` redirects to `/login`
  3. **Protected redirect** — new unauthenticated context; navigate to `/dashboard`; assert `page.url()` ends with `/login`
  4. **Signup** — new unauthenticated context; navigate to `/signup`; fill name, unique timestamp email, password; click "Create account"; assert redirect to `/dashboard` with no error banner visible
  5. **Wrong password** — new unauthenticated context; navigate to `/login`; fill valid email with wrong password; click "Sign in"; assert error text visible and URL stays `/login`
  (depends on T005, T007)

**Checkpoint**: US1 complete — authentication regression is automated and independently testable.

---

## Phase 4: User Story 2 — Garden Bed Management (Priority: P1)

**Goal**: Automated tests covering garden setup, bed creation, plant assignment, plant removal, bed list, and PDF download.

**Independent Test**: `npx playwright test tests/e2e/beds.spec.js` passes all 6 cases using isolated test users.

- [X] T009 [US2] Create `tests/e2e/beds.spec.js` with 6 test cases using the `isolatedPage` fixture from `tests/e2e/fixtures/index.js`; set garden dimensions via `PUT http://localhost:5000/api/auth/me` with `{ gardenWidth: 10, gardenHeight: 8 }` using the user's token in a `beforeEach` for tests 2–6:
  1. **Garden setup** — navigate to `/map`; assert the dimensions modal is visible; fill width `10` and height `8`; submit; assert the garden grid is rendered (no modal visible)
  2. **Create bed** — navigate to `/map`; click "Add bed"; fill name `E2E Bed`, width `3`, height `2`; click "Create"; assert bed name appears in the page
  3. **Assign plant** — create a bed via `POST /api/beds` then `GET /api/plants/public` for a plant id; navigate to `/beds/:id`; click the first empty cell; assert plant picker dialog is visible; click the first plant in the list; assert the cell now shows the plant's emoji
  4. **Remove plant** — create a bed with a plant pre-assigned via API; navigate to `/beds/:id`; click the assigned cell; assert picker shows "Remove plant" option; click "Remove plant"; assert the cell no longer shows an emoji
  5. **Beds list** — create two beds via API; navigate to `/beds`; assert both bed names appear on the page
  6. **PDF download** — create a bed with at least one plant assigned via API; navigate to `/map`; use `Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF' }).click()])`; assert `download.suggestedFilename()` matches `/\.pdf$/`; read `download.path()` and assert first 4 bytes equal `%PDF`
  (depends on T005, T007)

**Checkpoint**: US2 complete — garden bed management regression is automated and independently testable.

---

## Phase 5: User Story 3 — Harvest Logging (Priority: P1)

**Goal**: Automated tests covering harvest creation, harvest list display, and analytics page load.

**Independent Test**: `npx playwright test tests/e2e/harvests.spec.js` passes all 3 cases using isolated test users.

- [X] T010 [US3] Create `tests/e2e/harvests.spec.js` with 3 test cases using the `isolatedPage` fixture; seed a bed and plant assignment via API in `beforeEach` (`POST /api/beds` + `PUT /api/beds/:id/cells`); use `GET /api/plants/public` to pick a system plant id:
  1. **Log harvest** — navigate to `/harvests`; click "Log harvest" (or equivalent button); select the seeded plant; enter quantity `2`; submit; assert the new entry appears in the harvest list with the correct plant name and quantity
  2. **View harvests** — pre-create a harvest via `POST /api/harvests` with the token; navigate to `/harvests`; assert the entry is visible with the correct plant name, quantity value, and a recognisable date
  3. **Analytics loads** — pre-create a harvest; navigate to `/analytics`; assert page does not show an error state and at least one chart or total value is rendered
  (depends on T005, T007)

**Checkpoint**: US3 complete — harvest logging regression is automated and independently testable.

---

## Phase 6: User Story 4 — Guest Planner (Priority: P2)

**Goal**: Automated tests confirming the public `/planner` page works without auth, the plant picker loads, the sign-up carry-over works, and the landing page CTA is present.

**Independent Test**: `npx playwright test tests/e2e/guest-planner.spec.js` passes all 4 cases in unauthenticated browser contexts.

- [X] T011 [P] [US4] Create `tests/e2e/guest-planner.spec.js` with 4 test cases — all use `browser.newContext()` (no storageState):
  1. **Public access** — navigate to `/planner`; assert URL does not redirect to `/login` and the setup form is visible (rows + cols inputs present)
  2. **Plant picker** — fill rows `3`, cols `3`; submit setup form; click the first cell; assert a dialog/modal appears containing plant names from the system library (no "Add custom plant" option visible)
  3. **Sign-up carry-over** — fill and submit setup form; assign one plant to a cell; click "Sign up to save"; assert redirect to `/signup`; complete registration with a unique email; assert redirect lands on `/beds/:id` and the cell shows the plant's emoji; teardown: `DELETE /api/auth/me` with the new user's token in `afterEach`
  4. **Landing page CTA** — navigate to `/`; assert a link/button with text matching "Try free planner" (case-insensitive) is visible without scrolling; click it; assert URL is `/planner`
  (depends on T005, T007)

**Checkpoint**: US4 complete — guest planner regression is automated and independently testable.

---

## Phase 7: User Story 5 — Navigation and Layout (Priority: P2)

**Goal**: Automated tests confirming the sidebar nav links are present, sidebar collapse works, and the mobile overlay opens.

**Independent Test**: `npx playwright test tests/e2e/navigation.spec.js` passes all 3 cases.

- [X] T012 [P] [US5] Create `tests/e2e/navigation.spec.js` with 3 test cases using default storageState (logged-in as fixture owner):
  1. **Sidebar links** — navigate to `/dashboard`; assert sidebar contains links for: "Dashboard", "Garden Map", "Harvests", "Analytics", "Profile", "Admin"
  2. **Collapse sidebar** — navigate to `/dashboard` on a desktop viewport (1280×800); click the "Collapse" button; assert the sidebar label "Dashboard" is not visible and the sidebar width is reduced (collapsed icon-only state)
  3. **Mobile overlay** — set viewport to `{ width: 375, height: 812 }`; navigate to `/dashboard`; assert sidebar is not visible by default; click the hamburger menu button; assert the sidebar overlay becomes visible
  (depends on T005)

**Checkpoint**: US5 complete — navigation regression is automated and independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and developer ergonomics.

- [X] T013 [P] Add `"test:e2e": "playwright test"` and `"test:e2e:headed": "playwright test --headed"` scripts to root `package.json` — confirm `npm run test:e2e` runs the full suite
- [X] T014 Run `npx playwright test` with the local dev stack running and confirm all spec files execute; fix any selector or timing issues; run `npx playwright show-report` to confirm the HTML report generates correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002, T003, T004 can run in parallel after T001
- **Foundational (Phase 2)**: Depends on T002 complete — T005, T006, T007 run in parallel; BLOCKS all spec files
- **US1 (Phase 3)**: Depends on Phase 2 complete
- **US2 (Phase 4)**: Depends on Phase 2 complete — independent of US1
- **US3 (Phase 5)**: Depends on Phase 2 complete — independent of US1/US2
- **US4 (Phase 6)**: Depends on Phase 2 complete — independent of US1/US2/US3
- **US5 (Phase 7)**: Depends on T005 only (needs storageState) — independent of all other stories
- **Polish (Phase 8)**: Depends on all spec files complete

### User Story Dependencies

- **US1–US5**: All unblocked after Phase 2 — each touches a different spec file; all can be written in parallel

### Within Each Phase

- **Phase 1**: T001 first; T002, T003, T004 in parallel after T001
- **Phase 2**: T005, T006, T007 in parallel (different files, both depend only on T002)
- **Phase 3–7**: Each is a single task (one spec file per story)
- **Phase 8**: T013 then T014 sequentially

---

## Parallel Execution Examples

### Phase 2 — Foundation

```text
After T001+T002:
  Task A: T005 — global-setup.js
  Task B: T006 — global-teardown.js
  Task C: T007 — fixtures/index.js
```

### Phase 3–7 — All Spec Files (after Phase 2)

```text
Parallel start (all different files):
  Task A: T008 — auth.spec.js         (US1)
  Task B: T009 — beds.spec.js         (US2)
  Task C: T010 — harvests.spec.js     (US3)
  Task D: T011 — guest-planner.spec.js (US4)
  Task E: T012 — navigation.spec.js   (US5)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T005–T007)
3. Complete Phase 3: US1 auth spec (T008)
4. **STOP and VALIDATE**: `npx playwright test tests/e2e/auth.spec.js` — all 5 auth cases pass
5. Ship MVP: auth regression is protected

### Incremental Delivery

1. Phases 1–2 → Framework ready
2. T008 (US1) → Auth protected → **Demo: auth regression suite**
3. T009 (US2) → Bed management protected → **Demo: beds + PDF download**
4. T010 (US3) → Harvest logging protected → **Demo: full P1 coverage**
5. T011 (US4) → Guest planner protected
6. T012 (US5) → Navigation protected → **Demo: full suite**
7. Phase 8 → Polish, final run

---

## Notes

- All spec files are independent (different files) — Phases 3–7 can run in parallel once Phase 2 is complete
- The `isolatedPage` fixture handles full user lifecycle (create + teardown) — no manual cleanup needed in spec files that use it
- Guest planner spec (T011) does its own teardown in `afterEach` for the sign-up carry-over test since it can't use `isolatedPage` (user doesn't exist before the test)
- `tests/e2e/.auth/user.json` is gitignored — if it's missing, `global-setup.js` creates it fresh
- PDF validation reads the first 4 bytes (`%PDF`) — lightweight and reliable without a full PDF parser
