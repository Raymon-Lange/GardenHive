# Research: 012-multiple-gardens

## Decision 1: Garden as a first-class model vs. staying on User

**Decision**: Introduce a new `Garden` Mongoose model, separate from `User`.

**Rationale**: The current schema stores garden metadata (`gardenName`, `gardenWidth`, `gardenHeight`, `gardenImage`) directly on `User`, which makes it impossible to support more than one garden per owner. Moving to a `Garden` document is the minimal-change path: every other model (`GardenBed`, `Harvest`) already uses a `userId` index, so adding a parallel `gardenId` field is additive.

**Alternatives considered**:
- Embed gardens as a `gardens: []` sub-array on User — rejected because sub-arrays make querying/populating beds per-garden awkward and can grow unbounded.
- Rename the existing User garden fields per year (e.g., `gardenName_2025`) — obviously non-starter.

---

## Decision 2: GardenBed association — `gardenId` field vs. nested resource route

**Decision**: Add `gardenId: ObjectId (ref Garden, required)` to `GardenBed`. Pass `gardenId` as a required query param on `/api/beds`.

**Rationale**: Changing the URL from `/api/beds` to `/api/gardens/:gardenId/beds` would require updating every frontend call site and every test. Adding `gardenId` to the query string (`GET /api/beds?gardenId=xxx`) preserves the existing route shape while adding per-garden scoping. YAGNI and constitution §VII both favour the smaller change.

**Alternatives considered**:
- Nested route `/api/gardens/:gardenId/beds` — clean REST but a large refactor of existing code with no user benefit vs. query-param approach.
- Keep beds keyed by `userId` only and rely on `Garden` to list its beds — requires a new denormalised list field on Garden that must stay in sync.

---

## Decision 3: activeGardenId — User field vs. localStorage only

**Decision**: Store `activeGardenId` on the `User` document. Mirror current active garden's `name`, `width`, `height`, `image` into the auth `userPayload()` response so the existing `gh_user` localStorage cache continues working.

**Rationale**: Storing only in `localStorage` risks divergence across devices. Storing on `User` ensures the backend always knows which garden to default to (important for the `PUT /api/auth/me/garden` → `PUT /api/gardens/:id` migration and for populating `userPayload`). The cost is one extra field on User and async population in `userPayload()` — acceptable per constitution §IV (timestamps + explicit types on every model).

**Alternatives considered**:
- localStorage only, always passed as `?gardenId=` — simpler but loses server-side default; helpers accessing shared owner's garden need to know which gardenId to use, requiring an extra round-trip.
- Store `activeGardenId` on `GardenAccess` — inappropriate; the granularity is wrong (access is per-owner not per-garden).

---

## Decision 4: "Create from existing" — shallow vs. deep clone

**Decision**: Deep clone: copy all `GardenBed` documents (including `cells[]` assignments) from the source garden into the new garden. Reset `mapRow`/`mapCol` to null (beds start unplaced in the new garden).

**Rationale**: The primary use-case is "I want the same plant layout for next season, but start with a clean map placement". Cloning cells lets users keep their plant assignments; clearing map positions forces them to re-layout (because a new season's physical layout may differ). Shallow clone (just bed names/sizes) would lose the plant assignments that are usually the most valuable part.

**Alternatives considered**:
- Clone beds only (no cells) — loses plant assignments.
- Clone including map positions — makes sense if the physical garden is identical, but confusing when dimensions change. Clearing positions is the safer default.

---

## Decision 5: CSV import format for gardens

**Decision**: Import a garden's bed structure from a CSV with columns `Bed Name`, `Rows`, `Cols`. Plant cell assignments are out of scope for this feature.

**Rationale**: Matches the existing harvest CSV pattern (simple column set, preview step not needed for beds since there's nothing to fuzzy-match). Plant assignments via CSV would require a complex 2D or wide-format CSV that adds significant complexity for minimal initial value. Can be added in a follow-up feature.

**CSV template**:
```
Bed Name,Rows,Cols
Front Raised Bed,4,6
Back Vegetable Patch,3,4
Herb Corner,2,3
```

**Alternatives considered**:
- Include plant assignments (Bed Name, Rows, Cols, Row, Col, Plant Name) — useful but complex; deferred.
- JSON upload — less user-friendly than CSV for a garden planner audience.

---

## Decision 6: GardenAccess scope — owner-level vs. per-garden

**Decision**: `GardenAccess` stays at owner level (grants access to all of an owner's gardens). Helpers see the owner's `activeGardenId` via the `/api/access/shared` response.

**Rationale**: Per-garden access control adds significant complexity (UI to select which gardens to share, per-garden permission rows). The current use-case (sharing your garden with a helper) is naturally "share everything". YAGNI §VII.

**Alternatives considered**:
- Per-garden `GardenAccess` — deferred to a future feature if needed.

---

## Decision 7: Deprecating User garden fields

**Decision**: Keep `gardenName`, `gardenWidth`, `gardenHeight`, `gardenImage` on the `User` schema (do not remove them) but stop writing to them after migration. The migration script writes their values into Garden documents. `userPayload()` reads from the active Garden, falling back to User fields for un-migrated accounts.

**Rationale**: Removing fields from Mongoose schema causes Mongoose to strip unknown fields from existing documents on the next save, which can silently lose data. Keeping the fields is safe; they'll simply be stale after migration. A future cleanup PR can drop them once the migration has been verified in production.

---

## Decision 8: `PUT /api/auth/me/garden` fate

**Decision**: Deprecate `PUT /api/auth/me/garden` (garden name + dimensions) and `POST/DELETE /api/auth/me/garden-image`. New equivalents: `PUT /api/gardens/:id` and `POST/DELETE /api/gardens/:id/image`. The old routes are kept but forward to the active garden for backward compatibility during transition.

**Rationale**: Avoids breaking the `GardenDimensionsModal.jsx` until that component is updated to use the new routes. Once the frontend is updated, the legacy routes can be removed in a follow-up PR.

**Alternatives considered**:
- Remove the old routes immediately and update all frontend callers in one PR — cleaner but higher risk; parallel changes in a single PR are harder to review.
