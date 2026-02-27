# Feature Specification: Standard Garden Plan for Free Users

**Feature Branch**: `011-standard-guest-plan`
**Created**: 2026-02-27
**Status**: Draft
**Input**: User description: "remove the free garden plan page and replace it with standard garden plan. This allows the free user to have a better experience by defining more than one bed and whole garden."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Plan a Full Multi-Bed Garden Without an Account (Priority: P1)

A visitor arrives at the free planner and wants to design their whole garden — not just a single bed. They set their garden dimensions, add multiple raised beds, assign plants to cells in each bed, and download a PDF of the complete garden map. They can return later and continue where they left off because the plan is saved locally in the browser. When they are ready to persist their garden long-term, they sign up and all their beds carry over to their new account automatically.

**Why this priority**: This is the core of the feature. The current planner limits users to one bed per session, which makes it unsuitable for planning a real garden. Removing that constraint is the primary user value delivered.

**Independent Test**: Navigate to the free planner without logging in. Set garden dimensions. Create three beds with different sizes, plant at least one plant in each, and download the PDF. Verify all three beds appear on the PDF map. Close the browser tab, reopen the planner, and confirm the plan is still there.

**Acceptance Scenarios**:

1. **Given** a visitor has not logged in, **When** they open the free planner, **Then** they can set garden dimensions (width and height in feet) and add as many beds as they want — with no enforced bed count limit.
2. **Given** a visitor has defined garden dimensions and added a bed, **When** they refresh the page or return to the planner in the same browser, **Then** their beds and plant assignments are still present.
3. **Given** a visitor has two or more beds with plants assigned, **When** they download the PDF, **Then** the PDF shows all beds spatially laid out on the garden map — matching the full-garden view that authenticated users see.
4. **Given** a visitor clicks "Sign up to save", **When** they complete registration, **Then** all their guest beds and plant assignments are transferred to the new account and they land on their garden map.
5. **Given** a visitor has a saved guest plan, **When** they log in to an existing account instead of signing up, **Then** the existing account's garden is not overwritten and the guest plan is discarded gracefully.

---

### User Story 2 — Remove the Old Single-Bed Planner Page (Priority: P1)

The old `/planner` page (single-bed, session-only) is removed entirely and its URL is replaced by the new standard planner. Any existing links or CTAs that pointed to "Try free planner" continue to work and now reach the improved experience.

**Why this priority**: Without removing the old page, two parallel planner experiences would exist, creating confusion. This story is a prerequisite of US1 delivering a coherent product.

**Independent Test**: Navigate to `/planner`. Confirm it loads the new multi-bed standard planner, not the old single-bed setup form. Confirm the Landing page CTA links to the same URL and reaches the new experience.

**Acceptance Scenarios**:

1. **Given** the old single-bed planner existed at `/planner`, **When** a user navigates to `/planner`, **Then** they see the new full-garden planner — the old single-bed setup form no longer appears.
2. **Given** the Landing page has a CTA linking to the free planner, **When** a visitor clicks it, **Then** they reach the new standard planner experience.

---

### Edge Cases

- A visitor with no saved guest plan should see a garden setup prompt (set dimensions, add first bed) — not an empty or broken state.
- A visitor whose browser has disabled local storage should see a clear message that their plan cannot be saved between sessions, but can still use the planner in the current session.
- If a visitor signs up with carry-over, all beds (not just one) must transfer including all cell plant assignments.
- If the visitor has not changed the default 10 × 10 ft dimensions before signing up, those dimensions carry over to the new account as-is.
- Beds in the guest plan that have no position on the garden map should carry over with positions assigned automatically or left unplaced — they must not be silently dropped.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The free planner MUST default the garden dimensions to 10 × 10 ft when a new guest plan is created. Users MAY change the dimensions at any time.
- **FR-002**: The free planner MUST allow unauthenticated users to add, name, resize, and remove an unlimited number of beds within the defined garden.
- **FR-003**: Each bed MUST support plant assignment per cell using the same system plant library available to authenticated users.
- **FR-004**: The free planner MUST persist the entire guest garden plan (dimensions, all beds, all cell assignments) in the browser so the plan survives page refresh and browser restart.
- **FR-005**: The free planner MUST provide a "Download PDF" action that generates a full garden map PDF containing all guest beds — matching the layout authenticated users see.
- **FR-006**: The free planner MUST provide a "Sign up to save" pathway that, on successful registration, transfers all guest beds and plant assignments to the new account and redirects to the garden map.
- **FR-007**: The old single-bed guest planner page MUST be removed and replaced by the new standard planner at the same `/planner` URL.
- **FR-008**: All existing entry points to `/planner` (Landing page CTA, direct URL) MUST continue to work and reach the new experience.
- **FR-009**: An unauthenticated user who logs in to an existing account MUST NOT have their existing garden overwritten by the guest plan.

### Key Entities

- **Guest Garden**: The unauthenticated user's locally-stored plan. Contains garden dimensions and an ordered list of guest beds. Persists in the browser between sessions. Discarded after successful sign-up carry-over.
- **Guest Bed**: One bed within a guest garden. Has a name, row/column dimensions, map position (x/y coordinates), and a list of cell plant assignments. Mirrors the structure of an authenticated user's garden bed.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A free user can create and download a PDF garden map containing three or more distinct beds in a single session without logging in.
- **SC-002**: A guest plan containing at least two beds survives a full browser close-and-reopen cycle — the plan is present on return.
- **SC-003**: 100% of guest beds and their plant assignments are transferred to the new account on sign-up carry-over with zero beds dropped.
- **SC-004**: The `/planner` URL no longer renders the old single-bed planner in any browser after this feature ships.
- **SC-005**: No login prompt or paywall is introduced — the full multi-bed planning experience is available at `/planner` without an account.

---

## Assumptions

- "Free user" means an unauthenticated visitor — there is no subscription tier in the product. Free = no account required.
- Browser local storage is used for guest plan persistence; a graceful degradation message suffices when it is unavailable.
- The spatial layout and PDF rendering reuse the same pipeline as the authenticated garden map — no new PDF design is needed.
- The system plant library (`ownerId: null`) is the only plant source available in the free planner; custom user plants require an account.
- Sign-up carry-over is one-time on registration only — logging in to an existing account with a guest plan does not merge the plans.
- Garden dimensions default to 10 × 10 ft on first load; users may adjust before or after adding beds.
- Garden dimensions set in the guest plan carry over to the new account on registration.
- The `/planner` route remains public (no authentication required) after this change.
