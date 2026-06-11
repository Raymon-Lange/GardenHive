# Tasks: Page Analytics Tracking

**Input**: Design documents from `specs/015-page-analytics/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

*No project initialisation required — this feature adds to an existing frontend with no new dependencies.*

---

## Phase 2: User Story 1 — Site Owner Views Page Traffic (Priority: P1) 🎯 MVP

**Goal**: Every page view (including SPA client-side navigations) is recorded in the Umami analytics dashboard.

**Independent Test**: Open GardenHive, navigate between routes, open the Umami dashboard at `https://analytics.fire-hive.com` and confirm page view events appear for each visited path.

### Implementation

- [x] T001 [US1] Add Umami analytics script tag to `<head>` in `frontend/index.html`

  ```html
  <script defer src="https://analytics.fire-hive.com/script" data-website-id="ef71b5f0-456e-4d2a-9050-28985fb5e8cc"></script>
  ```

**Checkpoint**: Rebuild the frontend container, visit the app, navigate between pages, and confirm page views appear in the Umami dashboard. User Story 1 is fully functional.

---

## Phase 3: User Story 2 — Analytics Collected Without Impacting Privacy (Priority: P2)

**Goal**: Confirm the analytics script writes no tracking cookies and exposes no PII.

**Independent Test**: Load GardenHive → DevTools → Application → Cookies → confirm no cookies set by `analytics.fire-hive.com`.

*No implementation tasks required for this story — it is a verification of Umami's built-in cookie-free behaviour. Complete the manual check below after T001 is deployed.*

### Verification (manual)

- [ ] T002 [US2] Open browser DevTools after visiting GardenHive and confirm no cookies are written by `analytics.fire-hive.com` in `frontend/index.html` (verification only — no code change)

**Checkpoint**: Both user stories satisfied. Analytics active, privacy preserved.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T003 [P] Update `specs/015-page-analytics/checklists/requirements.md` to mark all items complete after T001 and T002 pass

---

## Dependencies & Execution Order

- **T001**: No dependencies — start immediately
- **T002**: Depends on T001 (needs the script deployed to verify)
- **T003**: Depends on T001 + T002

---

## Implementation Strategy

### MVP (1 task)

1. Complete T001 (add script tag to `frontend/index.html`)
2. Rebuild frontend container
3. Verify in Umami dashboard — done

### Full Delivery (3 tasks, ~10 minutes total)

1. T001 — code change
2. T002 — manual privacy check
3. T003 — checklist update
