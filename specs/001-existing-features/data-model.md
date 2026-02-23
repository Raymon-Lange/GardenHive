# Data Model: GardenHive — Existing Application Baseline

**Phase**: 1 — Entity schemas
**Branch**: `001-existing-features`
**Date**: 2026-02-23

All entities map directly to existing Mongoose models in `backend/src/models/`.
Field types, constraints, and relationships are sourced from the schema definitions.

---

## Entity Overview

```
User ──< GardenBed ──< Cell >── Plant
 │                               │
 │         GardenAccess >────────┘ (system or custom)
 │              │
 └── (owner) ──┘ (grantee)
 │
 └──< Harvest >── Plant
```

---

## User

**Collection**: `users`
**File**: `backend/src/models/User.js`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | MongoDB document ID |
| `name` | String | required, trim | Display name |
| `email` | String | required, unique, lowercase, trim | Login identifier |
| `passwordHash` | String | required | bcrypt hash; NEVER returned in API responses |
| `role` | String | enum: `owner`, `helper`; default: `owner` | Determines deletion behaviour |
| `active` | Boolean | default: `true` | `false` = soft-deleted helper |
| `hiddenPlants` | ObjectId[] | ref: Plant | Plants excluded from this user's picker |
| `gardenName` | String | optional, trim | Displayed in nav and garden switcher |
| `gardenImage` | String | optional | Path string: `/uploads/{filename}` |
| `createdAt` | Date | auto (timestamps) | |
| `updatedAt` | Date | auto (timestamps) | |

**Methods**:
- `user.comparePassword(plain)` → Promise\<Boolean\>

**Indexes**: unique index on `email`

**API projection**: `userPayload()` returns `{ id, name, email, role, gardenName, gardenImage }`.
`passwordHash` is always excluded.

---

## GardenBed

**Collection**: `gardenbeds`
**File**: `backend/src/models/GardenBed.js`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `userId` | ObjectId | ref: User, required, indexed | Owner of this bed |
| `name` | String | required, trim | Display name |
| `rows` | Number | required, min: 1, max: 50 | Grid height |
| `cols` | Number | required, min: 1, max: 50 | Grid width |
| `cells` | Cell[] | see sub-schema | Sparse: only non-empty cells stored |
| `mapRow` | Number | default: null | Top-left row on the garden map canvas |
| `mapCol` | Number | default: null | Top-left column on the garden map canvas |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

### Cell Sub-Document

Embedded in `GardenBed.cells`. No `_id` field (`{ _id: false }`).
Addressed by `(row, col)` position, not by ID.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `row` | Number | required | 0-based row index |
| `col` | Number | required | 0-based column index |
| `plantId` | ObjectId | ref: Plant; default: null | The assigned plant |

**Storage rule**: Only cells with `plantId !== null` are stored in the array.
Clearing a cell removes its element from the array entirely.

---

## Plant

**Collection**: `plants`
**File**: `backend/src/models/Plant.js`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `name` | String | required, trim | Common name |
| `category` | String | enum: `vegetable`, `fruit`, `herb`, `flower`; default: `vegetable` | |
| `perSqFt` | Number | default: 1 | Square-foot gardening density (plants per sq ft) |
| `daysToHarvest` | Number | optional | Expected days from transplant to harvest |
| `daysToGermination` | Number | optional | Expected days from seed to sprout |
| `spacingIn` | Number | optional | Recommended plant spacing (inches) |
| `depthIn` | Number | optional | Recommended planting depth (inches) |
| `description` | String | optional | Free-form growing notes |
| `emoji` | String | default: `🌱` | Single emoji for visual identification |
| `ownerId` | ObjectId | ref: User; default: null | `null` = system plant; ObjectId = custom plant |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**System vs. Custom**:
- `ownerId: null` → system plant, visible to all users
- `ownerId: ObjectId` → custom plant, visible only within that owner's garden

**Deletion guards** (enforced in `DELETE /api/plants/:id`):
1. Plant must not be referenced in any `GardenBed.cells.plantId`
2. Plant must not be referenced in any `Harvest.plantId`

**Editable fields** (via `PUT /api/plants/:id`):
`name`, `category`, `emoji`, `description`, `perSqFt`, `daysToHarvest`,
`daysToGermination`, `spacingIn`, `depthIn`

---

## Harvest

**Collection**: `harvests`
**File**: `backend/src/models/Harvest.js`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `userId` | ObjectId | ref: User, required, indexed | Garden owner whose data this belongs to |
| `plantId` | ObjectId | ref: Plant, required | What was harvested |
| `bedId` | ObjectId | ref: GardenBed; default: null | Optional: which bed it came from |
| `quantity` | Number | required, min: 0 | Amount harvested |
| `unit` | String | required; enum: `lbs`, `oz`, `kg`, `g`, `count` | Unit of measurement |
| `loggedById` | ObjectId | ref: User; default: null | Who entered the record (may be a helper) |
| `harvestedAt` | Date | default: now | Date of harvest (may be backdated) |
| `season` | String | auto-derived | e.g. `"Spring 2026"` — see derivation below |
| `notes` | String | optional, trim | Free-form notes |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Season derivation** (pre-save hook, applied on every `save()`):

```
month = harvestedAt.getMonth()   // 0-based
month 0–1   → Winter  (Jan, Feb)
month 2–4   → Spring  (Mar, Apr, May)
month 5–7   → Summer  (Jun, Jul, Aug)
month 8–10  → Fall    (Sep, Oct, Nov)
month 11    → Winter  (Dec)

season = "{name} {harvestedAt.getFullYear()}"
```

**Multi-tenancy note**: `userId` is always the garden owner. `loggedById` is the
user who created the record — may differ from `userId` when a helper logs a harvest.

---

## GardenAccess

**Collection**: `gardenaccesses`
**File**: `backend/src/models/GardenAccess.js`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `ownerId` | ObjectId | ref: User, required, indexed | Garden owner granting access |
| `granteeEmail` | String | required, lowercase, trim | Email invited (used to match on registration) |
| `granteeId` | ObjectId | ref: User; default: null | Populated once grantee registers |
| `permission` | String | required; enum: `analytics`, `harvests_analytics`, `full` | Permission level granted |
| `status` | String | enum: `pending`, `active`; default: `pending` | Pending until grantee registers |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**State transitions**:

```
Owner invites email
  └─ grantee has account? → status: active, granteeId: populated
  └─ grantee new?         → status: pending, granteeId: null

Grantee registers with matching email
  └─ GardenAccess.updateMany({ granteeEmail, status: pending }, { granteeId, status: active })
```

**Uniqueness constraint** (enforced in route, not schema index):
One grant per `(ownerId, granteeEmail)` pair. Duplicate invite → 409.

**Self-invite guard**: Route rejects invitations where `granteeEmail === owner.email`.

---

## Relationships Summary

| From | To | Cardinality | Key |
|---|---|---|---|
| User (owner) | GardenBed | 1 : many | `GardenBed.userId` |
| User (owner) | Harvest | 1 : many | `Harvest.userId` |
| User (logger) | Harvest | 1 : many | `Harvest.loggedById` |
| User | Plant (custom) | 1 : many | `Plant.ownerId` |
| User | GardenAccess (owner) | 1 : many | `GardenAccess.ownerId` |
| User | GardenAccess (grantee) | 1 : many | `GardenAccess.granteeId` |
| GardenBed | Cell | 1 : many | embedded `cells[]` |
| Cell | Plant | many : 1 | `Cell.plantId` |
| Harvest | Plant | many : 1 | `Harvest.plantId` |
| Harvest | GardenBed | many : 1 (optional) | `Harvest.bedId` |
| Plant (system) | — | — | `ownerId: null` |
