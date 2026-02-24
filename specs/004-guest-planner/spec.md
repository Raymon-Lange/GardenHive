# Feature Specification: Guest Garden Planner

**Feature Branch**: `004-guest-planner`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Lets create a free feature, where you can create a garden bed and add plants without you creating an account, but you can not save, add your own plants. You can download the PDF. Let add the button to dashboard."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Design a Garden Bed as a Guest (Priority: P1)

A visitor who has not created an account arrives at the free planner. They enter bed dimensions (rows and columns), then browse the standard plant library and assign plants to individual cells on the grid. The layout exists only for the duration of their session — nothing is saved to any account.

**Why this priority**: This is the core value proposition of the free tier. Without it, there is nothing else to offer. It demonstrates the product's core capability with no sign-up friction, driving conversion to registered accounts.

**Independent Test**: Open the free planner without logging in, create a bed with width and height, place plants in cells from the plant library, confirm the layout is visible and correct.

**Acceptance Scenarios**:

1. **Given** a visitor is on the free planner page without an account, **When** they enter valid bed dimensions and submit, **Then** a grid matching those dimensions appears and is ready for planting.
2. **Given** a guest has an active grid, **When** they browse the plant library and select a plant for a cell, **Then** the cell updates to show that plant.
3. **Given** a guest has planted cells, **When** they look for an option to add a custom plant, **Then** no such option is available.
4. **Given** a guest closes or refreshes the page, **When** they return to the free planner, **Then** their previous layout is gone — no data is persisted.

---

### User Story 2 — Download the Layout as a PDF (Priority: P2)

A guest who has designed their bed layout can download it as a PDF. The PDF includes the grid layout with plant assignments and a shopping list of plants needed, matching the format already available to registered users.

**Why this priority**: The PDF download is the primary incentive for a guest to engage deeply with the planner. It provides tangible take-away value without requiring an account, and serves as a natural conversion touchpoint.

**Independent Test**: With at least one plant placed in the grid, click the download button, confirm a PDF is generated containing the bed layout and a plant shopping list.

**Acceptance Scenarios**:

1. **Given** a guest has a bed layout with at least one plant placed, **When** they click "Download PDF", **Then** a PDF file is downloaded containing the bed grid and a shopping list of plants used.
2. **Given** a guest has an empty grid with no plants placed, **When** they attempt to download, **Then** the button is disabled or a message explains that at least one plant must be placed first.
3. **Given** the PDF is generated, **When** opened, **Then** it matches the same visual format as the PDF available to registered users.

---

### User Story 3 — Access the Free Planner from the Landing Page (Priority: P3)

A clearly labelled button on the public landing page (`/`) directs visitors to the free planner, driving discoverability and conversion before sign-up.

**Why this priority**: Discoverability drives usage. Without a clear entry point, the free planner will not be found. This is prioritised after core functionality because the planner must exist before the button has value.

**Independent Test**: Locate the button on the target page, click it, confirm it navigates to the free planner without prompting for login.

**Acceptance Scenarios**:

1. **Given** a user is on the target page, **When** they view the page, **Then** a clearly labelled "Try Free Planner" (or equivalent) button is visible without scrolling on both desktop and mobile.
2. **Given** a visitor clicks the button, **When** the planner page loads, **Then** they are not prompted to log in and can begin designing immediately.

---

### Edge Cases

- What happens when the guest enters invalid bed dimensions (zero, negative, or non-numeric values)? — The form rejects the input with a clear validation message; no grid is rendered.
- What happens if the plant library is empty or unavailable? — The guest sees a message that no plants are currently available; the grid itself remains usable.
- What happens if the guest tries to navigate to an authenticated-only page? — Standard authentication protection applies; only the free planner route is public.
- What happens when the guest tries to resize the bed after placing plants? — Cells that fall outside the new dimensions are removed; the guest is warned before the change is applied.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The free planner MUST be accessible without an account or login.
- **FR-002**: Guests MUST be able to specify the number of rows and columns for a single garden bed.
- **FR-003**: Guests MUST be able to assign a plant from the standard plant library to any cell in the grid.
- **FR-004**: Guests MUST be able to remove or change a plant assignment in any cell.
- **FR-005**: The system MUST NOT allow guests to save their layout to any persistent storage or account.
- **FR-006**: The system MUST NOT allow guests to create or add custom plants.
- **FR-007**: Guests MUST be able to download their current layout as a PDF, including a shopping list of plants used.
- **FR-008**: A "Try Free Planner" button MUST be present and visible on the public landing page without scrolling on both desktop and mobile viewports.
- **FR-009**: The plant library shown to guests MUST be the same standard library available to registered users (read-only access).
- **FR-010**: The system MUST display a clear notice indicating that the layout is not saved and will be lost on exit.

### Key Entities

- **Guest Session**: A temporary, in-memory planning workspace tied to the visitor's browser session. Holds bed dimensions and cell-plant assignments. Not persisted anywhere.
- **Guest Bed**: A single grid defined by rows and columns. Exists only within the guest session. Has no owner and no server-side record.
- **Cell Assignment**: A pairing of a grid cell position with a plant from the standard library. Exists only in the guest session.
- **Plant Library**: The read-only set of standard plants. Accessible without authentication. Guests may browse and select but cannot modify it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can create a bed, place plants, and download a PDF in under 3 minutes without any instructions.
- **SC-002**: 100% of free planner interactions require zero account creation steps — no email, password, or sign-up form is ever shown.
- **SC-003**: The PDF produced by a guest matches the same layout and shopping list format as the PDF for registered users, with no missing sections.
- **SC-004**: The "Try Free Planner" entry point is visible without scrolling on the target page on both desktop and mobile viewports.
- **SC-005**: Guest session data is fully cleared on page refresh or close — no layout data is retrievable after the session ends.

## Assumptions

- A single bed per guest session is sufficient for the free tier; multiple simultaneous beds are not required.
- The plant library can be served to unauthenticated requests without exposing any user data.
- The PDF generation reuses the same mechanism already implemented for registered users (feature 003-garden-pdf), adapted for in-session guest data.
- Bed dimension constraints (minimum, maximum) follow the same rules as for registered users.
- No conversion nudge ("Sign up to save this layout") is in scope for this feature, but the design should not prevent one from being added later.

## Out of Scope

- Saving or persisting guest layouts (including local storage or cookies).
- Allowing guests to add custom plants.
- Multi-bed planning in a single guest session.
- Sharing a guest layout via a link.
- Any account creation or upsell flow within this feature.
