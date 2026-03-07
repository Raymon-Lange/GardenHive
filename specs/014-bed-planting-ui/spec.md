# Feature Specification: Improved Bed Planting UI

**Feature Branch**: `014-bed-planting-ui`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "I like to improve the bed planting UI, I like to add a list of plants next to the bed. The list should have a search bar that allows you to filter out and type partial spelling to narrow. You should select the plant then click the cell to plant it. Have the ability to clear the bed as well."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Inline Plant Panel (Priority: P1)

An owner opens a bed detail page and sees the planting grid and the plant list together on screen at the same time — no modal required. The plant list is displayed in a panel beside the grid on desktop and below it on mobile. The panel always shows the full list by default and narrows as the user types.

**Why this priority**: The core complaint with the current UI is that the modal interrupts the planting flow. The inline panel is the foundational change everything else builds on.

**Independent Test**: Open any bed detail page. Verify the plant list is visible without clicking anything.

**Acceptance Scenarios**:

1. **Given** an owner on the bed detail page, **When** the page loads, **Then** a plant list panel is visible alongside the grid without any interaction required.
2. **Given** the plant panel, **When** the user types partial text (e.g. "tom"), **Then** only plants whose names contain that substring (case-insensitive) are shown.
3. **Given** the search input, **When** it is empty, **Then** all non-hidden plants for the garden are shown.
4. **Given** a plant list with many entries, **When** the user scrolls the plant panel, **Then** the bed grid does not scroll with it — the panel scrolls independently.

---

### User Story 2 — Stamp Mode: Select Plant Then Click Cells (Priority: P2)

An owner selects a plant from the inline panel by clicking it. The selected plant is visually highlighted. They then click one or more cells in the bed grid to stamp that plant into those cells — no modal appears. Clicking a cell that already holds the selected plant clears it (toggle). Selecting a different plant from the panel replaces the active selection. Clicking the same plant again in the panel deselects it.

**Why this priority**: The stamp mode fundamentally changes how efficient repeated planting is — a user can fill an entire row with the same plant in seconds.

**Independent Test**: Select a plant, click five cells, verify all five show the plant. Click one of those five cells again, verify it clears. Select a different plant, click a planted cell, verify it replaces.

**Acceptance Scenarios**:

1. **Given** no plant selected, **When** the user clicks a cell, **Then** nothing happens (no modal, no change).
2. **Given** a plant is selected in the panel, **When** the user clicks an empty cell, **Then** that plant is immediately stamped into the cell without any modal.
3. **Given** a plant is selected and a cell already holds that same plant, **When** the user clicks that cell, **Then** the cell is cleared (toggle behaviour).
4. **Given** a plant is selected and a cell holds a *different* plant, **When** the user clicks that cell, **Then** the cell is replaced with the selected plant.
5. **Given** a plant is selected in the panel, **When** the user clicks the same plant again, **Then** the selection is cleared and the panel returns to no-selection state.
6. **Given** a plant is selected, **When** the selection is active, **Then** the panel entry for that plant is visually highlighted (distinct background or border) so the user knows what they are stamping.

---

### User Story 3 — Clear Bed (Priority: P3)

An owner wants to start fresh on a bed. They click "Clear bed" and all plant assignments in that bed are removed in a single action.

**Why this priority**: Seasonal replanning requires clearing old layouts. Without this, users must click every cell individually to remove plants.

**Independent Test**: Assign plants to three cells, click "Clear bed", verify all cells are empty.

**Acceptance Scenarios**:

1. **Given** a bed with plants assigned to several cells, **When** the owner clicks "Clear bed", **Then** all cells are emptied in a single operation.
2. **Given** a bed with no plants assigned, **When** the owner clicks "Clear bed", **Then** nothing changes and no error is shown.
3. **Given** a "Clear bed" action is triggered, **Then** a confirmation is NOT required — the action is immediate and reversible by replanting.

---

### Edge Cases

- What if a plant is hidden by the user's hidden-plant preferences? It does not appear in the inline panel, consistent with the existing plant picker behaviour.
- What if the search matches zero plants? An empty state ("No plants found") is shown in the panel.
- What if the bed is very large (e.g. 50×50)? The grid scrolls independently within its container; the plant panel remains anchored.
- What if the user switches gardens mid-session? The plant list refreshes to show the new garden's plants; the selected plant is cleared.
- What if a network error occurs during a cell update? The cell reverts to its previous state and an inline error is shown.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plant list MUST be displayed inline on the bed detail page, visible without any user interaction.
- **FR-002**: The plant list MUST include a search input that filters by partial name match (case-insensitive) as the user types.
- **FR-003**: The user MUST be able to select a plant from the inline panel; the selected plant MUST be visually highlighted.
- **FR-004**: Clicking a cell while a plant is selected MUST immediately assign that plant to the cell (no modal).
- **FR-005**: Clicking a cell that already holds the selected plant MUST clear that cell (toggle).
- **FR-006**: Clicking a cell that holds a different plant MUST replace it with the selected plant.
- **FR-007**: Clicking the currently selected plant in the panel a second time MUST deselect it.
- **FR-008**: With no plant selected, clicking a cell MUST have no effect.
- **FR-009**: A "Clear bed" control MUST be present that removes all plant assignments from all cells in a single operation.
- **FR-010**: The plant panel MUST scroll independently of the bed grid.
- **FR-011**: On mobile viewports, the plant panel MUST render below the grid (not beside it).
- **FR-012**: Hidden plants MUST NOT appear in the inline panel.
- **FR-013**: The existing modal-based `PlantPicker` component is removed; the inline panel fully replaces it.

### Key Entities

- **BedDetail page**: The primary view for editing a single bed's cell assignments. Refactored to a two-column layout (grid + plant panel) on desktop.
- **Plant panel**: Inline, always-visible component showing the plant list with search. Replaces the `PlantPicker` modal.
- **Selected plant**: Local UI state (no server persistence). Determines what is stamped when the user clicks a cell.
- **Clear bed**: A bulk operation that sets `plantId: null` on all cells in a bed via a dedicated backend endpoint.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can plant the same species in 10 cells with 10 clicks — no modal, no confirmation step between clicks.
- **SC-002**: A user can find and select any plant by typing 3 or fewer characters of its name.
- **SC-003**: "Clear bed" empties all cells in a single click with no confirmation dialog.
- **SC-004**: The plant panel is visible without scrolling on a standard 1280px-wide desktop display.
- **SC-005**: All existing Playwright E2E tests continue to pass after the UI change.
