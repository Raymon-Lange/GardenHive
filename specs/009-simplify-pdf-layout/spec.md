# Feature Specification: Simplify Garden PDF Layout

**Feature Branch**: `009-simplify-pdf-layout`
**Created**: 2026-02-27
**Status**: Draft
**Input**: User description: "Update the feature to remove the plant category in the PDF and let's not include bed number in the shopping list"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Remove Category Colours from the Garden Map (Priority: P1)

A gardener downloads their garden PDF and sees the map page. Rather than each plant cell having a coloured background tied to the plant's category (vegetable, herb, fruit, flower), all plant cells now share a single neutral white background. The plant's emoji and abbreviated name are still shown inside each cell. The map remains spatially accurate and readable — just without the category colour distinction.

**Why this priority**: Removing the colour coding simplifies the visual and is the primary change requested. It affects every bed card on every map page.

**Independent Test**: Download the PDF for a garden with plants from at least two different categories. Open page 1 and verify all plant cells have the same neutral background colour regardless of category. Confirm emoji and plant names are still visible.

**Acceptance Scenarios**:

1. **Given** a plant cell with category "vegetable", **When** the map renders, **Then** the cell background is neutral white, not the vegetable category colour.
2. **Given** a plant cell with category "herb", **When** the map renders, **Then** the cell background matches cells from all other categories.
3. **Given** a bed with plants from mixed categories, **When** the map renders, **Then** all cells in that bed share the same neutral background colour.
4. **Given** an empty cell (no plant assigned), **When** the map renders, **Then** the cell background is transparent/neutral as before.
5. **Given** compact mode is active for a bed, **When** the map renders, **Then** the compact card appearance is unaffected by this change.

---

### User Story 2 — Remove Bed Column from the Shopping Checklist (Priority: P2)

A gardener looks at the shopping checklist page of the PDF. The table no longer has a "Bed" column. Rows show only the plant name, quantity, and the three checkbox columns (Seed, Starts, Purchased). Because the bed grouping is removed, the same plant appearing in multiple beds is merged into a single row with a combined quantity. The checklist is simpler and easier to scan at a nursery.

**Why this priority**: The checklist simplification is secondary to the map change but equally straightforward. The checklist remains fully functional without the bed column.

**Independent Test**: Download the PDF for a garden with the same plant in two or more beds. Navigate to the shopping checklist page. Verify the table header does not include a "Bed" column, no bed names appear in any row, and the shared plant appears once with the combined quantity.

**Acceptance Scenarios**:

1. **Given** a shopping checklist with plants from multiple beds, **When** the checklist page renders, **Then** the table header shows only: Plant, Qty, ☐ Seed, ☐ Starts, ☐ Purchased.
2. **Given** the same plant variety appearing in two different beds, **When** the checklist renders, **Then** that plant appears as exactly one row with its quantities summed.
3. **Given** plants from multiple beds all being unique varieties, **When** the checklist renders, **Then** each variety appears once, sorted by plant name.
4. **Given** the totals summary below the table, **When** the checklist renders, **Then** the summary still shows correct total plant count and unique variety count.
5. **Given** a garden with no planted beds, **When** the checklist renders, **Then** the "No plants to list" message is still shown.

---

### Edge Cases

- A plant appearing in multiple beds must produce exactly one row with the summed quantity — not multiple rows without bed labels.
- The variety count in the totals summary must count unique plant names (not unique bed+plant combinations) to stay consistent with the row-per-plant approach.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The garden map MUST render all plant cells with a neutral white (`#FFFFFF`) background, regardless of the plant's category.
- **FR-002**: Plant emoji and abbreviated name MUST remain visible inside each cell after the background colour change.
- **FR-003**: The shopping checklist table MUST NOT include a "Bed" column in the header or any bed name in row data.
- **FR-004**: Shopping checklist rows MUST be grouped by plant name only; if the same plant appears in multiple beds, their cell counts MUST be summed into a single row.
- **FR-005**: Checklist rows MUST be sorted by plant name (ascending).
- **FR-006**: The checklist totals summary (variety count and total plant count) MUST remain correct after the bed-column removal and quantity merging.
- **FR-007**: All other PDF content — header bar, spatial map layout, bed borders, pagination, compact mode, checklist footer — MUST remain unchanged.

### Key Entities

- **Plant cell**: A single square on the garden map. Background changes from category colour to neutral white.
- **Shopping row**: One row in the checklist table. Changes from one row per (bed, plant) pair to one row per unique plant across all beds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of plant cells on the map page display the same neutral white background regardless of plant category.
- **SC-002**: The shopping checklist table contains zero "Bed" column headers and zero bed name values in any row.
- **SC-003**: A garden with the same plant in 3 different beds (e.g., 4 cells each) produces exactly 1 shopping row for that plant with quantity 12.
- **SC-004**: The totals summary variety count equals the number of unique shopping rows after merging.

## Assumptions

- The neutral cell background is white (`#FFFFFF`), which provides clear contrast against the `#F0FAF3` page background and the `#52B788` bed card border.
- Row merging (one row per plant, summed quantities) is the correct behaviour when bed names are removed. This is consistent with the checklist's purpose as a shopping aid — at a nursery, you need to know how many of each plant to buy, not which bed they go in.
- The `CATEGORY_COLORS` constant can be retained in the codebase for potential future use; it simply will not be applied to cell backgrounds.
- Compact mode bed cards (which show only bed name and plant count, not individual cells) are unaffected by the category colour removal since they do not render individual plant cells.
