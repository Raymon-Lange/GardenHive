# Feature Specification: Super Admin Stats Dashboard

**Feature Branch**: `007-super-admin-stats`
**Created**: 2026-02-25
**Status**: Draft
**Input**: User description: "Super admin dashboard (hardcoded to raymon.lange@gmail.com) that collects and displays platform stats: number of users who created accounts, gardens created, and harvest details logged. Includes a user report showing last login per user."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Platform Overview Stats (Priority: P1)

As the super admin (raymon.lange@gmail.com), I want to see a summary of platform-wide activity — total registered users, total gardens created, and total harvest entries logged — so I can understand how the platform is being used at a glance.

**Why this priority**: This is the core value of the admin dashboard. Without aggregate stats, nothing else in the feature is meaningful.

**Independent Test**: Can be fully tested by logging in as the super admin account and navigating to the admin dashboard page, which should display three summary counts.

**Acceptance Scenarios**:

1. **Given** I am logged in as raymon.lange@gmail.com, **When** I navigate to the admin dashboard, **Then** I see the total number of registered users, total gardens created, and total harvest entries logged across the entire platform.
2. **Given** a new user registers on the platform, **When** I view the admin dashboard, **Then** the user count has incremented to reflect the new registration.
3. **Given** I am logged in as any non-admin user, **When** I attempt to access the admin dashboard URL, **Then** I am denied access with an appropriate error message.
4. **Given** I am not logged in, **When** I attempt to access the admin dashboard URL, **Then** I am redirected to the login page.

---

### User Story 2 - View User Report with Last Login (Priority: P2)

As the super admin, I want to see a table of all registered users showing their name, email address, account creation date, and the date/time of their most recent login, so I can identify inactive users and monitor platform engagement.

**Why this priority**: The user report is the primary operational tool. It provides actionable data that the overview stats alone cannot deliver.

**Independent Test**: Can be fully tested by viewing the admin dashboard user table and verifying it lists all users with last login timestamps.

**Acceptance Scenarios**:

1. **Given** I am on the admin dashboard, **When** I view the user report, **Then** I see a table listing every registered user with columns: name, email, account created date, and last login date/time.
2. **Given** a user has never logged in after initial registration, **When** I view that user in the report, **Then** their last login column shows "Never" or the registration date.
3. **Given** a user logs in, **When** I refresh the admin dashboard, **Then** that user's last login timestamp is updated to reflect the recent login.
4. **Given** there are many users, **When** I view the user table, **Then** the table is sorted by most recently created account by default.

---

### User Story 3 - View Per-User Garden and Harvest Counts (Priority: P3)

As the super admin, I want to see how many gardens and harvest entries each user has created alongside their profile in the user report, so I can identify power users and those who have not yet engaged with the platform's core features.

**Why this priority**: Enriches the user report with engagement depth. Useful for understanding user behaviour but not required for the basic admin view.

**Independent Test**: Can be fully tested by checking that each row in the user report includes garden count and harvest count columns that accurately reflect that user's data.

**Acceptance Scenarios**:

1. **Given** I am on the admin dashboard user report, **When** I view any user row, **Then** I see the count of gardens and the count of harvest entries owned by that user.
2. **Given** a user has zero gardens, **When** I view that user in the report, **Then** their garden count displays as 0, not blank or undefined.

---

### Edge Cases

- What happens when there are zero users (empty database)? The dashboard should display zeros for all stats and an empty user table with a "No users yet" message.
- What happens if a user's last login data is missing for older accounts created before this feature was added? Show "Unknown" for last login, rather than leaving it blank.
- What happens if the admin account (raymon.lange@gmail.com) does not exist yet in the database? The admin route should still be accessible after that account is created; the hardcoded check must be case-insensitive.
- What happens if someone creates an account with the email raymon.lange@gmail.com and then it is deleted? The admin check must still work correctly when the account exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict the admin dashboard to the single hardcoded email address `raymon.lange@gmail.com` (case-insensitive); all other authenticated users MUST receive a 403 response.
- **FR-002**: System MUST expose a protected API endpoint that returns platform-wide aggregate counts: total registered users, total gardens created, and total harvest entries logged.
- **FR-003**: System MUST expose a protected API endpoint that returns a list of all users with their name, email, account creation date, last login date, garden count, and harvest count.
- **FR-004**: System MUST record the timestamp of each successful user login so that "last login" data can be reported accurately.
- **FR-005**: The frontend MUST display a dedicated admin dashboard page, accessible only when the logged-in user is the super admin.
- **FR-006**: The admin dashboard MUST display platform stats (total users, total gardens, total harvests) as summary cards at the top of the page.
- **FR-007**: The admin dashboard MUST display a user report table with columns: Name, Email, Registered, Last Login, Gardens, Harvests.
- **FR-008**: The admin navigation link MUST only be visible in the UI when the logged-in user is the super admin.
- **FR-009**: System MUST return a 401 response to any unauthenticated request to admin endpoints.

### Key Entities

- **User**: A registered platform account. Key attributes for admin reporting: name, email, account creation date, last login timestamp, and counts of owned gardens and harvests.
- **Garden**: A user-owned garden. Counted per user and in aggregate for platform stats.
- **Harvest**: A harvest entry logged against a bed. Counted per user and in aggregate for platform stats.
- **AdminStats**: A derived read-only view aggregating platform-wide counts across users, gardens, and harvests. Not a stored entity — computed on demand.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The super admin can access the dashboard and see all platform stats within 2 seconds of page load.
- **SC-002**: The user report accurately reflects all registered users — zero omissions and zero phantom entries.
- **SC-003**: Last login timestamps are accurate to within 1 minute of the actual login event for all users.
- **SC-004**: Any non-admin user attempting to access the admin dashboard is blocked 100% of the time — no privilege escalation is possible.
- **SC-005**: All aggregate counts (users, gardens, harvests) match the actual database totals with zero discrepancy.

## Assumptions

- "Last login" tracking begins from the point this feature is deployed; users with no login after deployment will show "Never" or their registration date as a fallback.
- The admin dashboard does not need pagination for the MVP — the platform user base is small enough to show all users in a single table.
- No admin actions (deleting users, banning accounts, etc.) are in scope for this feature. The dashboard is read-only.
- The super admin email is hardcoded in the backend and is not configurable via environment variables or database settings for this feature.
- Garden count per user refers to gardens the user owns (not gardens they have helper access to).
- Harvest count per user refers to all harvest entries logged across all beds in the user's owned gardens.
