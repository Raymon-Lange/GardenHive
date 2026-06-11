# Feature Specification: Page Analytics Tracking

**Feature Branch**: `015-page-analytics`  
**Created**: 2026-06-11  
**Status**: Draft  
**Input**: User description: "Add tracking and stats to page using a self-hosted Umami analytics script"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Site Owner Views Page Traffic (Priority: P1)

As the site owner, I want to see which pages users visit most and how they navigate through GardenHive, so I can understand usage patterns and improve the product.

**Why this priority**: Core value of the feature — without page view tracking, no analytics data is collected at all.

**Independent Test**: Open GardenHive in a browser, navigate between pages (e.g., Dashboard → Map → Harvests), then open the Umami dashboard and confirm page view events appear for each visited route.

**Acceptance Scenarios**:

1. **Given** a user visits GardenHive, **When** they load any page, **Then** a page view event is recorded in the analytics dashboard with the page path and visit timestamp.
2. **Given** a user navigates from one page to another within the app (client-side routing), **When** the route changes, **Then** the analytics script records the new page view without requiring a full browser reload.
3. **Given** the analytics service is unreachable, **When** a user loads the page, **Then** the app continues to work normally with no visible error to the user.

---

### User Story 2 - Analytics Collected Without Impacting Privacy (Priority: P2)

As a user of GardenHive, I want my browsing to be tracked only in aggregate and without persistent identifiers (cookies), so my privacy is respected.

**Why this priority**: The chosen analytics tool (Umami) is privacy-friendly by design — confirming this behaviour is important for user trust.

**Independent Test**: Load GardenHive and inspect browser cookies/storage; confirm no tracking cookies are set by the analytics script.

**Acceptance Scenarios**:

1. **Given** a user visits the site, **When** the analytics script runs, **Then** no tracking cookies are written to the browser.
2. **Given** the analytics data, **When** viewed in the dashboard, **Then** no personally identifiable information (name, email, user ID) is visible in page view records.

---

### Edge Cases

- What happens when the analytics host is down or slow? App must load without waiting on it (`defer` attribute on script ensures this).
- What happens if a user has JavaScript disabled? App functions normally; no analytics data is collected for that session (acceptable).
- What happens with authenticated vs. guest routes? Both should be tracked equally with only the path recorded, never the user identity.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST load the analytics tracking script on every page, including public routes (`/planner`, `/login`, `/register`) and authenticated routes.
- **FR-002**: The analytics script MUST be loaded in a non-blocking manner so that it does not delay the app's initial render or interactivity.
- **FR-003**: The analytics script MUST automatically record a page view event each time the user navigates to a new route within the single-page app.
- **FR-004**: The analytics script MUST NOT write any persistent tracking cookies to the user's browser.
- **FR-005**: If the analytics host is unreachable, the app MUST continue to function normally with no user-visible errors or degraded performance.
- **FR-006**: The analytics website ID used MUST be `ef71b5f0-456e-4d2a-9050-28985fb5e8cc`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After deployment, the Umami dashboard shows page view events within 60 seconds of a user visiting GardenHive.
- **SC-002**: Navigating between all major app sections (Dashboard, Map, Harvests, Admin) produces distinct page view entries in the analytics dashboard, confirming client-side route changes are captured.
- **SC-003**: App load time is not measurably affected — the analytics script does not block the main page render.
- **SC-004**: No analytics-related errors appear in the browser console during normal use.
- **SC-005**: Zero tracking cookies are present in the browser after visiting the site.

## Assumptions

- The analytics service at the configured host is self-hosted Umami, which is cookie-free and GDPR-friendly by design.
- The analytics host URL is `https://analytics.fire-hive.com` — a publicly accessible domain, so no network-access restrictions apply.
- No custom event tracking (button clicks, form submissions) is in scope for this feature — page views only.
- No user-facing UI changes are required; this is a behind-the-scenes instrumentation change.
