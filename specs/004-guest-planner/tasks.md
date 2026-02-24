# Tasks: Guest Garden Planner

**Input**: Design documents from `/specs/004-guest-planner/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included — Constitution Principle VI mandates test coverage for all new route files.

**Organization**: Tasks grouped by user story (P1 → P2 → P3) to enable independent delivery of each increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in every description

## Path Conventions

- Backend source: `backend/src/`
- Backend tests: `backend/src/__tests__/`
- Frontend source: `frontend/src/`

---

## Phase 1: Setup (Baseline Verification)

**Purpose**: Confirm the feature branch is clean before any changes.

- [X] T001 Run `npm test` in `backend/` on branch `004-guest-planner` to establish a passing baseline before any modifications

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend endpoint and frontend layout guard that ALL three user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `GET /api/plants/public` route to `backend/src/routes/plants.js` — insert before the first `requireAuth` route; no middleware; handler: `Plant.find({ ownerId: null }).sort({ name: 1 })` returns array directly; 500 on error
- [X] T003 [P] Add null-safe user guard to `frontend/src/components/AppLayout.jsx` — find every reference to `user.name`, `user.email`, or profile-only UI; replace with `user?.name ?? 'Guest'` or conditional render so the layout renders without crashing when `user` is null
- [X] T004 Write backend tests for `GET /api/plants/public` in `backend/src/__tests__/plants.test.js` — cover: no auth header still returns 200; returns array of system plants; custom plants (`ownerId != null`) are excluded; returns `[]` when no system plants exist (depends on T002)

**Checkpoint**: Foundation ready — all user story work can now begin.

---

## Phase 3: User Story 1 — Design a Garden Bed as a Guest (Priority: P1) 🎯 MVP

**Goal**: Guest arrives at `/planner`, sets bed dimensions and name, assigns plants from the system library to cells, can sign up to save the layout to a new account.

**Independent Test**: Open `/planner` in an incognito window, enter dimensions, place two plants, click "Sign up to save", register, confirm the bed appears in the new account with the correct plants.

### Implementation for User Story 1

- [X] T005 [US1] Create `frontend/src/pages/GuestPlanner.jsx` — `useState` for `{ name: '', rows: null, cols: null, cells: [] }`; render a setup form with: optional name field, required rows input, required cols input, client-side validation (positive integers only); on valid submit show the grid; render `AppLayout` as the outer wrapper; show a persistent "Your layout is not saved and will be lost if you leave this page" banner (depends on T003)
- [X] T006 [P] [US1] Add grid rendering to `frontend/src/pages/GuestPlanner.jsx` — iterate all `rows × cols` positions; render each cell as a 3.5rem × 3.5rem button (`w-14 h-14`); display assigned plant emoji or empty state; on click open the plant picker (depends on T005)
- [X] T007 [P] [US1] Add plant picker to `frontend/src/pages/GuestPlanner.jsx` — `useQuery(['plants', 'public'], () => api.get('/api/plants/public').then(r => r.data))`; open on cell click; list system plants with name, emoji, category; clicking a plant assigns it to the selected cell in local state; include a "Remove plant" option for already-assigned cells (depends on T005, T002)
- [X] T008 [P] [US1] Add `/planner` public route to `frontend/src/App.jsx` — import `GuestPlanner` from `./pages/GuestPlanner`; add `<Route path="/planner" element={<GuestPlanner />} />` alongside `/login` and `/signup`, outside the `<PrivatePage>` wrapper (depends on T005)
- [X] T009 [US1] Add "Sign up to save" button to `frontend/src/pages/GuestPlanner.jsx` — visible only when at least one plant is placed; on click: `sessionStorage.setItem('gh_guest_bed', JSON.stringify({ name, rows, cols, cells }))` then `navigate('/signup')` (depends on T006, T007)
- [X] T010 [US1] Update `frontend/src/pages/Signup.jsx` to carry over the guest bed after registration — after successful `POST /api/auth/register` and login, check `sessionStorage.getItem('gh_guest_bed')`; if present: `POST /api/beds` with `{ name, rows, cols }`, then `PUT /api/beds/:id/cells` with mapped cell array `{ cells: [{ row, col, plantId: cell.plant._id }] }`; `sessionStorage.removeItem('gh_guest_bed')`; navigate to `/beds/:id`; if not present navigate to `/dashboard` as before (depends on T009)

**Checkpoint**: US1 complete — a guest can design a bed, sign up, and find their layout saved in their account. Independently testable.

---

## Phase 4: User Story 2 — Download the Layout as a PDF (Priority: P2)

**Goal**: Guest can download their current bed layout as a PDF with a plant shopping list.

**Independent Test**: With at least one plant placed, click "Download PDF", confirm a PDF is downloaded showing the bed grid and shopping list matching the registered-user PDF format.

### Implementation for User Story 2

- [X] T011 [US2] Add PDF download to `frontend/src/pages/GuestPlanner.jsx` — add a `ref` for `GardenPrintView`; render `<GardenPrintView>` off-screen via `createPortal`; pass `beds={[{ ...guestBed, mapRow: 0, mapCol: 0 }]}`, `gardenWidth={guestBed.cols}`, `gardenHeight={guestBed.rows}`, `gardenName={guestBed.name || 'My Garden Plan'}`; replicate `handleDownloadPdf` from `frontend/src/pages/GardenMap.jsx` (html2canvas + jsPDF, two print sections); disable "Download PDF" button when `cells.length === 0` with a tooltip "Place at least one plant to download" (depends on T005)

**Checkpoint**: US2 complete — guests can download their layout as a PDF. Independently testable.

---

## Phase 5: User Story 3 — Landing Page CTA (Priority: P3)

**Goal**: A "Try Free Planner" button is visible in the hero section of the public landing page, directing visitors to `/planner`.

**Independent Test**: Open `/` in an incognito window, confirm the "Try Free Planner" button is visible without scrolling on desktop and mobile, click it, confirm it navigates to `/planner` with no login prompt.

### Implementation for User Story 3

- [X] T012 [US3] Add "Try Free Planner" secondary CTA to `frontend/src/pages/Landing.jsx` hero section — add a `<Link to="/planner">` button alongside the existing "Start for free" CTA; use an outlined/ghost button style (lower visual weight than the primary CTA) so the sign-up hierarchy is preserved; confirm visible without scrolling on both desktop and mobile viewports

**Checkpoint**: US3 complete — the free planner is discoverable from the landing page.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and quality gate.

- [X] T013 [P] Run the manual validation checklist from `specs/004-guest-planner/quickstart.md` — work through all scenarios (US1, US2, US3, sign-up carry-over, AppLayout guest behaviour) and confirm every checklist item passes
- [X] T014 Run `npm test` in `backend/` and confirm all tests pass (T004 new tests included); run `npm run lint` in `frontend/` and confirm zero errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 complete
- **US2 (Phase 4)**: Depends on US1 Phase 3 complete (GuestPlanner.jsx must exist before adding PDF to it)
- **US3 (Phase 5)**: Independent after Phase 2 — no dependency on US1 or US2
- **Polish (Phase 6)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2
- **US2 (P2)**: Depends on US1 (PDF is added to GuestPlanner.jsx which US1 creates)
- **US3 (P3)**: Unblocked after Phase 2 — touches only Landing.jsx, no dependency on US1 or US2

### Within Each Phase

- **Phase 2**: T002 and T003 can run in parallel; T004 depends on T002
- **Phase 3**: T005 sequential first; T006, T007, T008 can run in parallel after T005; T009 depends on T006+T007; T010 depends on T009
- **Phase 4**: T011 depends only on T005 (GuestPlanner.jsx existing)
- **Phase 5**: T012 independent (different file)
- **Phase 6**: T013 and T014 run after all stories; T014 must be last

---

## Parallel Execution Examples

### Phase 2 — Foundation

```text
Parallel start:
  Task A: T002 — Add GET /api/plants/public route (backend/src/routes/plants.js)
  Task B: T003 — Null-safe user guard (frontend/src/components/AppLayout.jsx)

Then sequentially:
  Task C: T004 — Backend tests for GET /api/plants/public (depends on T002)
```

### Phase 3 — User Story 1

```text
Sequentially:
  T005 — Create GuestPlanner.jsx skeleton (frontend/src/pages/GuestPlanner.jsx)

Parallel after T005:
  Task A: T006 — Grid rendering (frontend/src/pages/GuestPlanner.jsx)
  Task B: T007 — Plant picker with useQuery (frontend/src/pages/GuestPlanner.jsx)
  Task C: T008 — /planner route (frontend/src/App.jsx)

Then sequentially:
  T009 — "Sign up to save" + sessionStorage (depends on T006, T007)
  T010 — Signup.jsx carry-over (depends on T009)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Baseline verification
2. Complete Phase 2: Foundational (T002, T003, T004)
3. Complete Phase 3: US1 — bed design + sign-up carry-over (T005–T010)
4. **STOP and VALIDATE**: Can a guest design a bed, sign up, and find it saved?
5. Ship MVP: guests can plan and convert to registered users

### Incremental Delivery

1. Phases 1–2 → Foundation ready
2. Phase 3 (US1) → Guest can design and sign up → **Demo: "Design a bed without an account"**
3. Phase 4 (US2) → PDF download → **Demo: "Download your plan"**
4. Phase 5 (US3) → Landing page CTA → **Demo: "Full guest funnel from landing page"**
5. Phase 6 → Polish, validation, final test pass

---

## Notes

- `[P]` tasks in Phase 3 (T006, T007, T008) all touch `GuestPlanner.jsx` or different files — T006/T007 both modify `GuestPlanner.jsx` so must be done carefully if parallelised (implement in the same working session or coordinate to avoid conflicts); T008 touches `App.jsx` only and is fully independent
- The `GardenPrintView` component requires no modification — it accepts guest data via props unchanged
- `sessionStorage` is tab-scoped and automatically cleared on tab close — no manual cleanup needed beyond the explicit `removeItem` after successful bed save
- US3 (T012) can be worked on independently at any point after Phase 2 — it only touches `Landing.jsx`
