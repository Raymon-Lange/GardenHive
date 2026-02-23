# Feature Specification: Garden Map with Drag-and-Snap Bed Placement

**Feature Branch**: `002-garden-map-snap`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "A user opens the Garden Map view which shows a large grid where each cell represents one square foot. If the user has not yet defined their garden dimensions, they are prompted to enter the total garden width and height in feet (including beds and walkways). Once the garden size is set, the grid fills the view at that size. The user can create a new garden bed by specifying its width and height in feet. The new bed appears on the map and the user can drag it around — when they release it, the bed snaps to the nearest grid square. Beds cannot overlap each other. The bed position is saved so the map looks the same on the next visit. Existing beds already placed on the map can also be picked up and moved the same way."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set Up Garden Dimensions (Priority: P1)

A first-time user opens the Garden Map view and is immediately prompted to enter the overall size of their garden in feet — width and height. This includes all beds, paths, and walkways. Once they confirm the dimensions, the map grid renders at that exact size, with each cell representing one square foot.

**Why this priority**: Without garden dimensions, the map cannot be shown. This is the prerequisite for all other map functionality and the first thing every new user encounters.

**Independent Test**: Can be fully tested by visiting the Garden Map view as a new user with no saved dimensions, submitting width and height values, and confirming the correctly-sized grid appears.

**Acceptance Scenarios**:

1. **Given** a user has no saved garden dimensions, **When** they open the Garden Map view, **Then** they are shown a prompt asking for garden width and height in feet before the map is displayed.
2. **Given** the prompt is shown, **When** the user enters valid width and height (e.g., 20 × 12) and confirms, **Then** a grid of 20 × 12 squares is displayed, each cell representing one square foot.
3. **Given** the prompt is shown, **When** the user submits without entering values, **Then** the form shows a validation error and does not proceed.
4. **Given** a user already has saved garden dimensions, **When** they open the Garden Map view, **Then** the grid is shown immediately without re-prompting.
5. **Given** the grid is displayed, **When** the user navigates away and returns, **Then** the grid retains the same dimensions.

---

### User Story 2 - Create and Place a New Garden Bed (Priority: P2)

An owner opens the Garden Map and creates a new garden bed by specifying its width and height in feet. The bed appears on the map and the owner can drag it to any open position. When the owner releases the bed, it snaps to the nearest grid square. Beds cannot be dropped in a position that overlaps an existing bed.

**Why this priority**: Placing beds visually on the map is the core workflow of the feature. This directly replaces manually entering coordinates, making the garden layout tangible and interactive.

**Independent Test**: Can be fully tested by creating a bed with specified dimensions and dragging it to different positions on the map, verifying snap behavior and overlap prevention on drop.

**Acceptance Scenarios**:

1. **Given** the garden map is displayed, **When** the owner creates a new bed by entering width and height, **Then** the new bed appears on the map at a default unplaced position (e.g., top-left corner or a designated staging area).
2. **Given** a new bed is on the map, **When** the owner drags it and releases it over an empty area, **Then** the bed snaps to the nearest grid cell boundary and stays there.
3. **Given** a bed being dragged, **When** the owner releases it over a position that would cause overlap with another bed, **Then** the bed returns to its previous position and an error or visual indicator is shown.
4. **Given** a bed has been placed, **When** the owner refreshes the page or returns later, **Then** the bed is shown at the same grid position.
5. **Given** a bed is dragged near the edge of the garden, **When** released outside the garden boundary, **Then** the bed snaps to the nearest valid position within the garden bounds.

---

### User Story 3 - Move an Existing Placed Bed (Priority: P3)

An owner can pick up any bed already placed on the map and drag it to a new position. The same snap-and-no-overlap rules apply. The updated position is saved automatically.

**Why this priority**: Gardens evolve over time. Owners need to reorganize their layout without deleting and recreating beds.

**Independent Test**: Can be fully tested by opening a map with at least one placed bed, dragging it to a new empty position, and confirming the position persists after page reload.

**Acceptance Scenarios**:

1. **Given** a bed is placed on the map, **When** the owner drags it to a new empty position and releases, **Then** the bed snaps to the nearest grid square at the new location and the old position is cleared.
2. **Given** a bed is being moved, **When** the owner releases it in a position that overlaps another bed, **Then** the bed reverts to its original position.
3. **Given** a bed has been moved, **When** the owner reloads the page, **Then** the bed is shown at the updated position.

---

### Edge Cases

- What happens when a user tries to set garden dimensions smaller than the footprint of already-placed beds? The system must warn the user and refuse to apply the new dimensions, or offer to remove the out-of-bounds beds.
- What happens when a bed's width or height is larger than the garden itself? The bed creation must be rejected with a validation error.
- How does the system handle two users (owner + helper with full access) simultaneously editing the map? Last-write wins; no real-time collaboration is expected in this version.
- What happens if the user resizes their browser window or views the map on a small screen? The grid should scale to fit the viewport while maintaining square cells.
- What happens when the user creates a bed but does not place it (leaves it unpositioned)? Beds without a grid position are valid but shown in a staging area or listed separately; they are not displayed on the grid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a Garden Map view accessible from the main navigation.
- **FR-002**: System MUST prompt the user to enter garden width and height (in feet) on first visit if dimensions have not yet been saved.
- **FR-003**: System MUST validate that garden width and height are positive integers greater than zero.
- **FR-004**: System MUST persist garden dimensions per user so the map loads at the correct size on all subsequent visits.
- **FR-005**: System MUST render the garden grid with one cell per square foot, matching the saved dimensions.
- **FR-006**: Users MUST be able to create a new garden bed by specifying its width and height in feet.
- **FR-007**: System MUST validate that a new bed's width and height are positive integers and that the bed fits within the current garden dimensions.
- **FR-008**: System MUST display a newly created bed on the map immediately after creation.
- **FR-009**: Users MUST be able to drag a bed across the map grid.
- **FR-010**: System MUST snap a dragged bed to the nearest grid-aligned position when the user releases it.
- **FR-011**: System MUST prevent a bed from being placed in a position that would cause it to overlap any other placed bed.
- **FR-012**: System MUST prevent a bed from being placed outside the garden boundary.
- **FR-013**: System MUST revert a bed to its previous position if it is dropped in an invalid location (overlap or out-of-bounds).
- **FR-014**: System MUST persist each bed's grid position so the map renders identically on the next visit.
- **FR-015**: System MUST allow existing placed beds to be picked up and moved using the same drag-and-snap interaction.
- **FR-016**: System MUST allow the owner to update garden dimensions after initial setup.

### Key Entities *(include if feature involves data)*

- **Garden Dimensions**: The overall width and height of the user's garden in feet. Owned by a single user. Must be set before the map grid can be shown. Stored as integer values.
- **Garden Bed** (existing, extended): A named rectangular area with width and height in feet. Extended to include a grid position — the column and row of the bed's top-left corner on the garden map. A bed without a grid position is considered unplaced. A bed with a grid position occupies a rectangular footprint of (width × height) cells.

### Assumptions

- Only owners can create, place, and move beds. Helpers viewing the map see the layout read-only.
- Garden dimensions apply to the single garden owned by the user; multi-garden support is out of scope.
- Bed width and height are measured in whole feet (integers); fractional sizes are not supported.
- Grid position is stored as a zero-indexed column and row of the bed's top-left corner.
- There is no undo functionality in this version; moves are committed on drop.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can set their garden dimensions and see the correct grid rendered in under 60 seconds from first opening the Garden Map view.
- **SC-002**: Dragging and snapping a bed feels immediate — the snap animation completes within one visual frame after the user releases the drag.
- **SC-003**: 100% of attempted bed placements that would cause overlap are blocked; no overlap can be created through any drag-and-drop interaction.
- **SC-004**: Garden layout (dimensions and all bed positions) is identical between sessions — beds appear at the same positions after every page reload.
- **SC-005**: Users can create and place a new bed in under 2 minutes from clicking the create button to seeing it snapped into position on the map.
- **SC-006**: The map grid is usable on viewport widths as narrow as 375px without horizontal scrolling or loss of cell boundaries.
