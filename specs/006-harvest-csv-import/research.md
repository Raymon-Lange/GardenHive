# Research: Harvest CSV Import

**Branch**: `006-harvest-csv-import`
**Date**: 2026-02-25

---

## Decision 1 — CSV Parsing Library

**Decision**: Use `csv-parse` v5 (from the `csv` monorepo, `npm install csv-parse`)

**Rationale**:
- Only candidate with first-party native ESM support (ships with both CJS and ESM entry points) — important because the root `package.json` uses `"type": "module"` for Playwright
- **However**: the backend is CommonJS (`require`/`module.exports`) with no `"type": "module"` — `csv-parse` works equally well in CJS via `const { parse } = require('csv-parse')`
- Transform-stream based → pipes cleanly from Multer's `req.file.buffer` using `Readable.from(buffer).pipe(parser)`
- Per-row error recovery is best-in-class: `skip_records_with_error: true` + an `error` event handler lets you collect per-row failures without aborting the upload
- Most maintained and highest backend download count (~13M/week) of all CSV libraries
- The `/sync` entry point (`require('csv-parse/sync')`) is usable for the 500-row max file size (trivial memory footprint)

**Alternatives considered**:
- `papaparse`: UMD bundle only, browser-first, no native Node.js stream support, maintenance is slowing — eliminated
- `fast-csv`: CJS only, requires `createRequire` shim in ESM, weaker per-row error recovery — eliminated

**Integration pattern** (CJS backend):
```js
const { parse } = require('csv-parse/sync');
const records = parse(req.file.buffer, {
  columns: true,           // use header row as keys
  skip_empty_lines: true,
  trim: true,
});
// records is an array of { 'Plant Name': '...', Date: '...', 'Quantity (oz)': '...' }
```
The sync API is appropriate here — 500 rows is microseconds, and synchronous code is simpler to reason about for route handlers.

---

## Decision 2 — Plant Name Fuzzy Matching

**Decision**: Inline Levenshtein distance function — no external dependency

**Rationale**:
- The plant library is small (~44 system plants + user custom plants, ≤200 total)
- Levenshtein edit distance correctly handles every realistic typo: `"Tomatoe"` (dist 1 from `"Tomato"`), `"carott"` (dist 2 from `"Carrot"`), `"cucmber"` (dist 2 from `"Cucumber"`)
- The full algorithm is 15 lines of JS, runs in <1ms for 200 names, and has zero maintenance surface
- A `maxDistance` cap of 3 prevents nonsense suggestions for completely unrecognised names
- Keeps the dependency count minimal (aligns with the constitution's YAGNI principle)
- Case-insensitive comparison handled by `toLowerCase()` before matching (aligns with FR-004)

**Alternatives considered**:
- `fuse.js` v7: Excellent quality, actively maintained, dual CJS/ESM — good choice if the feature later needs ranked multi-result UI or full-text search. Overkill for a single best-match suggestion against 200 items
- `fast-fuzzy`: Good match quality, but no commits since 2022 — maintenance risk
- `fastest-levenshtein`: WASM-based, zero transitive deps, but adds a binary dependency when inline JS is sufficient

**Implementation** (to live in `backend/src/utils/fuzzyMatch.js`):
```js
function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i-1] === b[j-1]
        ? prev[j-1]
        : 1 + Math.min(prev[j], curr[j-1], prev[j-1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function findClosestPlant(input, plants, maxDistance = 3) {
  const norm = input.trim().toLowerCase();
  let best = null, bestDist = Infinity;
  for (const plant of plants) {
    const d = levenshtein(norm, plant.name.toLowerCase());
    if (d < bestDist) { bestDist = d; best = plant; }
  }
  return (best && bestDist <= maxDistance) ? { plant: best, distance: bestDist } : null;
}
module.exports = { findClosestPlant };
```

---

## Decision 3 — Two-Digit Year Interpretation

**Decision**: Interpret `MM/DD/YY` two-digit years as 2000–2099

**Rationale**:
- GardenHive tracks home garden harvests — users will not be entering historical harvests from the 1900s
- `01/15/24` → `2024-01-15` is the only sensible interpretation
- Implemented via: `year < 100 ? 2000 + year : year` after parsing

---

## Decision 4 — File Upload Handling

**Decision**: Use the existing `multer` middleware (already in the stack) with `memoryStorage()`

**Rationale**:
- CSV files ≤1MB do not need disk storage — buffering in memory is appropriate
- `multer` is already installed and configured; adding a new instance for the import route requires no new dependency
- `req.file.buffer` is passed directly to `csv-parse/sync` — clean, no temp files to clean up
- File type validation: check `req.file.mimetype` and file extension before parsing

---

## Decision 5 — Import API Design (Two-Step Flow)

**Decision**: Two separate endpoints — preview then bulk-create

| Step | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /api/harvests/import` | Parse CSV, validate, match plants → return preview (no DB writes) |
| 2 | `POST /api/harvests/bulk` | Accept resolved payload → create harvest records |

**Rationale**:
- Separating preview from commit allows the frontend to show the resolution UI for unmatched names without a partially-committed state in the database
- Both endpoints are RESTful nouns (`import` = the import resource; `bulk` = batch create)
- The template download is a `GET /api/harvests/template` — "template" is a noun representing a downloadable resource
- Aligns with the constitution's REST-first principle (no verb-in-URL)
