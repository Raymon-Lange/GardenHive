# Feature Specification: GardenHive — Existing Application Baseline

**Feature Branch**: `001-existing-features`
**Created**: 2026-02-23
**Status**: Draft
**Input**: Derived from codebase analysis (mid-development MERN application baseline)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Account Registration & Authentication (Priority: P1)

A new visitor arrives at the landing page and creates an account. They choose
whether they are a **Garden Owner** (someone who manages their own garden) or a
**Helper** (someone who has been invited to assist with another person's garden).
After registering, they receive an authentication token and are taken directly
into the application. On subsequent visits they log in with their email and
password. If their session expires or they log out, they are redirected to the
login page and cannot access protected areas of the app.

**Why this priority**: Authentication is the gateway to every other feature.
Nothing else in the application is usable without it.

**Independent Test**: A new user can register, be redirected to the dashboard,
then log out and log back in — all without touching any other feature.

**Acceptance Scenarios**:

1. **Given** a visitor on the registration page, **When** they submit a valid name, email, password, and role, **Then** they are logged in and redirected to the dashboard.
2. **Given** an email address already in use, **When** a visitor tries to register with it, **Then** they see a clear error and no account is created.
3. **Given** a registered user on the login page, **When** they submit correct credentials, **Then** they receive a session token and are taken to the dashboard.
4. **Given** an active session, **When** the user clicks "Log out", **Then** their session is cleared and they are redirected to the login page.
5. **Given** an expired or invalid session token, **When** the user attempts to navigate to any protected page, **Then** they are automatically redirected to the login page.
6. **Given** a helper account that has been deactivated, **When** they attempt to log in, **Then** they see an "account inactive" error and cannot access the application.

---

### User Story 2 — Garden Bed Planning & Management (Priority: P2)

A garden owner creates named rectangular garden beds, specifying the number of
rows and columns (up to 50×50). Each bed is displayed as an interactive grid
where individual cells can be assigned a plant from the plant library. Owners
can rename beds, clear cell assignments, and delete beds they no longer need.
An optional **Garden Map** view shows all beds positioned on a larger spatial
grid, giving a bird's-eye view of the whole garden layout.

**Why this priority**: Garden bed management is the central planning feature —
the primary reason users come to the app.

**Independent Test**: A user can create a bed, fill several cells with plants,
rename the bed, then delete it — without logging any harvests or inviting anyone.

**Acceptance Scenarios**:

1. **Given** an authenticated owner, **When** they create a bed with a name and dimensions, **Then** the empty grid appears and the bed is listed on the Beds page.
2. **Given** an existing bed, **When** the owner clicks a cell and selects a plant, **Then** the cell displays the plant's name and emoji; the assignment persists on page reload.
3. **Given** a cell with a plant assigned, **When** the owner clears the cell, **Then** the cell returns to empty.
4. **Given** an existing bed, **When** the owner renames it, **Then** the new name is shown everywhere the bed appears.
5. **Given** an existing bed with cells filled, **When** the owner deletes the bed, **Then** the bed and all its cell data are permanently removed.
6. **Given** a helper with "full" permission, **When** they view an owner's bed, **Then** they can assign and clear cells but cannot create or delete beds.
7. **Given** a helper with "analytics" or "harvests_analytics" permission, **When** they attempt to access bed management, **Then** they are denied and see an appropriate message.

---

### User Story 3 — Plant Library Browsing & Custom Plants (Priority: P3)

Users browse a shared system plant library containing vegetables, fruits, herbs,
and flowers — each with its name, category, emoji, spacing information, days to
harvest, and a planting density figure (plants per square foot). Garden owners
can additionally create their own **custom plants** that are private to their
garden. They can edit and delete custom plants they own. Any user can hide
system or custom plants they never use, removing them from their plant picker
without deleting them permanently.

**Why this priority**: The plant library is a prerequisite for filling bed cells
and logging harvests. Without it, neither of the core workflows function.

**Independent Test**: A user can search and filter the plant library, create a
custom plant, edit it, hide a system plant, and verify the hidden plant no longer
appears in their plant picker.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they open the plant library, **Then** they see all system plants plus any custom plants belonging to the active garden owner.
2. **Given** a plant library with many entries, **When** the user searches by name or filters by category, **Then** only matching plants are shown.
3. **Given** an authenticated owner, **When** they create a custom plant with name, category, and density, **Then** it appears in their plant picker alongside system plants.
4. **Given** an existing custom plant owned by the user, **When** they edit its details, **Then** the updated information is reflected everywhere the plant is displayed.
5. **Given** a custom plant that is currently assigned to one or more bed cells, **When** the owner attempts to delete it, **Then** they are prevented and shown an explanation.
6. **Given** a custom plant not assigned to any cells, **When** the owner deletes it, **Then** it is permanently removed.
7. **Given** any plant in the library, **When** the user hides it, **Then** it no longer appears in their plant picker but can be restored from a "show hidden" toggle.
8. **Given** a helper viewing an owner's garden, **When** they browse plants, **Then** they see the owner's custom plants but cannot create, edit, or delete them.

---

### User Story 4 — Harvest Logging & History (Priority: P4)

After picking from the garden, a user logs a harvest by selecting a plant,
entering a quantity, choosing a unit (lbs, oz, kg, g, or count), and optionally
specifying the bed it came from, the exact harvest date, and any notes. The
application automatically assigns the entry to the correct growing season (Spring,
Summer, Fall, or Winter) based on the date. Users can browse their full harvest
history, filtered by season or plant, and delete individual entries if logged in
error.

**Why this priority**: Harvest logging is the primary data-entry action that
feeds all analytics. Without harvest data, the analytics and reporting stories
deliver no value.

**Independent Test**: A user can log three harvests for different plants and
dates, see them listed in the history, filter by plant, and delete one — without
needing any analytics charts to work.

**Acceptance Scenarios**:

1. **Given** an authenticated user with access to a garden, **When** they submit a harvest entry with plant, quantity, and unit, **Then** a new harvest record is created and visible in the history.
2. **Given** a harvest logged on a date in March, **When** the entry is saved, **Then** it is automatically categorised as "Spring [year]".
3. **Given** a harvest history with many entries, **When** the user filters by season or plant, **Then** only matching entries are shown.
4. **Given** an erroneously logged harvest, **When** the user deletes it, **Then** it is permanently removed and no longer appears in the history or analytics.
5. **Given** a helper with "harvests_analytics" permission, **When** they log or delete a harvest, **Then** the action succeeds and is attributed to the garden owner.
6. **Given** a helper with "analytics" permission only, **When** they attempt to log a harvest, **Then** they are denied.

---

### User Story 5 — Analytics & Harvest Reporting (Priority: P5)

Garden owners and permitted helpers view rich analytics about their harvest
history. The **Dashboard** shows a rolling six-month harvest summary with a
monthly line chart and a plant-breakdown pie chart. The **Analytics** page
provides deeper views: total harvest weight grouped by plant and season, a
year-over-year monthly comparison chart, a week-by-week breakdown for a selected
year and optional plant filter, and a rolling 12-month totals view. A date-range
filter lets users narrow the totals view to a specific period.

**Why this priority**: Analytics is a key motivation for consistent harvest
logging — it transforms raw data into gardening insight.

**Independent Test**: With at least one harvest logged, a user can open the
Analytics page and see at minimum one chart populated with real data; the
Dashboard summary also reflects the logged harvest.

**Acceptance Scenarios**:

1. **Given** a user with harvest data, **When** they open the Dashboard, **Then** they see a rolling 6-month chart and a plant breakdown pie chart reflecting their actual harvests.
2. **Given** a user with multi-year harvest data, **When** they view the year-over-year chart, **Then** each year appears as a separate line on the monthly chart.
3. **Given** a user with harvest data, **When** they apply a date-range filter on the totals view, **Then** only harvests within that range are counted.
4. **Given** a helper with "analytics" or higher permission, **When** they view the owner's analytics, **Then** they see the owner's data correctly.
5. **Given** a user with no harvest data, **When** they view analytics, **Then** empty states are shown rather than errors.

---

### User Story 6 — Garden Sharing & Collaborative Access (Priority: P6)

A garden owner invites another person to help with their garden by entering that
person's email address and selecting a permission level: **Analytics** (read-only
reporting), **Harvests & Analytics** (log and view harvests), or **Full**
(manage bed layouts plus harvests and analytics). The invitation can be sent
before the helper has even registered — it becomes active automatically when
they sign up with the matching email. The owner can update a helper's permission
level or revoke access at any time. Helpers who have received access see a garden
switcher in the navigation that lets them toggle between their own garden and any
shared gardens they have been granted.

**Why this priority**: Collaboration is a significant value differentiator — it
enables shared household or community garden management.

**Independent Test**: An owner can invite a new email, the invited user can
register and immediately see the shared garden, and the owner can then revoke
access — all independently of any harvest or bed operations.

**Acceptance Scenarios**:

1. **Given** a garden owner, **When** they invite an email with a chosen permission level, **Then** a pending invitation is recorded.
2. **Given** a pending invitation matching an email, **When** a new user registers with that email, **Then** their access is automatically activated and they can immediately view the shared garden.
3. **Given** an active helper, **When** the owner changes their permission level, **Then** the helper's access is updated immediately on their next action.
4. **Given** an active helper, **When** the owner revokes their access, **Then** the helper can no longer view or interact with the owner's garden.
5. **Given** a helper with access to multiple gardens, **When** they use the garden switcher, **Then** all requests are scoped to the selected garden.
6. **Given** a helper with no accepted invitations yet, **When** they log in, **Then** they see a "waiting for invite" screen rather than an empty or broken view.

---

### User Story 7 — Profile & Account Settings (Priority: P7)

A logged-in user can update their display name, change their password, and
personalise their garden by setting a garden name and uploading a cover image.
They can also permanently delete their account. Owner deletion removes all their
garden data (beds, harvests, access grants). Helper deletion deactivates their
account and removes their access grants but does not affect the owner's data.

**Why this priority**: Account management is expected baseline functionality;
its absence would feel like an incomplete product.

**Independent Test**: A user can update their name, set a garden name, upload
a garden image, change their password, then verify the new password works on
login — without touching any other feature.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they update their display name, **Then** the new name appears throughout the application immediately.
2. **Given** a user who knows their current password, **When** they submit a valid new password, **Then** they can log in with the new password from that point on.
3. **Given** a user, **When** they enter a garden name and save, **Then** the name appears in the sidebar and garden switcher.
4. **Given** a user, **When** they upload a garden image, **Then** the image appears as a cover photo on their garden profile; they can remove it later.
5. **Given** a garden owner who deletes their account, **When** deletion is confirmed, **Then** all their beds, harvests, and access grants are permanently removed.
6. **Given** a helper who deletes their account, **When** deletion is confirmed, **Then** their account is deactivated and access grants are removed, but the owner's data is unaffected.

---

### Edge Cases

- A helper attempts to act on a garden they no longer have access to mid-session — they receive a permission error and are guided back to their own garden.
- An owner invites the same email twice — the second invitation is rejected with a clear duplicate error.
- A user attempts to register with a password shorter than six characters — registration is rejected with a validation message.
- A bed cell holds a reference to a custom plant that was later deleted — no crash occurs; the cell degrades gracefully.
- Analytics are requested for a season or year with no harvest data — empty state is shown, not an error or blank screen.
- A harvest is logged with a future date — the system accepts it and derives the season from the entered date.
- A user uploads a non-image file as their garden cover — the upload is rejected.
- A helper with "full" permission attempts to create a new bed — this succeeds (full access includes bed management).

---

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Accounts**

- **FR-001**: The system MUST allow visitors to create an account with a name, email address, password, and role (Owner or Helper).
- **FR-002**: The system MUST reject registration when the email is already in use.
- **FR-003**: The system MUST reject registration when the password is fewer than six characters.
- **FR-004**: The system MUST authenticate users with email and password and issue a session token valid for seven days.
- **FR-005**: The system MUST prevent access to all protected areas when no valid session token is present, redirecting users to the login page.
- **FR-006**: The system MUST automatically end a session and redirect to login when a token is invalid or expired.
- **FR-007**: Users MUST be able to update their display name at any time.
- **FR-008**: Users MUST be able to change their password by providing their current password and a valid new password.
- **FR-009**: Users MUST be able to permanently delete their account.
- **FR-010**: Deleting an Owner account MUST cascade-remove all associated beds, harvests, and access grants.
- **FR-011**: Deleting a Helper account MUST deactivate the account and remove their access grants without altering any owner data.

**Garden Identity**

- **FR-012**: Users MUST be able to set a garden name that appears throughout the navigation and garden switcher.
- **FR-013**: Users MUST be able to upload a garden cover image.
- **FR-014**: Users MUST be able to remove their garden cover image.

**Garden Beds**

- **FR-015**: Garden owners MUST be able to create named rectangular beds with configurable dimensions (rows and columns, each 1–50).
- **FR-016**: The system MUST display each bed as an interactive grid where each cell can hold one plant assignment.
- **FR-017**: Users with sufficient permission MUST be able to assign a plant to any cell or clear an existing assignment.
- **FR-018**: Garden owners MUST be able to rename any of their beds.
- **FR-019**: Garden owners MUST be able to delete a bed and all its cell assignments permanently.
- **FR-020**: The system MUST provide a Garden Map view showing all beds arranged on a larger spatial canvas.

**Plant Library**

- **FR-021**: The system MUST provide a shared system plant library with species entries containing name, category, emoji, planting density (plants per square foot), days to harvest, germination time, spacing, planting depth, and description.
- **FR-022**: Users MUST be able to search the plant library by name and filter by category (vegetable, fruit, herb, flower).
- **FR-023**: Garden owners MUST be able to create custom plants private to their garden.
- **FR-024**: Owners MUST be able to edit and delete their own custom plants.
- **FR-025**: The system MUST prevent deletion of a custom plant currently assigned to any bed cell, displaying an explanatory message.
- **FR-026**: Users MUST be able to hide individual plants from their plant picker without permanently deleting them.
- **FR-027**: Users MUST be able to reveal previously hidden plants through a toggle.

**Harvest Logging**

- **FR-028**: Users with harvest permission MUST be able to log a harvest by selecting a plant, entering a quantity, and choosing a unit (lbs, oz, kg, g, or count). Bed reference, harvest date, and notes are optional.
- **FR-029**: The system MUST automatically derive and store the growing season (Spring: Mar–May, Summer: Jun–Aug, Fall: Sep–Oct, Winter: Nov–Feb) from the harvest date.
- **FR-030**: Users MUST be able to view their full harvest history.
- **FR-031**: Users MUST be able to filter harvest history by season and by plant.
- **FR-032**: Users MUST be able to delete an individual harvest entry permanently.

**Analytics**

- **FR-033**: The Dashboard MUST display a rolling six-month harvest summary including a monthly trend line chart and a plant-breakdown pie chart.
- **FR-034**: The Analytics page MUST display total harvest quantities grouped by plant and season, with a date-range filter.
- **FR-035**: The Analytics page MUST display a year-over-year monthly comparison chart showing each year as a distinct data series.
- **FR-036**: The Analytics page MUST display a week-by-week harvest breakdown for a selected year, with an optional plant filter.
- **FR-037**: The Analytics page MUST display a rolling 12-month totals view.

**Garden Sharing**

- **FR-038**: Garden owners MUST be able to invite a person by email address with one of three permission levels: Analytics, Harvests & Analytics, or Full.
- **FR-039**: The system MUST accept invitations for email addresses not yet registered, and activate them automatically when the invited email is used to sign up.
- **FR-040**: Owners MUST be able to update a helper's permission level at any time.
- **FR-041**: Owners MUST be able to revoke a helper's access at any time.
- **FR-042**: The system MUST reject a duplicate invitation to the same email for the same garden.
- **FR-043**: Helpers MUST see a garden switcher that allows switching between their own garden and any gardens they have been granted access to.
- **FR-044**: Helpers with no active access grants MUST see an informative "waiting for invite" screen.
- **FR-045**: All data operations performed by a helper MUST be scoped to the active garden owner's records, not the helper's own.

### Key Entities

- **User**: A registered account with a role (Owner or Helper), display name, email, active/inactive status, hidden-plant preferences, optional garden name, and optional garden cover image. Owners possess a garden; Helpers are guests in others'.

- **GardenBed**: A named, rectangular planting area belonging to one Owner. Defined by row and column dimensions (1–50 each) and an optional position on a garden map canvas. Contains an ordered set of Cells.

- **Cell**: One square-foot slot within a GardenBed, identified by its row and column position. Optionally holds a reference to one Plant. Does not exist independently of its bed.

- **Plant**: A species or variety that can be grown. Carries name, category (vegetable / fruit / herb / flower), emoji, planting density, days to harvest, germination time, spacing, depth, and optional description. System Plants are shared globally; Custom Plants belong to one Owner and are visible only within that owner's garden.

- **Harvest**: A recorded picking event. Captures the plant harvested, quantity, unit (lbs / oz / kg / g / count), optional bed reference, harvest date (defaults to today), auto-derived growing season, optional notes, and the identity of the user who entered it.

- **GardenAccess**: A permission grant from one Owner to one Helper (or prospective helper email). Records the permission level (Analytics / Harvests & Analytics / Full) and activation status (Pending / Active). A Pending grant activates when the invited email registers.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete registration and reach the Dashboard in under two minutes from a cold start.
- **SC-002**: A returning user can log in and reach the Dashboard in under thirty seconds.
- **SC-003**: A garden owner can create a bed, assign plants to ten cells, and have all assignments saved in under three minutes.
- **SC-004**: A user can complete a harvest log entry in under thirty seconds once on the Harvests page.
- **SC-005**: Analytics charts load and display data within two seconds on a standard home internet connection.
- **SC-006**: An owner can invite a helper and the helper gains access within one minute of completing registration with the invited email.
- **SC-007**: 100% of protected routes return an appropriate error response (not a crash or blank page) when accessed without valid credentials.
- **SC-008**: Deleting an Owner account leaves zero orphaned records (beds, harvests, access grants) in the system.
- **SC-009**: A helper switching between shared gardens sees data scoped exclusively to the selected garden with no cross-garden data leakage.
- **SC-010**: Harvest analytics reflect newly logged entries within one page refresh of the data being entered.
