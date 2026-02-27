# Feature Specification: Remove Plant Name Labels from Garden Map PDF

**Feature Branch**: `010-remove-cell-labels`
**Created**: 2026-02-27
**Status**: Draft
**Input**: User description: "remove the plant name from the garden bed pdf."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Remove Plant Name Labels from Map Cells (Priority: P1)

A gardener downloads their garden PDF and looks at the map page. Each plant cell currently shows the plant's emoji icon and an abbreviated plant name below it. After this change, the plant name label is removed — each cell shows only the emoji icon, centred in the cell. The map remains spatially accurate and the emoji still identifies the plant visually. The cell layout is cleaner and less cluttered, especially at small cell sizes.

**Why this priority**: This is the only change requested. The plant name label is the sole element being removed. The emoji remains as the visual identifier for each planted cell.

**Independent Test**: Download the PDF for a garden with planted beds. Open page 1 and verify that plant cells show only the emoji — no text label appears below or near the emoji in any cell.

**Acceptance Scenarios**:

1. **Given** a planted cell with a name like "Tomato (Cherry)", **When** the map renders, **Then** only the plant emoji (🍅) appears in the cell — no text label is shown.
2. **Given** a planted cell with a long plant name, **When** the map renders, **Then** no truncated or abbreviated name appears in the cell.
3. **Given** an empty cell (no plant assigned), **When** the map renders, **Then** the cell remains empty as before — no emoji, no label.
4. **Given** compact mode is active for a bed (scale too small for individual cells), **When** the map renders, **Then** the compact card still shows bed name and plant count — compact mode is unaffected.
5. **Given** a bed with many plants of different types, **When** the map renders, **Then** all cells show only their respective emoji with no name text.

---

### Edge Cases

- A cell whose plant has no emoji assigned should continue to show the fallback emoji (🌿) with no name label.
- The emoji should remain centred within the cell now that the label is gone — no vertical offset artefact from the removed label.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The garden map PDF MUST NOT display plant name text in any plant cell.
- **FR-002**: The plant emoji MUST remain visible and centred in each planted cell after the label is removed.
- **FR-003**: Empty cells (no plant assigned) MUST remain visually empty — no emoji, no label.
- **FR-004**: Compact mode bed cards MUST remain unchanged — they show bed name and plant count, not individual cells.
- **FR-005**: All other map content — spatial layout, bed borders, header bar, dot grid, pagination — MUST remain unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of planted cells on the map page display zero text characters — only the emoji icon.
- **SC-002**: The emoji in each cell is visually centred after the label is removed (no downward shift from the absent label element).

## Assumptions

- The emoji-only layout is sufficient to identify plants on the map; the shopping checklist page (unchanged) continues to provide the full plant name reference.
- The plant emoji fallback (`🌿` when no emoji is assigned) remains in place.
- The compact mode threshold and rendering are unaffected by this change.
