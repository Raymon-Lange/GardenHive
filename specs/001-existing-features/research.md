# Research: GardenHive — Existing Application Baseline

**Phase**: 0 — Design decisions & rationale
**Branch**: `001-existing-features`
**Date**: 2026-02-23

This document records the key architectural decisions already made in the
existing codebase, the rationale behind them, and alternatives that were not
taken. All findings are derived from direct source code analysis.

---

## Decision 1: Season Derivation — Computed in Pre-Save Hook

**Decision**: The `season` field on `Harvest` is derived automatically from
`harvestedAt` using a Mongoose pre-save hook. It is stored as a plain string
(e.g. `"Spring 2026"`).

**Logic** (from `models/Harvest.js`):

```
month = harvestedAt.getMonth()  // 0-based
  0,1       → Winter  [Jan, Feb]
  2,3,4     → Spring  [Mar, Apr, May]
  5,6,7     → Summer  [Jun, Jul, Aug]
  8,9,10    → Fall    [Sep, Oct, Nov]
  11        → Winter  [Dec]

season = "{seasonName} {year}"  e.g. "Fall 2025", "Spring 2026"
```

**Rationale**: Storing the derived string avoids re-computing it in every
analytics query. The pre-save hook ensures it is always consistent with
`harvestedAt` without routes needing to know the derivation logic.

**Alternatives considered**:
- Compute at query time via aggregation `$switch` — rejected: requires
  duplicating the month-to-season mapping in every analytics pipeline.
- Store season without year (just `"Spring"`) — rejected: year-over-year
  analytics require distinguishing `"Spring 2025"` from `"Spring 2026"`.

---

## Decision 2: Permission Hierarchy — Ordered Integer Levels

**Decision**: Permissions are represented as strings with a parallel integer
lookup in `middleware/auth.js`. Access checks use numeric comparison
(`LEVELS[access.permission] >= LEVELS[minPermission]`).

```
LEVELS = { analytics: 1, harvests_analytics: 2, full: 3, owner: 4 }
```

**Rationale**: The numeric comparison allows `requireAccess('harvests_analytics')`
to automatically accept `full` or `owner` users without listing all valid levels.
Adding a new permission tier requires only one change (insert into LEVELS and
update the relevant routes).

**Alternatives considered**:
- Role-based set membership check — rejected: doesn't naturally express the
  "at least this level" semantics needed for helper tiers.
- Separate boolean flags per capability — rejected: proliferates flags and
  makes the middleware factory impossible to express cleanly.

---

## Decision 3: Garden Sharing — Invitation-Before-Registration Flow

**Decision**: A `GardenAccess` record is created when the owner invites an
email, regardless of whether that email has an account. If no account exists,
`status: 'pending'` and `granteeId: null`. On registration, `POST /api/auth/register`
runs `GardenAccess.updateMany({ granteeEmail: email, status: 'pending' }, { granteeId, status: 'active' })`.

If the grantee already has an account at invitation time, the grant is
immediately `status: 'active'` with `granteeId` populated.

**Rationale**: Owners can set up their sharing configuration before helpers
join the platform. The helper's first login is frictionless — their access is
already waiting.

**Alternatives considered**:
- Require the grantee to already have an account before inviting — rejected:
  creates a chicken-and-egg friction for new households.
- Separate invitation email flow with accept/decline — rejected: adds scope
  and complexity for a small-scale personal tool.

---

## Decision 4: Plant Ownership — Null Signals System Plant

**Decision**: `Plant.ownerId: null` denotes a system plant shared globally.
`Plant.ownerId: ObjectId` denotes a custom plant owned by that user.

**Rationale**: A single `Plant` collection avoids joins or collection switching.
Filtering `$or: [{ ownerId: null }, { ownerId: effectiveOwnerId }]` returns all
plants available to a given garden in one query.

**Alternatives considered**:
- Separate `SystemPlant` and `CustomPlant` collections — rejected: requires
  union at application level for every plant picker query.
- A boolean `isSystem` flag — rejected: functionally equivalent to null-check
  but adds a redundant field.

---

## Decision 5: Account Deletion — Hard Delete (Owner) vs. Soft Delete (Helper)

**Decision**:
- **Owner deletion**: Cascade hard-deletes `User`, all `GardenBed`, all
  `Harvest`, and all `GardenAccess` records (as owner or grantee).
- **Helper deletion**: Sets `User.active = false` and deletes their
  `GardenAccess` records. The `User` document remains for audit / data
  integrity (harvests logged by the helper remain attributed).

**Rationale**: Owner deletion removes personal garden data the user owns.
Helper deletion preserves harvest records that belong to the garden owner's
dataset — deleting them would corrupt the owner's analytics history.

**Alternatives considered**:
- Full hard delete for helpers too — rejected: would corrupt harvest history
  (harvests have `loggedById` referencing the helper).
- Never delete any User — rejected: violates user expectation of account removal.

---

## Decision 6: Garden Bed Cells — Sparse Array with No `_id`

**Decision**: `GardenBed.cells` is an array of `{ row, col, plantId }` sub-
documents defined with `{ _id: false }`. Only non-empty cells are stored (null
cells are removed from the array). Assignment sets or replaces; clearing removes
the element.

**Rationale**: A 50×50 bed has 2,500 possible cells. Storing only assigned
cells keeps documents small. The `_id: false` prevents Mongoose from adding
unnecessary `ObjectId`s to each cell since cells are addressed by `(row, col)`,
not by document ID.

**Alternatives considered**:
- Full 2D matrix stored on every save — rejected: wastes storage for sparse
  garden plans (most cells empty).
- Separate `Cell` collection — rejected: over-normalises what is essentially
  a sub-field of a single document; requires extra joins for every bed read.

---

## Decision 7: Custom Plant Deletion Guards — Dual Guard

**Decision**: `DELETE /api/plants/:id` checks two collections before deleting:
1. `GardenBed.findOne({ 'cells.plantId': id })` — plant in use in any bed
2. `Harvest.findOne({ plantId: id })` — plant has harvest records

Either guard blocks deletion with a 400 error.

**Rationale**: Deleting a plant that has harvest records would break analytics
(plant name lookup would fail). Deleting one in a bed would leave orphaned cell
references. The dual check prevents both classes of data corruption.

**Alternatives considered**:
- Cascade delete (remove from beds + harvests) — rejected: silently destroys
  user data they may still want.
- Soft-delete plants — rejected: adds complexity; plants aren't shared across
  users and hiding already serves the use case of "get it out of my picker".

---

## Decision 8: Multi-Tenancy Via `?ownerId=` Query Param

**Decision**: When a helper views a shared garden, every API call appends
`?ownerId={ownerId}` via the Axios request interceptor. The `requireAccess()`
middleware reads this param, verifies the helper's access grant, and sets
`req.gardenOwnerId` for all downstream route logic.

**Rationale**: This keeps all garden-scoping logic in one place (middleware)
rather than requiring every route to handle "am I looking at my own garden or
someone else's?". The frontend interceptor sets it transparently so individual
API calls don't need to know.

**Alternatives considered**:
- Include `ownerId` in request body — rejected: doesn't work for GET requests;
  body is inappropriate for read operations.
- Separate endpoints per role (`/api/shared-beds/:ownerId/...`) — rejected:
  duplicates routing logic; the permission abstraction makes this unnecessary.

---

## Summary of Key Constants

| Constant | Value | Location |
|---|---|---|
| JWT expiry | 7 days | `routes/auth.js` `signToken()` |
| bcrypt rounds | 12 (prod), 1 (test) | `routes/auth.js`, `__tests__/helpers.js` |
| Max bed dimension | 50 × 50 cells | `models/GardenBed.js` schema + capped in route |
| Image size limit | 5 MB | `routes/auth.js` multer config |
| Image types | `image/*` MIME only | `routes/auth.js` multer fileFilter |
| Default harvest unit | (none — required) | `models/Harvest.js` |
| Default page limit | 50 harvests | `routes/harvests.js` GET / |
| Rolling monthly window | 12 months | `routes/harvests.js` GET /monthly |
| Analytics permissions | analytics ≥ 1 | `middleware/auth.js` LEVELS |
| Token storage keys | `gh_token`, `gh_user` | `frontend/src/lib/api.js` |
