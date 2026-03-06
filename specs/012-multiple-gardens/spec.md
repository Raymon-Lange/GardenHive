# Feature Specification: Multiple Garden Plans

**Feature Branch**: `012-multiple-gardens`
**Created**: 2026-03-05
**Status**: Draft
**Input**: User description: "Lets add the ability to create multiple gardens, say for every year or season this way can plan different planting layouts. so add the ability to create new garden, the option should be create from existing, create from new, or upload from a csv"

## Clarifications

### Session 2026-03-05

- Q: Can a helper switch between an owner's multiple garden plans independently, or are they locked to the owner's currently active garden? → A: Helpers can browse all of the owner's gardens independently.
- Q: Should each garden plan have its own uploadable image, or does one account-level image continue to represent all gardens? → A: One account-level image covers all gardens (unchanged).
- Q: When copying a garden, should map dimensions be inherited from the source or start unset? → A: Inherit dimensions from source; user must explicitly enter a new name (no auto-generated name).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Switch Between Garden Plans (Priority: P1)

A garden owner has multiple garden plans (e.g., "Backyard 2025" and "Spring 2026"). They can select which garden is "active" so that all planning views — beds, map, and dimensions — show only that garden's data. Switching is immediate. Helpers with access can also browse between the owner's garden plans independently.

**Why this priority**: Without the ability to switch context, all other stories are inaccessible. This is the foundational behaviour that makes multiple gardens usable.

**Independent Test**: Create two gardens (via any method), switch between them as both owner and helper, and verify that the beds page and map page reflect the correct garden each time.

**Acceptance Scenarios**:

1. **Given** an owner has two garden plans, **When** they select the second garden, **Then** all planning views immediately reflect the second garden's beds and layout.
2. **Given** an owner switches to a different garden, **When** they navigate to the beds page, **Then** only the beds belonging to the selected garden are shown.
3. **Given** a helper has access to an owner's gardens, **When** the helper selects one of the owner's garden plans, **Then** the helper's planning views reflect that garden's beds and layout.
4. **Given** a helper is viewing one of the owner's gardens, **When** the owner switches their own active garden, **Then** the helper's currently selected garden is unaffected.

---

### User Story 2 — Create a Blank New Garden (Priority: P2)

A garden owner wants to start planning a fresh layout for a new season. They create a blank named garden (e.g., "Summer 2026") with no beds yet, then begin adding beds to it independently of their previous gardens.

**Why this priority**: The simplest creation path; needed as a baseline before copy or import make sense.

**Independent Test**: Create a blank garden, verify it appears in the garden list, becomes the active garden, and shows an empty beds list.

**Acceptance Scenarios**:

1. **Given** an owner opens the "New Garden" flow and selects "New", **When** they provide a name and confirm, **Then** a new empty garden is created and becomes the active garden.
2. **Given** a new blank garden is created, **When** the owner views the beds page, **Then** zero beds are shown.
3. **Given** a new garden is created, **When** the owner navigates to the map, **Then** no beds are placed and map dimensions are unset (to be configured).

---

### User Story 3 — Copy an Existing Garden (Priority: P3)

An owner wants to reuse last year's bed layout for a new season. They copy an existing garden — all beds and their plant assignments are duplicated into a new named garden, giving them a starting point to modify.

**Why this priority**: Core time-saving use case for seasonal planning; avoids recreating bed structures from scratch each year.

**Independent Test**: Copy a garden with three beds and plant assignments, verify the new garden has matching beds with the same plants, and confirm changes to the new garden do not affect the original.

**Acceptance Scenarios**:

1. **Given** an owner selects "Copy from existing" and picks a source garden, **When** they type a new name and confirm, **Then** a new garden is created with the same beds, plant assignments, and garden dimensions as the source.
2. **Given** the copy flow is open, **When** the name field is displayed, **Then** it is empty and requires the owner to type a name before confirming (no pre-populated or auto-generated name).
3. **Given** a garden is copied, **When** the owner views the new garden's map, **Then** no beds are placed (map positions are reset; the owner must re-layout from scratch) but the garden dimensions match the source.
4. **Given** the owner modifies a bed in the new garden, **Then** the original source garden is unaffected.
5. **Given** an owner has only one garden, **When** they open the "Copy" option, **Then** the source garden (their only one) is pre-selected.

---

### User Story 4 — Import Garden from CSV (Priority: P4)

An owner maintains bed information in a spreadsheet. They upload a CSV file defining their bed names and dimensions to create a new garden with those beds pre-populated.

**Why this priority**: Valuable for users with existing records but lower priority than the core create/copy flows.

**Independent Test**: Upload a valid CSV with three bed rows, verify the new garden is created with those beds and correct dimensions, and verify error feedback appears for any invalid rows.

**Acceptance Scenarios**:

1. **Given** an owner uploads a CSV with columns "Bed Name", "Rows", "Cols", **When** all rows are valid, **Then** a new garden is created with a bed for each CSV row.
2. **Given** a CSV has one invalid row (e.g., missing bed name), **When** the file is processed, **Then** valid rows create beds and the invalid row is reported with a clear error message.
3. **Given** an owner provides no garden name alongside the file, **When** they attempt to confirm, **Then** an error is shown requiring a garden name.
4. **Given** a non-CSV file is uploaded, **Then** the system rejects it with an informative error.

---

### User Story 5 — Delete a Garden (Priority: P5)

An owner has an old garden plan they no longer need. They delete it, removing the garden and all its beds permanently.

**Why this priority**: Housekeeping capability; lowest priority since not needed to use the feature.

**Independent Test**: Delete a garden with two beds, verify the garden and beds are no longer listed, and verify the remaining gardens are unaffected.

**Acceptance Scenarios**:

1. **Given** an owner has two or more gardens, **When** they delete one, **Then** the garden and all its beds are permanently removed.
2. **Given** an owner has exactly one garden, **When** they attempt to delete it, **Then** the deletion is blocked with a message explaining at least one garden must exist.
3. **Given** an owner deletes their active garden, **When** the deletion succeeds, **Then** another of their gardens becomes the active garden automatically.

---

### Edge Cases

- What happens when a user who was created before this feature was released logs in? Their existing beds and settings are automatically consolidated into a default garden.
- What happens if a CSV file is empty (no data rows)? The system rejects it with a "no beds found" error.
- What happens if the owner deletes the last garden? The system prevents deletion and explains the constraint.
- What happens if two gardens have the same name? The system allows it (names are labels, not unique identifiers).
- What happens when a helper is viewing one of the owner's gardens while the owner deletes that garden? The helper's view should gracefully redirect to another of the owner's available gardens.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Owners MUST be able to create a new named garden plan from scratch with no pre-existing beds.
- **FR-002**: Owners MUST be able to create a new garden by copying all beds and plant assignments from an existing garden they own.
- **FR-003**: Owners MUST be able to create a new garden by uploading a CSV file containing bed names and dimensions.
- **FR-004**: The CSV import format MUST use columns "Bed Name", "Rows", "Cols"; rows missing required fields MUST produce per-row error feedback.
- **FR-005**: When copying a garden, bed map positions MUST be reset to "unplaced" in the new garden; bed names, sizes, plant assignments, and garden dimensions MUST be preserved from the source. The user MUST explicitly enter a new name for the copy; no name is pre-populated or auto-generated.
- **FR-006**: Owners MUST be able to switch their active garden; all planning views (beds list, map) MUST immediately reflect the selected garden's data.
- **FR-007**: Owners MUST be able to rename a garden after creation.
- **FR-008**: Owners MUST be able to delete a garden; deletion MUST cascade to remove all beds belonging to that garden.
- **FR-009**: The system MUST prevent deletion of a user's last remaining garden.
- **FR-010**: When a garden is deleted and it was the active garden, the system MUST automatically activate another of the owner's gardens.
- **FR-011**: Harvest records MUST NOT be scoped to a garden plan; they remain shared across all of the owner's gardens.
- **FR-012**: Helpers with access to an owner's gardens MUST be able to browse and switch between all of that owner's garden plans independently of the owner's own active garden selection.
- **FR-013**: Existing users' beds and garden settings MUST be automatically migrated into a default garden when the feature is deployed.
- **FR-014**: Garden plan images are NOT supported; a single account-level photo continues to represent the owner across all their garden plans.

### Key Entities

- **Garden Plan**: A named planning context (e.g., "Spring 2026") belonging to an owner. Contains a set of beds, a map layout, and garden dimensions. An owner can have many garden plans.
- **Active Garden**: The garden currently selected by a user (owner or helper) for viewing. Each user independently tracks which garden they are viewing; a helper's selection is separate from the owner's.
- **Bed (within a garden)**: A planting area that belongs to a specific garden plan, with its own size, plant assignments, and optional map position.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can create a new garden plan (via any method) and have it ready for bed editing in under 2 minutes.
- **SC-002**: Switching between garden plans takes effect without a page reload; the new garden's beds appear within the same interaction — for both owners and helpers.
- **SC-003**: All beds, plant assignments, bed dimensions, and garden dimensions from a copied garden are accurately duplicated in the new garden, with zero data loss; map positions are reset to unplaced.
- **SC-004**: A valid CSV file with up to 50 bed rows produces a garden with all beds correctly created; invalid rows surface individual error messages rather than a blanket failure.
- **SC-005**: Deleting a garden with beds leaves no orphaned bed records; remaining gardens and their data are unaffected.
- **SC-006**: 100% of users' existing beds and garden data are accessible via the new multi-garden interface after the feature is deployed (no data loss from migration).

## Assumptions

- Each user will be migrated automatically: their existing beds become a garden named after their current garden name (or "My Garden" if none is set). No manual migration step is required of the user.
- Plant cell assignments in the CSV import format are out of scope for this version; users add plants to imported beds manually.
- The number of gardens per user is not capped in this version.
- Garden plans are private; the sharing model (helpers) applies at the owner level — a helper who has access sees all of that owner's gardens.
- Map positions (where beds are placed on the visual map) are not included in CSV imports; users place beds manually after import.
- The account-level photo (garden image) is unchanged by this feature; it is not duplicated or reassigned per garden plan.
