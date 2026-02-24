# Feature Specification: UI Regression Test Suite

**Feature Branch**: `005-ui-regression-tests`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Define P1 test cases and build a UI testing framework to validate functionality. Each page should have a few cases that we need to perform a regression test on."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authentication Flows (Priority: P1)

A developer or QA engineer runs the regression suite and gets immediate pass/fail feedback on all authentication-related journeys: public access, login, signup, logout, and protected route redirection. These are the most critical flows — if auth breaks, no other part of the app is reachable.

**Why this priority**: Auth gates every authenticated page. A broken login or signup blocks all other user workflows immediately.

**Independent Test**: Run the auth suite alone and confirm all scenarios below pass without touching any other suite.

**Acceptance Scenarios**:

1. **Given** a visitor with a valid account, **When** they navigate to `/login` and enter correct credentials, **Then** they are redirected to `/dashboard` and see their garden name in the sidebar.
2. **Given** a logged-in user, **When** they click "Sign out", **Then** they are redirected to `/` and cannot access `/dashboard` without logging in again.
3. **Given** an unauthenticated visitor, **When** they navigate directly to `/dashboard`, **Then** they are redirected to `/login`.
4. **Given** a visitor on `/signup`, **When** they complete registration with a unique email, **Then** they are redirected to `/dashboard` and the app shell renders without errors.
5. **Given** a visitor on `/login`, **When** they submit an incorrect password, **Then** an error message is displayed and they remain on `/login`.

---

### User Story 2 - Garden Bed Management (Priority: P1)

A developer runs the garden bed suite and confirms the core planning workflow is intact: creating a bed, assigning plants to cells, and viewing the bed detail page all function correctly.

**Why this priority**: Garden bed management is the app's primary value proposition — if bed creation or plant assignment is broken, the product is unusable for its core purpose.

**Independent Test**: Run the beds suite against a freshly created owner account and confirm all scenarios pass independently.

**Acceptance Scenarios**:

1. **Given** a new owner who has not yet configured their garden, **When** they navigate to Garden Map and submit valid width and height dimensions, **Then** the garden grid is displayed at the specified size.
2. **Given** an owner on the Garden Map page, **When** they create a new bed with a name and valid dimensions, **Then** the bed appears in the beds list.
3. **Given** an owner on a bed detail page, **When** they click an empty cell and select a plant from the picker, **Then** the cell displays the selected plant's emoji.
4. **Given** an owner on a bed detail page with an assigned plant, **When** they click the assigned cell and select "Remove plant", **Then** the cell returns to its empty state.
5. **Given** an owner, **When** they navigate to `/beds`, **Then** all created beds are listed with their names and dimensions.
6. **Given** an owner on the Garden Map page with at least one planted bed, **When** they click "Download PDF", **Then** a PDF file is downloaded to the user's device.

---

### User Story 3 - Harvest Logging (Priority: P1)

A developer runs the harvest suite and confirms that logging a harvest entry and viewing the harvest list work correctly end to end.

**Why this priority**: Harvest logging is the second core workflow. If recording or retrieving harvest data is broken, the app fails its primary tracking purpose.

**Independent Test**: Run the harvest suite against a seeded account with at least one bed and plant, confirm all scenarios pass.

**Acceptance Scenarios**:

1. **Given** an owner on the Harvests page, **When** they log a harvest with a plant, quantity, and date, **Then** the new entry appears in the harvest list immediately.
2. **Given** an owner with existing harvest records, **When** they view the Harvests page, **Then** entries are displayed with the correct plant name, quantity, and date.
3. **Given** an owner with harvest data, **When** they navigate to `/analytics`, **Then** the page loads without error and displays season totals.

---

### User Story 4 - Guest Planner (Priority: P2)

A developer runs the guest planner suite to confirm the public no-account flow is intact: the page is accessible without login, system plants load, cells can be assigned, and the sign-up carry-over saves the bed correctly.

**Why this priority**: The guest planner is the primary conversion funnel entry point. Regressions here directly affect new user acquisition.

**Independent Test**: Run the guest planner suite in a fully unauthenticated browser context and confirm all scenarios pass.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they navigate to `/planner`, **Then** the setup form is shown with no login redirect.
2. **Given** a guest who has submitted the setup form, **When** they click a cell, **Then** the plant picker opens showing system plants only.
3. **Given** a guest with at least one plant placed, **When** they click "Sign up to save" and complete registration, **Then** they land on the saved bed detail page with the correct plants assigned.
4. **Given** a visitor on the landing page `/`, **When** they view the hero section, **Then** a "Try free planner" button is visible and navigates to `/planner`.

---

### User Story 5 - Navigation and Layout (Priority: P2)

A developer runs the navigation suite and confirms the app shell renders correctly, all sidebar nav links route to the correct pages, and the sidebar collapse works.

**Why this priority**: Broken navigation strands users with no way to move between pages, making every other feature inaccessible.

**Independent Test**: Run the navigation suite against an owner account and confirm all scenarios pass.

**Acceptance Scenarios**:

1. **Given** an authenticated owner on any app page, **When** they look at the sidebar, **Then** Dashboard, Garden Map, Harvests, Analytics, Profile, and Admin links are present.
2. **Given** an authenticated user on a desktop viewport, **When** they click the "Collapse" button, **Then** the sidebar collapses to icon-only view and labels are hidden.
3. **Given** an authenticated user on a mobile viewport (< 768 px), **When** they tap the menu icon in the top bar, **Then** the sidebar opens as an overlay.

---

### Edge Cases

- What happens when the test database has no seed data — tests must create their own required data rather than relying on pre-existing records.
- How does the suite handle dirty state from a previous test run (e.g. a bed left over from a failed test) — each test must use isolated accounts or clean up after itself.
- What happens when the local app server is not running — the suite must fail immediately with a clear error message rather than hanging indefinitely.
- What happens when a test account email already exists in the database — test account creation must use unique emails (e.g. timestamp-based) to avoid conflicts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test suite MUST be runnable with a single command from the project root.
- **FR-002**: Each test case MUST be independently executable — running one test must not depend on state created by another.
- **FR-003**: The suite MUST reset browser authentication state before each test that requires a specific logged-in or logged-out condition.
- **FR-004**: The suite MUST create any required test data (user accounts, beds, harvests) as part of each test's own setup.
- **FR-005**: Each test MUST produce a clearly named pass or fail result that maps directly to an acceptance scenario.
- **FR-006**: The suite MUST include at least 3 test cases for each P1 user story (auth, beds, harvests).
- **FR-007**: The suite MUST run against the local development environment on the standard dev port.
- **FR-008**: Test results MUST be printed to the terminal with a total pass/fail count on completion.
- **FR-009**: A single failing test MUST NOT abort the remaining tests — all tests must run to completion.
- **FR-010**: The suite MUST cover both authenticated and unauthenticated browser states.

### Key Entities

- **Test Suite**: A collection of test cases grouped by user story, each independently runnable.
- **Test Case**: A single acceptance scenario with setup, interaction, and assertion steps.
- **Test Account**: A dedicated user account created by the suite at test runtime for isolation.
- **Test Data**: Minimum beds, plants, and harvests created by each test case for its own assertions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can execute the full suite with one command and receive a final pass/fail result within 3 minutes.
- **SC-002**: All P1 acceptance scenarios — 12 scenarios across auth, beds, and harvests — have automated test coverage.
- **SC-003**: Any single test can be run in isolation and produces the same result as when run as part of the full suite.
- **SC-004**: A regression introduced to any P1 flow is detected by the suite within the same run that introduced the change.
- **SC-005**: The suite produces zero false positives against a correctly functioning app across 10 consecutive runs.

## Assumptions

- The app runs locally on `http://localhost:5173` (frontend) and `http://localhost:5000` (backend) during test execution.
- The backend has a live database connection and the system plant library is seeded before tests run.
- Tests run in a headless or headed Chromium-based browser environment.
- CI/CD integration is out of scope for this feature — local execution only is required for the initial suite.
- The backend API is reachable from the test runner for direct setup operations (e.g. creating test accounts).

## Out of Scope

- Visual regression testing (pixel-level screenshot comparison).
- Performance or load testing.
- Cross-browser compatibility testing beyond one Chromium target.
- Email delivery testing (password reset flows, invitation emails).
- Admin helper-invitation management page test coverage — deferred to a later increment.
- Mobile-specific gesture interactions beyond basic viewport checks.
