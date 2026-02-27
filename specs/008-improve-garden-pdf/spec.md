# Feature Specification: Garden PDF Visual Redesign

**Feature Branch**: `008-improve-garden-pdf`
**Created**: 2026-02-27
**Status**: Draft
**Input**: User description: "Improve the in-app garden layout PDF. Replace the current Download PDF output with a visually redesigned version: a spatially accurate garden map page with category-coloured plant cells, and an improved shopping checklist page. Triggered from the existing Download PDF button on the Garden Map page."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download a Visually Redesigned Garden PDF (Priority: P1)

An owner or helper opens the Garden Map page and clicks the existing "Download PDF" button. Instead of the previous plain output, they receive a redesigned PDF that opens to a full-colour garden map: each raised bed is drawn at its proportional real-world position and size within the garden boundary, every plant cell is colour-coded by category and shows the plant's icon and abbreviated name, and a header at the top shows the garden name, date, dimensions, and bed count. The second page is a clean zebra-striped shopping checklist with cross-bed totals.

**Why this priority**: This is the full end-to-end experience. A user clicking the download button should immediately get a document they want to print and take to a nursery — this story covers the complete journey from click to printable PDF.

**Independent Test**: Can be fully tested by opening the Garden Map for a garden with at least two beds containing plants from different categories, clicking "Download PDF", opening the file, and verifying page 1 shows the spatial map with colour-coded cells and page 2 shows the formatted checklist.

**Acceptance Scenarios**:

1. **Given** an owner is on the Garden Map page, **When** they click "Download PDF", **Then** a PDF file is downloaded to their device with the redesigned layout.
2. **Given** a helper with view-level access or higher, **When** they open the Garden Map, **Then** the "Download PDF" button is available and produces the same redesigned output.
3. **Given** the downloaded PDF, **When** the user opens it, **Then** page 1 shows a spatially accurate garden map and page 2 shows the shopping checklist.
4. **Given** a garden with no planted beds, **When** the user downloads the PDF, **Then** page 1 shows the empty garden boundary and page 2 shows a "No plants to list" message.

---

### User Story 2 - Spatially Accurate Garden Map Page (Priority: P2)

The garden map page renders each bed at its proportional real-world position and size within the overall garden boundary. The garden's dimensions (width × height in feet) drive the map scale — a 20 ft × 30 ft garden uses its own aspect ratio to fill the page, and a bed positioned in the top-right of the garden appears there on the map. Larger beds render proportionally bigger than smaller beds. Within each bed card, every plant cell shows the plant's category colour, its icon, and an abbreviated name.

**Why this priority**: The spatial accuracy of the map is what makes it genuinely useful for a gardener standing in their garden. A flow grid of equally-sized cards does not reflect reality; a scaled, positional map does.

**Independent Test**: Can be tested with a garden containing beds of different sizes at different positions. Verify that the relative positions of beds on the map match their positions in the app, and that a larger bed (in ft²) renders with a proportionally larger card than a smaller bed.

**Acceptance Scenarios**:

1. **Given** two beds at different positions in the garden, **When** the map renders, **Then** their positions on the PDF map correspond proportionally to their real-world positions in the garden grid.
2. **Given** two beds of different sizes (e.g., 4 ft × 8 ft vs. 2 ft × 2 ft), **When** the map renders, **Then** the larger bed's card is proportionally bigger than the smaller bed's card.
3. **Given** the garden's overall dimensions, **When** the map scale is calculated, **Then** the full garden boundary fits within the printable page area maintaining the garden's actual aspect ratio.
4. **Given** a plant cell in a bed, **When** the map renders, **Then** the cell displays the plant's category colour as its background, the plant's emoji icon centred, and an abbreviated plant name beneath it.
5. **Given** a bed containing plants from multiple categories, **When** the map renders, **Then** each plant cell shows the correct category colour for that individual plant.
6. **Given** a plant with no assigned category, **When** the map renders, **Then** the cell uses the default Vegetable category colour without error.
7. **Given** a bed with more than 4 plants, **When** the card renders, **Then** plant cells wrap to a new row after every 4 cells.
8. **Given** the top of page 1, **When** it renders, **Then** the header displays the garden name, date generated, garden dimensions, and total bed count.

---

### User Story 3 - Responsive Map Layout for Any Garden Size (Priority: P3)

The map layout adapts to the garden's size to maintain readability. For beds that are too small to show individual plant cells legibly (text would fall below 8pt), the bed card switches to compact mode — showing only the bed name and total plant count. For gardens too large to fit on one page at 6pt or above, the map paginates across multiple pages, each covering a section of the garden with a miniature index showing the full boundary.

**Why this priority**: Gardens range from tiny 4 ft × 4 ft plots to large 50 ft × 80 ft properties. A single fixed layout breaks at extremes. The two-tier fallback (compact mode then pagination) ensures the PDF is always legible and print-ready regardless of garden size.

**Independent Test**: Tested against the six garden size scenarios. For the "large sparse" scenario, verify compact mode activates on small beds. For the "narrow landscape" scenario, verify the map paginates with a visible index indicator.

**Acceptance Scenarios**:

1. **Given** a bed whose proportional scale would render plant cell text below 8pt, **When** the map renders, **Then** that bed displays in compact mode: bed name and total plant count (e.g., "North Bed · 6 plants"), no individual cells.
2. **Given** a compact-mode bed, **When** the map renders, **Then** its spatial position and proportional boundary size are preserved — it appears in the correct location within the garden.
3. **Given** a garden whose full boundary cannot be rendered with bed labels at 6pt or larger on one page, **When** the map is generated, **Then** it paginates across multiple pages, each showing a section of the garden at a larger scale.
4. **Given** a paginated map, **When** each map page renders, **Then** it includes a page indicator (e.g., "Map page 1 of 2") and a miniature index thumbnail of the full garden boundary showing which section that page covers.
5. **Given** a mix of full-detail and compact-mode beds on the same map page, **When** the page renders, **Then** both modes coexist without layout errors.

---

### User Story 4 - Improved Shopping Checklist Page (Priority: P4)

The shopping checklist page (the final page of the PDF, after all map pages) is a clean, zebra-striped table with columns: Bed, Plant, Qty, Seed ☐, Starts ☐, Purchased ☐. Below the table a summary shows total planted cell count and total unique variety count. A footer shows the generation date.

**Why this priority**: The checklist is the action-oriented companion to the map. The existing output is functional but visually bare; this story brings it in line with the new design standard.

**Independent Test**: Can be tested by downloading the PDF for a garden with plants in multiple beds, verifying the checklist table has all required columns, alternating row shading, accurate quantities, correct totals, and a dated footer.

**Acceptance Scenarios**:

1. **Given** a garden with plants across multiple beds, **When** the checklist renders, **Then** the table contains one row per unique bed–plant combination with columns: Bed, Plant, Qty, Seed ☐, Starts ☐, Purchased ☐.
2. **Given** the table rows, **When** the page renders, **Then** alternating rows have a distinct background shade (zebra-stripe).
3. **Given** the Qty column, **When** it renders, **Then** the value matches the number of cells that plant occupies in that bed.
4. **Given** the area below the table, **When** it renders, **Then** it displays total planted cell count across all beds and total unique plant variety count.
5. **Given** the checklist page footer, **When** it renders, **Then** it shows the date the PDF was generated.
6. **Given** a checklist that exceeds one page, **When** it paginates, **Then** the column header row repeats at the top of each continuation page.

---

### Edge Cases

- What happens when a bed has no plants? The bed card still appears on the map in its correct position; it is excluded from the shopping checklist.
- What happens when a plant name is very long? The name is abbreviated (truncated with an ellipsis) to fit within the plant cell.
- What happens when a plant has no emoji? A generic leaf symbol (🌿) is used as a fallback.
- What happens when the same plant appears in multiple beds? It appears as a separate row per bed in the checklist; the variety count counts it once.
- What happens when compact mode and full-detail beds coexist? Both modes render correctly on the same map page; spatial layout is consistent.
- What happens if PDF generation throws an error? A toast notification is shown ("Could not generate PDF — please try again"); no file is downloaded and no silent failure occurs.
- What happens when the garden map paginates? The shopping checklist always begins on its own new page after all map pages complete.

### Garden Size Test Scenarios

The map layout must be validated across this range, since garden dimensions drive scale and compact/pagination thresholds:

| Scenario | Garden Size | Beds | Expected Mode | Challenge |
|----------|-------------|------|---------------|-----------|
| Tiny/dense | 4 ft × 6 ft | 2–3 small tightly packed beds | Full detail (single page) | Cells are small; verify they stay at or above 8pt |
| Small standard | 10 ft × 12 ft | 3–5 beds of similar size | Full detail (single page) | Typical backyard layout; baseline rendering test |
| Medium mixed | 20 ft × 30 ft | 6–10 beds of varying sizes | Full detail; some compact fallback | Size variance — small beds may hit 8pt threshold |
| Large sparse | 50 ft × 80 ft | 4–6 widely spaced beds | Compact fallback + possible pagination | Small beds relative to garden; 6pt threshold likely triggered |
| Narrow landscape | 8 ft × 40 ft | 5–8 beds in a long row | Pagination (strip layout) | Extreme aspect ratio; map paginates into strips |
| Many beds | 30 ft × 50 ft | 20+ beds | Mixed detail/compact + pagination | Maximum density; both fallback mechanisms active |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The PDF MUST be generated from the garden data already loaded in the Garden Map view — no additional API calls or file uploads are required.
- **FR-002**: The redesigned layout MUST replace the current output for both the "Download PDF" button (browser file download) and the "Print" button (browser print dialog) on the Garden Map page. The previous layout is removed entirely.
- **FR-003**: The output MUST be a letter-size PDF with a header section, one or more garden map pages, and one or more shopping checklist pages.
- **FR-004**: The garden map MUST render each bed as a visually bordered card positioned and sized proportionally to its real-world coordinates and dimensions within the garden boundary. Garden dimensions, not bed count, define the map scale.
- **FR-005**: Each plant cell within a bed card MUST display the plant's emoji icon centred in the cell and an abbreviated plant name (≤12 characters, with ellipsis if truncated) beneath it.
- **FR-006**: Each plant cell background MUST be coloured according to the plant's category (`vegetable`, `fruit`, `herb`, `flower`) using four distinct, print-friendly accent colours that contrast against the `#F0FAF3` page background. Specific colour assignments are defined during planning.
- **FR-007**: Plant cells within a bed card MUST be sized relative to the bed's rendered area and wrap to a new row after every 4 cells.
- **FR-008**: Plants with no assigned category MUST default to the `vegetable` category colour without error.
- **FR-009**: Page 1 (first map page) MUST include a header showing: garden name, generation date, garden dimensions (ft), and total bed count.
- **FR-010**: The map scale MUST be derived from the garden's total dimensions so the full garden boundary fits the printable area while maintaining the correct aspect ratio.
- **FR-011**: When the proportional scale of a bed would render plant cell text below **8pt**, that bed MUST switch to compact mode, displaying only the bed name and total plant count (e.g., "North Bed · 6 plants"). The bed's position and boundary remain spatially accurate.
- **FR-012**: When the full garden cannot be rendered on a single page with bed label text at **6pt or larger**, the map MUST paginate. Each map page includes a page indicator and a miniature index thumbnail of the full garden boundary.
- **FR-013**: The shopping checklist MUST appear on its own page, starting after all map pages.
- **FR-014**: The shopping checklist MUST display a table with columns: Bed, Plant, Qty, Seed ☐, Starts ☐, Purchased ☐.
- **FR-015**: Table rows MUST use alternating background shading (zebra-stripe).
- **FR-016**: Below the checklist table, the output MUST display the total planted cell count and total unique variety count across all beds.
- **FR-017**: The checklist page MUST include a footer showing the generation date.
- **FR-018**: When the checklist spans more than one page, the column header row MUST repeat at the top of each continuation page.
- **FR-019**: Both owners and helpers with view-level access or higher MUST be able to download the redesigned PDF.
- **FR-020**: The tool MUST produce correct output for all six garden size test scenarios defined in this specification.
- **FR-021**: If PDF generation fails for any reason, a toast notification MUST be displayed to the user (e.g., "Could not generate PDF — please try again"). No silent failures are permitted.

### Plant Category Colour Palette

The following four category colours are to be assigned during planning, subject to the constraint that each must contrast clearly against `#F0FAF3` and remain distinguishable when printed in greyscale:

- `vegetable` — colour TBD in plan
- `fruit` — colour TBD in plan
- `herb` — colour TBD in plan
- `flower` — colour TBD in plan

### Document Colour Palette

| Role            | Colour    |
|-----------------|-----------|
| Page background | `#F0FAF3` |
| Card border     | `#52B788` |
| Header bars     | `#2D6A4F` |
| Header text     | `#FFFFFF` |
| Body text       | `#1B1B1B` |
| Muted text      | `#6B7280` |
| Dividers        | `#CDE8D5` |

### Assumptions

- The PDF is generated entirely from data already loaded in the Garden Map view; no new server-side endpoint is required.
- Plant emojis are already stored on each plant record (`emoji` field) and are available in the UI.
- Garden bed records include position coordinates (x, y) and dimensions (width, height in feet) as set via the drag-and-snap map feature.
- The downloaded file is named using the garden name slug and the current date (e.g., `my-garden-2026-02-27.pdf`).
- Shopping list rows are sorted by bed name, then by plant name within each bed.
- Beds with no planted cells are shown on the map but excluded from the checklist.
- The existing Print dialog path (feature 003) is fully replaced by the new layout — both download and print share a single PDF generation implementation.
- Greyscale print compatibility is a goal but not a hard blocker; colour printing is the primary use case.

## Clarifications

### Session 2026-02-27

- Q: How should bed cards be arranged on the map page — how many per row, and what drives layout? → A: Garden dimensions drive the layout, not bed count. Beds are rendered at their proportional real-world position and size within the garden boundary (spatial map, not a flow grid). The six garden size test scenarios capture the full range.
- Q: What happens when proportional scaling renders a bed too small to show legible plant cells? → A: Two-tier readability floor. (1) **Compact fallback at 8pt**: beds whose plant cell text would fall below 8pt switch to compact mode — bed name + total plant count only. (2) **Map pagination at 6pt**: if the full garden cannot fit on one page with bed labels at 6pt or above, the map paginates, with a page indicator and miniature index on each map page.
- Q: This is an in-app feature, not a standalone script — what is the correct input source? → A: Input is the garden data already loaded in the Garden Map UI (beds, plants, positions, dimensions). The PDF is generated on demand from the Download PDF button, replacing the current feature 003 output. No external file or script is involved.
- Q: Does this replace or extend feature 003 — does the redesign apply to both the Download PDF and Print buttons? → A: Full replacement. Both the Download PDF button and the Print button are updated to use the new layout. The old output is removed entirely.
- Q: What does the user see while the PDF is being generated (loading feedback)? → A: No in-app loading state. The button triggers generation immediately and the browser handles download progress natively. No spinner, progress bar, or in-app feedback is shown.
- Q: What happens if PDF generation fails — is there any in-app error feedback? → A: Show a brief toast notification (e.g., "Could not generate PDF — please try again"). Silent failure is not acceptable; the toast is the lightest feedback that still informs the user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of beds in the garden appear as correctly positioned cards on the map — no bed is missing, duplicated, or placed in the wrong spatial location.
- **SC-002**: 100% of plant-bed quantity values in the checklist match the garden data exactly — no rounding, omission, or inflation.
- **SC-003**: The output renders correctly for all six garden size test scenarios with no layout overflow, clipping, or bed overlap. Beds below the 8pt threshold display in compact mode; gardens exceeding the 6pt single-page threshold paginate correctly.
- **SC-004**: Every plant cell in a full-detail bed displays an icon and an abbreviated name — no cell is blank or shows a rendering error.
- **SC-005**: The browser download prompt appears within 5 seconds of clicking the button for gardens up to the "medium mixed" scenario size. No in-app loading state is shown; generation completes silently.
- **SC-006**: A gardener unfamiliar with the redesigned PDF can identify the garden, locate any bed on the map, and find the corresponding checklist rows within 30 seconds of opening the file.
- **SC-007**: No bed label or compact-mode summary text renders below 6pt on any page of the output PDF.
