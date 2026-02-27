# Tasks: Remove Plant Name Labels from Garden Map PDF

**Input**: Design documents from `/specs/010-remove-cell-labels/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, quickstart.md ✓

**Tests**: Not requested — manual PDF inspection per quickstart.md.

**Organization**: Single user story (US1). No setup or foundational phases required — this is a one-file deletion with no new infrastructure.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 — Remove Plant Name Labels (Priority: P1) 🎯 MVP

**Goal**: Delete the plant name label `<div>` from the plant cell renderer, remove the now-unnecessary `marginTop` offset wrapper, and clean up the two unused variables (`labelFontPx`, `shortName`) — leaving the emoji as the sole cell content, flex-centred naturally.

**Independent Test**: Download the garden PDF as `mike@gardenhive.com` and verify page 1 shows only emoji in plant cells — no text label appears anywhere in any cell.

### Implementation for User Story 1

- [x] T001 [US1] Remove label `<div>`, `marginTop` wrapper, and unused vars `labelFontPx` and `shortName` from the plant cell renderer in `frontend/src/components/GardenPrintView.jsx`

**Checkpoint**: All plant cells on the PDF map show only the emoji, vertically centred. Empty cells remain empty. Compact mode bed cards are unaffected.

---

## Phase 2: Polish & Validation

**Purpose**: Lint check and manual PDF verification.

- [x] T002 Run ESLint on `frontend/src/components/GardenPrintView.jsx` — confirm zero new errors (`cd frontend && npm run lint`)
- [ ] T003 Manual PDF verification per quickstart.md — page 1 cells show emoji only, centred; no text label in any cell; empty cells empty; compact beds unchanged

---

## Dependencies & Execution Order

- **T001**: No dependencies — start immediately
- **T002**: Depends on T001 (lint the edited file)
- **T003**: Depends on T001 (PDF reflects the change)
- T002 and T003 can run in parallel after T001 completes

---

## Implementation Strategy

### MVP (Single Story)

1. Complete T001 (the only code change)
2. Run T002 (lint) — fix any issues
3. Run T003 (manual PDF check) — confirm requirements met
4. Commit

---

## Notes

- Zero new files, zero new packages, zero backend changes
- The single `<div>` deletion also requires removing the `marginTop` wrapper that surrounded it (see research.md Decision 1) and cleaning up two now-unused variables (research.md Decision 2)
- Verification credentials: `mike@gardenhive.com` / `321qaz` at http://localhost:5173
