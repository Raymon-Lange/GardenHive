# Tasks: Harvest CSV Import

**Input**: Design documents from `/specs/006-harvest-csv-import/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅, contracts/api.md ✅

**Tests**: Included in Polish phase — required by the project constitution (Principle VI) for all new route files.

**Organization**: Tasks grouped by user story (P1 → P2) to enable independent delivery of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Exact file paths included in every description

## Path Conventions

- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Tests: `backend/src/__tests__/`

---

## Phase 1: Setup

**Purpose**: Install the one new dependency before any implementation begins.

- [X] T001 Install `csv-parse` in the backend — run `npm install csv-parse` inside `backend/` and confirm `csv-parse` appears in `backend/package.json` dependencies

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: The fuzzy-match utility is used by the import endpoint (US2) and the resolver UI (US3). It must exist before either story can be implemented.

**⚠️ CRITICAL**: US2 and US3 cannot be implemented until this phase is complete.

- [X] T002 Create `backend/src/utils/fuzzyMatch.js` — export `findClosestPlant(input, plants, maxDistance = 3)` using a two-row Levenshtein DP (space-efficient); normalise both strings with `toLowerCase()` before comparing; return `{ plant, distance }` where `plant` is the full plant document with the lowest edit distance, or `null` if no plant is within `maxDistance`; use `module.exports = { findClosestPlant }`

**Checkpoint**: Foundation ready — US1 can start immediately; US2 and US3 are unblocked.

---

## Phase 3: User Story 1 — Template Download (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can download a pre-formatted CSV template directly from the Harvests page.

**Independent Test**: `GET /api/harvests/template` with a valid Bearer token returns a 200 with `Content-Type: text/csv`, a `Content-Disposition: attachment` header, a header row of `Plant Name,Date,Quantity (oz)`, and one example data row.

- [X] T003 [P] [US1] Add `GET /api/harvests/template` route to `backend/src/routes/harvests.js` — protected by existing `requireAuth` middleware; set `res.setHeader('Content-Type', 'text/csv')` and `res.setHeader('Content-Disposition', 'attachment; filename="harvest-template.csv"')`; respond with the string `"Plant Name,Date,Quantity (oz)\nTomato,06/15/2025,8\n"`

- [X] T004 [P] [US1] Add "Download template" button/link to `frontend/src/pages/Harvests.jsx` — call `GET /api/harvests/template` via the `api` Axios instance with `{ responseType: 'blob' }`; create an object URL from the blob, trigger a programmatic click on a temporary `<a>` element with `download="harvest-template.csv"`, then revoke the URL; place the button near the "Log harvest" form header

**Checkpoint**: US1 complete — template download works independently and is testable with a logged-in browser session.

---

## Phase 4: User Story 2 — Upload & Import (Priority: P1)

**Goal**: Authenticated users can upload a filled CSV, see a preview of matched rows and any errors, and confirm the import to create all valid harvest records.

**Independent Test**: Upload a CSV where all plant names match the library (case-insensitively), click "Confirm import" — all rows appear in the Harvests list and a success toast shows the correct imported count. No unmatched rows appear (that is US3 scope).

- [X] T005 [US2] Add `POST /api/harvests/import` route to `backend/src/routes/harvests.js` — use `multer({ storage: multer.memoryStorage(), limits: { fileSize: 1_000_000 } }).single('file')` middleware; reject non-CSV mimetypes/extensions with `400 { error: 'Only CSV files are accepted' }`; parse with `require('csv-parse/sync').parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true })`; return 400 if required columns (`Plant Name`, `Date`, `Quantity (oz)`) are missing; for each row: (1) validate `Plant Name` not blank → ErrorRow, (2) parse and validate `Date` against `MM/DD/YYYY` and `MM/DD/YY` only (two-digit years → `2000 + yy`) using `Date.UTC` → ErrorRow if invalid, (3) validate `Quantity (oz)` is a positive number → ErrorRow if invalid, (4) case-insensitive exact match against all plants accessible to `req.userId` (system + own custom) → MatchedRow if found, (5) call `findClosestPlant` from `backend/src/utils/fuzzyMatch.js` → UnmatchedRow with `suggestion` (or `null`); return `{ totalRows, matched, unmatched, errors }`

- [X] T006 [US2] Add `POST /api/harvests/bulk` route to `backend/src/routes/harvests.js` — protected by `requireAuth`; validate `req.body.rows` is a non-empty array with max 500 items; validate each row has `plantId` (valid ObjectId string), `harvestedAt` (parseable date string), and `quantity` (positive number) — return `400 { error: 'Row N: <reason>' }` on first failure; call `Harvest.insertMany()` mapping each row to `{ userId: req.userId, plantId, harvestedAt, quantity, unit: 'oz' }`; return `201 { imported: N, harvests: [...] }`

- [X] T007 [US2] Create `frontend/src/components/HarvestImportModal.jsx` — modal opened by a boolean prop `isOpen`; Step 1: `<input type="file" accept=".csv">` + upload button; use `useMutation` to call `POST /api/harvests/import` (multipart via `FormData`); show spinner during upload; Step 2: preview table with three sections — matched rows (green, showing plant emoji + name, formatted date, quantity), error rows (red, showing row number + field + reason message), and a placeholder area for unmatched rows (renders `null` at this stage — wired in T010); "Confirm import" button disabled until no unmatched rows remain (always enabled for US2 since unmatched handling is US3); on confirm: call `POST /api/harvests/bulk` with `useMutation`, then `queryClient.invalidateQueries({ queryKey: ['harvests'] })`, show a success toast with `"Imported N harvest(s)"`, and close the modal

- [X] T008 [US2] Add "Import CSV" button to `frontend/src/pages/Harvests.jsx` — import `HarvestImportModal`; add `const [importOpen, setImportOpen] = useState(false)` local state; render `<HarvestImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />`; place the "Import CSV" button next to the "Download template" button added in T004

**Checkpoint**: US2 complete — a fully-matched CSV import works end-to-end. Unmatched plant names are returned in `unmatched[]` but the modal shows no resolution UI yet (US3).

---

## Phase 5: User Story 3 — Unmatched Plant Resolution (Priority: P2)

**Goal**: When the import preview contains unmatched plant names, users can confirm the suggested match, choose a different plant, or skip the row — all before confirming the import.

**Independent Test**: Upload a CSV with `"Tomatoe"` — the modal shows the `PlantMatchResolver` with the suggestion `"Tomato 🍅"`; accepting the suggestion and clicking "Confirm import" creates the harvest record for Tomato.

- [X] T009 [P] [US3] Create `frontend/src/components/PlantMatchResolver.jsx` — accepts props `{ rawName, suggestion, allPlants, onResolve, onSkip }`; render `"'<rawName>' — did you mean <suggestion.plantEmoji> <suggestion.plantName>?"` (or `"No match found for '<rawName>'"` when `suggestion` is `null`); primary action: "Yes, use <suggestion>" button that calls `onResolve(suggestion.plantId)` (hidden when suggestion is null); secondary action: "Choose a different plant" toggle that reveals a `<select>` populated with `allPlants` sorted alphabetically, with an `onChange` that calls `onResolve(selectedPlantId)`; tertiary action: "Skip this row" button that calls `onSkip()`; once resolved or skipped, show a green "✓ Resolved" or grey "Skipped" indicator instead of the buttons

- [X] T010 [US3] Extend `frontend/src/components/HarvestImportModal.jsx` to integrate `PlantMatchResolver` — import `PlantMatchResolver`; add a `resolvedMap` state (`useState({})`) keyed by row number, storing `{ plantId }` for resolved rows and `{ skipped: true }` for skipped rows; render a `PlantMatchResolver` for each entry in `unmatched[]`, passing the full `allPlants` list (fetched via `useQuery(['plants'])`) and callbacks that update `resolvedMap`; disable the "Confirm import" button until `unmatched.length === Object.keys(resolvedMap).length` (all rows resolved or skipped); when building the bulk payload, merge `matched[]` rows with non-skipped resolved rows from `resolvedMap`, substituting the user-chosen `plantId` for the resolved plant

**Checkpoint**: US3 complete — the full import flow works end-to-end including typo resolution, override, and skip.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Backend Jest tests covering all 12 cases from `plan.md`. Required by the project constitution (Principle VI).

- [X] T011 Write `backend/src/__tests__/harvestImport.test.js` with the following 12 test cases using Jest + Supertest + `mongodb-memory-server`: (1) `GET /api/harvests/template` → 200, CSV with correct headers and example row; (2) `POST /api/harvests/import` valid CSV all plant names match → 200, `matched` array populated, `unmatched` and `errors` empty; (3) `POST /api/harvests/import` plant name is same as library but different case (`"tomato"` vs `"Tomato"`) → matched (not unmatched); (4) `POST /api/harvests/import` plant name is a typo (`"Tomatoe"`) → `unmatched[0].rawName === "Tomatoe"`, `suggestion.plantName === "Tomato"`; (5) `POST /api/harvests/import` date is `YYYY-MM-DD` → `errors[0].field === "date"`; (6) `POST /api/harvests/import` quantity is `"abc"` → `errors[0].field === "quantity"`; (7) `POST /api/harvests/import` file is not CSV → 400; (8) `POST /api/harvests/import` CSV missing `Quantity (oz)` column → 400; (9) `POST /api/harvests/import` no auth token → 401; (10) `POST /api/harvests/bulk` valid payload → 201, `imported` count matches, harvests have `unit: "oz"`; (11) `POST /api/harvests/bulk` `rows: []` → 400; (12) `POST /api/harvests/bulk` no auth token → 401

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001 complete — BLOCKS US2 and US3
- **US1 (Phase 3)**: Depends on Phase 1 only — unblocked immediately after T001; T003 and T004 run in parallel
- **US2 (Phase 4)**: Depends on Phase 2 complete — T005 → T006 → T007 → T008 sequentially
- **US3 (Phase 5)**: Depends on Phase 4 complete — T009 and T010 run sequentially (T010 extends T007's file)
- **Polish (Phase 6)**: Depends on all backend endpoints complete (T003, T005, T006)

### User Story Dependencies

- **US1 (P1)**: Independent — only needs `requireAuth` (already exists)
- **US2 (P1)**: Needs T002 (fuzzyMatch utility) — otherwise independent of US1
- **US3 (P2)**: Depends on US2's `HarvestImportModal` component (T007) — extends it in T010

### Within Each Phase

- **Phase 3**: T003 (backend) and T004 (frontend) are in different files — fully parallel
- **Phase 4**: T005 → T006 (same file, sequential) then T007 (new file) then T008 (extends T004's file)
- **Phase 5**: T009 (new file) → T010 (extends T007's file)

---

## Parallel Execution Examples

### Phase 3 — US1 (after T001 + T002)

```text
Parallel start:
  Task A: T003 — GET /api/harvests/template in backend/src/routes/harvests.js
  Task B: T004 — Download button in frontend/src/pages/Harvests.jsx
```

### Phase 4 — US2 (after T002)

```text
Sequential:
  T005 → T006 → T007 → T008
```

### Phase 5 — US3 (after T007)

```text
T009 (new file PlantMatchResolver.jsx) → T010 (extend HarvestImportModal.jsx)
```

---

## Implementation Strategy

### MVP First (US1 only — template download)

1. Complete Phase 1: T001
2. Complete Phase 3: T003 + T004 (parallel)
3. **STOP and VALIDATE**: `GET /api/harvests/template` downloads a valid CSV; button visible on Harvests page
4. Ship MVP: users can get the template

### Incremental Delivery

1. T001 → T002 → Framework ready
2. T003 + T004 → Template download → **Demo: users can download the template**
3. T005 → T006 → T007 → T008 → Full matched import → **Demo: bulk import for exact/case-insensitive matches**
4. T009 → T010 → Unmatched resolution → **Demo: typo recovery flow**
5. T011 → Tests written, backend covered → **Demo: full suite**

---

## Notes

- `findClosestPlant` (T002) takes the full plant documents array so it can return the matched `plantId` and `plantName` directly — no second lookup needed in the route handler
- The `POST /api/harvests/import` endpoint (T005) does **not** write to the database — it is a pure validation + matching step; all DB writes happen in T006's `POST /api/harvests/bulk`
- `HarvestImportModal` (T007) is built for the matched-only case first; T010 extends it for unmatched rows — this keeps each story independently deliverable
- The `allPlants` list in `PlantMatchResolver` (T009) should include both system plants and the user's custom plants, matching what the backend uses for matching
- Two-digit year rule: `MM/DD/YY` where `YY < 100` → `2000 + YY` (e.g., `01/15/24` → `2024-01-15`)
