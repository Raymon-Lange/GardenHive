# Feature Specification: Garden Map Switcher with Harvest Indicator

**Feature Branch**: `013-map-garden-switcher`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "When a user is on the Garden map, they should have a dropdown menu where they can select previous Gardens they've created. There should also be an indicator showing which one is active, indicating that this is the Garden in which we default recording Harvest too. When you select a garden, it loads the map for that Garden based on its own bed configuration and plants."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch Gardens on the Map Page (Priority: P1)

An owner with multiple garden plans visits the Garden Map page. They can see a dropdown selector showing all their gardens. Selecting a different garden immediately loads that garden's map — showing its own beds, positions, and plant assignments — without navigating away from the page.

**Why this priority**: The ability to view any of your gardens on the map is the core value of this feature. Without it, users must rely on the sidebar to switch, which may not be obvious while focused on the map view.

**Independent Test**: Create two gardens with different bed configurations. Open the Garden Map, use the in-page dropdown to switch between them, and confirm each garden's beds and plant assignments load correctly.

**Acceptance Scenarios**:

1. **Given** an owner has two or more gardens, **When** they open the Garden Map, **Then** a dropdown showing all their gardens is visible on the page, with the currently active garden selected.
2. **Given** a garden dropdown is visible, **When** the owner selects a different garden, **Then** the map reloads to show that garden's beds, positions, and plant assignments.
3. **Given** an owner with only one garden, **When** they open the Garden Map, **Then** a disabled dropdown showing the single garden name is displayed — communicating that multiple gardens are possible.

---

### User Story 2 - Active Harvest Garden Indicator (Priority: P2)

When viewing the Garden Map, the owner can clearly see which garden is currently set as the harvest default — meaning new harvest entries will be attributed to this garden. The indicator is visible alongside the garden selector so the owner always knows where their harvests will be recorded.

**Why this priority**: Prevents confusion when owners have multiple gardens and are recording harvests. Without a clear indicator, a user may record harvests against the wrong garden plan without realising it.

**Independent Test**: With two gardens, set one as active. Open the Garden Map and confirm the active/harvest-default garden is clearly labelled. Switch to the other garden and confirm the label follows the switch.

**Acceptance Scenarios**:

1. **Given** an owner is on the Garden Map, **When** they view the garden selector, **Then** the currently active (harvest-default) garden is visually distinguished from other gardens in the list.
2. **Given** an owner switches to a different garden via the map dropdown, **Then** that garden becomes the new active/harvest-default garden and the indicator updates immediately.
3. **Given** an owner records a new harvest entry after switching gardens, **Then** the bed picker on the Harvest page shows only beds from the newly selected garden, and the active garden name is displayed as a label on the Harvest form.

---

### Edge Cases

- What happens when the owner has only one garden? A disabled dropdown showing that garden's name is displayed — making it clear that adding more gardens is possible. The harvest-default indicator is still shown.
- What happens if a garden is deleted while the owner is viewing it on the map? The map falls back to the next available garden and updates the indicator accordingly.
- What if the page is refreshed after switching gardens? The last selected garden persists as the active garden on reload.
- What if a garden has no beds placed on the map? The grid renders empty with a prompt to add beds; no error is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Garden Map page MUST display the name of the currently active garden prominently.
- **FR-002**: The Garden Map MUST always show a garden selector dropdown — disabled with one option when the owner has only one garden (to communicate that multiple gardens are possible), interactive when more than one garden exists.
- **FR-003**: Selecting a garden from the map selector MUST immediately reload the map to show that garden's bed layout and plant assignments.
- **FR-004**: The active garden displayed on the map MUST be the same garden that harvest entries default to.
- **FR-005**: Switching gardens via the map selector MUST update the harvest default; the Harvest page bed picker MUST then show only beds from the newly selected garden, and the active garden name MUST be displayed as a label on the Harvest form.
- **FR-006**: The currently active garden MUST be clearly visually distinguished in the selector (e.g., labelled as active or shown as selected).
- **FR-007**: The garden selection made on the map MUST persist across page reloads — the same garden remains active on return visits.
- **FR-008**: The in-page garden selector on the Garden Map is for authenticated owners only. Helpers have no in-page selector; they continue to use the sidebar garden switcher.

### Key Entities

- **Garden**: A named garden plan belonging to an owner. Has its own bed layout, dimensions, and plant assignments. One garden per owner is designated as the active harvest default at any time.
- **Active Garden**: The garden currently selected on the map. Determines which garden map is displayed and which garden new harvest entries are attributed to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner with multiple gardens can switch between garden maps in under 5 seconds from clicking the selector to seeing the new map loaded.
- **SC-002**: 100% of harvest entries recorded after a garden switch are attributed to the correct (newly selected) garden, with no ambiguity.
- **SC-003**: The active garden indicator is visible without scrolling on standard desktop and mobile screen sizes.
- **SC-004**: Owners can identify which garden is their harvest default without reading any help documentation — the indicator is self-explanatory on first use.
- **SC-005**: Garden selection persists across browser sessions — returning to the map shows the last selected garden.

## Assumptions

- An owner can have multiple garden plans (delivered in feature 012-multiple-gardens).
- The "active garden" concept (one garden designated as the default) already exists; this feature makes it visible and actionable directly on the Garden Map page.
- Switching the active garden on the map also switches the harvest default — these are the same concept, not two separate settings.
- The in-page garden selector is owner-only. Helpers have no in-page selector on the map page and continue to use the sidebar to switch between an owner's gardens.
- The garden selector is always rendered as a dropdown — disabled (single option) when the owner has one garden, to communicate that multiple plans are possible.
- The Harvests page bed picker is scoped to the active garden; a garden label is also shown on the Harvest form. This is the mechanism by which "harvest entries are attributed to the active garden."
- No confirmation dialog is required when switching gardens — switching is immediate and reversible.
