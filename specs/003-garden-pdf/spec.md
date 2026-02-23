# Feature Specification: Garden Layout PDF & Shopping List

**Feature Branch**: `003-garden-pdf`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "I like to create a PDF image of the garden layout with each bed and the icon each plant. on a 2nd page create a table Bed and plant with check box for seed, planted, puchased. This idea is the user who print this out can take store a store to buy seeds or starts. IE a shopping list."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download Garden Layout PDF (Priority: P1)

An owner opens the Garden Map view and clicks a "Download PDF" button. The downloaded file contains two pages: page 1 is a visual map of the garden grid showing each bed in its correct position with the emoji or icon of every planted cell visible; page 2 is a shopping list table listing every bed and every plant in it, with three checkboxes per row — Seed, Starts, and Purchased — so the user can mark off what they need to buy at the nursery or seed shop.

**Why this priority**: This is the core deliverable. The two-page PDF delivers standalone value as a printable planning tool and shopping aid. Everything else is secondary.

**Independent Test**: Can be fully tested by having a garden with at least one bed containing planted cells, clicking "Download PDF", opening the file, verifying page 1 shows the visual grid with plant emojis, and verifying page 2 shows a table with bed names, plant names, cell counts, and three empty checkboxes per row.

**Acceptance Scenarios**:

1. **Given** an owner has a garden with at least one bed that has at least one plant placed in a cell, **When** they click "Download PDF" on the Garden Map page, **Then** a PDF file is downloaded to their device.
2. **Given** the downloaded PDF, **When** the user opens page 1, **Then** it displays a visual garden map where each bed is drawn at its correct relative position and size, and each planted cell shows the plant's emoji.
3. **Given** the downloaded PDF, **When** the user views page 2, **Then** they see a table with one row per unique plant per bed, containing: bed name, plant name, number of cells of that plant in that bed, and three printable checkboxes labelled "Seed", "Starts", and "Purchased".
4. **Given** a bed with multiple cells planted with the same plant, **When** the user views the shopping list, **Then** the plant appears once for that bed with the correct cell count — not once per cell.
5. **Given** an owner has no beds with planted cells, **When** they download the PDF, **Then** page 1 shows the empty garden grid and page 2 shows a message indicating there are no plants to list.
6. **Given** a helper with view access, **When** they view the Garden Map, **Then** the "Download PDF" button is also available to them.

---

### User Story 2 - Print Directly from Browser (Priority: P2)

Instead of downloading a file, the user clicks a "Print" button that opens the browser's native print dialog with the same two-page layout pre-formatted for paper. This lets users print directly to a connected printer without saving a file first.

**Why this priority**: Direct printing is a common workflow for users with a printer nearby. A dedicated print action also ensures the page layout is optimised for paper (hiding navigation, setting margins) without requiring a separate download step.

**Independent Test**: Can be tested by clicking "Print", confirming the browser print dialog opens, and verifying the preview shows the garden map on page 1 and the shopping list table on page 2, both fitting within standard paper dimensions.

**Acceptance Scenarios**:

1. **Given** the user is on the Garden Map page, **When** they click "Print", **Then** the browser's print dialog opens showing a print-optimised two-page layout.
2. **Given** the print preview, **When** the user examines it, **Then** page 1 shows the garden grid and page 2 shows the shopping list table — both formatted to fit within standard paper dimensions (A4 or US Letter) without clipping.

---

### Edge Cases

- What happens when a bed has no planted cells? The bed appears on the map in page 1 but is excluded from the shopping list on page 2.
- What happens if the garden has no placed beds at all? Page 1 shows the empty grid and page 2 shows "No plants to list."
- What happens if a plant name or bed name is very long? Text wraps or is truncated with an ellipsis in the table; the map label clips within the bed boundary.
- What happens when the garden is very wide (e.g., 50 ft)? The grid on page 1 scales down to fit the paper width while preserving square proportions.
- What if a plant has no emoji? A generic leaf symbol (🌿) is used as a fallback icon.
- What if the shopping list is very long (many beds, many plants)? The table continues across multiple pages naturally; each page retains the table header row.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to trigger a PDF download from the Garden Map view via a clearly labelled button.
- **FR-002**: The PDF MUST contain exactly two sections: a garden map visual and a shopping list table.
- **FR-003**: The garden map section MUST draw each placed bed at its correct relative position and proportional size within the garden boundary.
- **FR-004**: Each planted cell in the garden map MUST display the plant's emoji; unplanted cells MUST be shown as empty.
- **FR-005**: The shopping list section MUST contain one row per unique plant per bed, where the plant count in that bed is greater than zero.
- **FR-006**: Each shopping list row MUST include: bed name, plant name, cell count (quantity needed), and three empty checkbox columns labelled "Seed", "Starts", and "Purchased".
- **FR-007**: Beds with no planted cells MUST be excluded from the shopping list section.
- **FR-008**: The PDF MUST be formatted for standard paper (A4 or US Letter) so it prints without content being clipped.
- **FR-009**: The garden map MUST scale to fit the paper width while maintaining square cells.
- **FR-010**: Users MUST also be able to trigger the browser's native print dialog for the same layout as an alternative to file download.
- **FR-011**: Both owners and helpers with view-level access or higher MUST be able to download or print the PDF.
- **FR-012**: When the shopping list spans more than one printed page, the table header row MUST repeat at the top of each continuation page.

### Key Entities *(include if feature involves data)*

- **PDF Document**: A two-section, print-ready document generated on demand from the current garden state. Not stored — created fresh each time the user requests it.
- **Shopping List Row**: A derived record grouping: bed name, plant name, plant emoji, cell count for that plant in that bed, and three checkbox states (all unchecked). One row per unique (bed, plant) combination where count > 0.

### Assumptions

- The PDF is generated entirely from data already loaded in the Garden Map view; no new server-side endpoint is needed.
- "Starts" covers both transplants and nursery starts — a single checkbox is sufficient.
- The downloaded file is named with the garden name and date, e.g., `my-garden-2026-02-23.pdf`.
- Only plants currently placed in cells are included; unplaced plants from the library are excluded.
- The shopping list rows are sorted by bed name, then by plant name within each bed.
- The feature is accessed from the Garden Map page only (not from individual bed detail pages).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can download or print the two-page garden PDF in under 5 seconds from clicking the button.
- **SC-002**: Page 1 of the PDF accurately represents 100% of the placed beds and their planted cells as shown on the Garden Map.
- **SC-003**: Page 2 lists every unique (bed, plant) combination where plant count > 0, with zero omissions or duplicates.
- **SC-004**: The layout fits within standard paper dimensions — no content is cut off when printed at A4 or US Letter size.
- **SC-005**: A user who has never used the feature can locate the download/print button and successfully produce the PDF on their first attempt without any instructions.
