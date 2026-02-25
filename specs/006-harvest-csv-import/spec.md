# Feature Specification: Harvest CSV Import

**Feature Branch**: `006-harvest-csv-import`
**Created**: 2026-02-25
**Status**: Draft
**Input**: User description: "a new feature should allow a user to download a template and upload their harvest details. The name should match the name field on the plant model, dates use MM/DD/YYYY or MM/DD/YY. All harvests should be in oz. Non case sensitive matches are allowed. If the match does not exist prompt the user with a recommended plant but allow them to select if not correct."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Download Harvest Template (Priority: P1)

A logged-in user wants to bulk-import past harvests but doesn't know the exact
column format. They download a pre-formatted CSV template from the Harvests
page. The template includes the correct column headers and one example row so
they know exactly how to fill it in before uploading.

**Why this priority**: Without the template the user has no way to produce a
valid import file. It is the entry point for the entire feature and delivers
immediate standalone value.

**Independent Test**: Navigate to the Harvests page, click "Download template",
open the file — it contains the correct headers and an example row in the
correct format.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the Harvests page, **When** they click
   "Download template", **Then** a CSV file is downloaded containing the headers
   `Plant Name`, `Date`, `Quantity (oz)` and one example data row.
2. **Given** the downloaded template, **When** the user opens it in a
   spreadsheet app, **Then** the example row shows a plant name, a date in
   `MM/DD/YYYY` format, and a numeric quantity.

---

### User Story 2 — Upload and Import Harvests (Priority: P1)

A logged-in user has filled in the CSV template with their harvest records. They
upload the file on the Harvests page. The system validates each row, matches
plant names case-insensitively against the plant library, and imports all valid
matched rows as harvest entries. A summary confirms how many rows were imported
and how many were skipped or had errors.

**Why this priority**: This is the core import flow. Delivering US1 and US2
together constitutes a usable MVP for the bulk import feature.

**Independent Test**: Upload a valid CSV where all plant names match exactly
(case-insensitively) — all rows appear in the Harvests list and the summary
shows the correct imported count.

**Acceptance Scenarios**:

1. **Given** a CSV with rows where all plant names match the library
   (case-insensitive), **When** the user uploads the file, **Then** all rows are
   imported as harvest entries and appear in the Harvests list.
2. **Given** a CSV where a plant name is `"tomato"` and the library contains
   `"Tomato"`, **When** the user uploads the file, **Then** the row is matched
   and imported without any manual intervention.
3. **Given** a CSV with a mix of valid and invalid rows (e.g. a malformed date),
   **When** the user uploads the file, **Then** valid rows are imported, invalid
   rows are listed with the row number and reason, and the summary shows
   separate counts for imported and failed rows.
4. **Given** a CSV with dates in `MM/DD/YY` format (two-digit year), **When**
   the user uploads the file, **Then** dates are interpreted correctly and rows
   are imported.
5. **Given** an empty file or a file with headers only, **When** the user uploads
   it, **Then** the system shows a clear message that no data rows were found and
   nothing is imported.

---

### User Story 3 — Resolve Unmatched Plant Names (Priority: P2)

During an upload, one or more plant names in the CSV do not match any plant in
the library. Instead of failing the entire import, the system pauses and
presents each unmatched name with the closest recommended match. The user can
confirm the suggestion, choose a different plant from the full library, or skip
that row. Once all unmatched rows are resolved the import completes.

**Why this priority**: Mis-spelled or slightly different plant names are
inevitable. This story prevents the entire import from failing due to a single
typo while keeping the user in control of the final mapping.

**Independent Test**: Upload a CSV containing one row with `"Tomatoe"` —
the system suggests `"Tomato"`, the user confirms, and the row is imported
correctly.

**Acceptance Scenarios**:

1. **Given** a CSV containing `"Tomatoe"` (typo), **When** the user uploads the
   file, **Then** the system presents an unmatched-name dialog showing
   `"Tomatoe"` with `"Tomato"` as the recommended match.
2. **Given** the unmatched-name dialog, **When** the user confirms the
   recommended match, **Then** the row is imported using the matched plant.
3. **Given** the unmatched-name dialog, **When** the user disagrees with the
   recommendation and selects a different plant from the full library dropdown,
   **Then** the row is imported using the user-selected plant.
4. **Given** the unmatched-name dialog, **When** the user clicks "Skip this row",
   **Then** the row is excluded from the import and the summary reflects the
   skipped count.
5. **Given** multiple unmatched names in one file, **When** the user resolves
   each one in sequence, **Then** all resolved rows are imported together after
   the last resolution step.

---

### Edge Cases

- What happens when the uploaded file is not a CSV (e.g. `.xlsx` or `.txt`)?
  → System rejects the file before processing with a clear format error.
- What happens when `Quantity (oz)` is zero, negative, or non-numeric?
  → Row is marked as invalid with the reason shown; it is not imported.
- What happens when the `Date` column contains a date in the future?
  → Row is imported as-is; future dates are not blocked (user may be
  pre-logging).
- What happens when the CSV contains duplicate rows (same plant, date, quantity)?
  → Each row is treated independently and imported; deduplication is the user's
  responsibility.
- What happens when the plant name is blank?
  → Row is marked as invalid ("Plant name is required") and skipped.
- What happens when the `Date` column is in an unsupported format (e.g.
  `YYYY-MM-DD`)?
  → Row is marked as invalid with the expected format shown.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Download template" action on the Harvests
  page that delivers a CSV file with columns `Plant Name`, `Date`, `Quantity (oz)`
  and one illustrative example row.
- **FR-002**: System MUST accept CSV file uploads from authenticated users on
  the Harvests page.
- **FR-003**: System MUST validate that the uploaded file is a CSV and that the
  required columns are present before processing any rows.
- **FR-004**: System MUST match the `Plant Name` column value case-insensitively
  against the `name` field of plants in the user's available plant library
  (system plants + user's custom plants).
- **FR-005**: System MUST accept dates in both `MM/DD/YYYY` (four-digit year)
  and `MM/DD/YY` (two-digit year) formats.
- **FR-006**: System MUST treat the `Quantity (oz)` value as ounces for every
  imported row.
- **FR-007**: System MUST display an import preview or summary showing the
  number of rows to be imported, skipped, and errored before or after
  processing.
- **FR-008**: When a `Plant Name` value has no case-insensitive match in the
  plant library, the system MUST display the unmatched name alongside the
  closest recommended plant from the library.
- **FR-009**: The user MUST be able to override the recommended plant match by
  selecting any plant from the full library.
- **FR-010**: The user MUST be able to skip individual unmatched rows without
  cancelling the entire import.
- **FR-011**: System MUST report a final import summary with counts of imported,
  skipped, and failed rows.
- **FR-012**: System MUST reject rows where `Quantity (oz)` is not a positive
  number, and display the row number and reason.
- **FR-013**: System MUST reject rows where the `Date` does not conform to the
  accepted formats, and display the row number and reason.

### Key Entities

- **CSV Template**: Defines the expected import format — three columns (`Plant
  Name`, `Date`, `Quantity (oz)`) plus one example row. Downloaded by the user,
  filled in offline, and re-uploaded.
- **Import Row**: A single row from the uploaded file — raw plant name, raw date
  string, raw quantity, plus the resolved plant, parsed date, and validation
  status after processing.
- **Plant Match**: The result of looking up a raw plant name against the library —
  either an exact case-insensitive match, a recommended closest match, or no
  match found.
- **Import Summary**: The final outcome of a completed upload — total rows
  processed, imported count, skipped count, and failed count with per-row error
  details.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can download the template, fill in 20 rows, upload the
  file, and have all matched rows appear in their harvest list in under
  3 minutes.
- **SC-002**: 100% of rows with exact or case-insensitive plant name matches are
  imported without any manual intervention from the user.
- **SC-003**: Users can resolve all unmatched plant names and complete the import
  without leaving the Harvests page.
- **SC-004**: Every invalid row (bad date format, missing or non-numeric
  quantity, blank plant name) is surfaced with a specific row number and plain
  English reason — zero silent failures.
- **SC-005**: The import summary accurately reflects the final counts (imported,
  skipped, failed) for every upload.

---

## Assumptions

- The plant library available for matching includes both system-wide plants and
  any custom plants the user has added to their account.
- Two-digit years in `MM/DD/YY` format are interpreted as 2000–2099 (e.g.
  `01/15/24` → `2024-01-15`).
- There is no maximum row limit enforced at the spec level; a reasonable
  technical limit will be set during planning.
- The recommended match for an unmatched name is determined by the closest
  string similarity to the plant `name` field; the exact algorithm is a
  planning-phase decision.
- Users are responsible for ensuring quantities are in ounces before uploading;
  the system does not convert units.
