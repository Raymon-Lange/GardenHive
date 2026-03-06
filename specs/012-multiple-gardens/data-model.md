# Data Model: 012-multiple-gardens

## New Model: `Garden`

```js
// backend/src/models/Garden.js
{
  userId:       { type: ObjectId, ref: 'User', required: true, index: true },
  name:         { type: String, required: true, trim: true },    // e.g. "Spring 2026"
  gardenWidth:  { type: Number, min: 1, default: null },
  gardenHeight: { type: Number, min: 1, default: null },
  gardenImage:  { type: String, default: null },                 // /uploads/<filename>
  timestamps:   true
}
```

**Validation rules**:
- `name` required, trimmed, max length not enforced (reasonable user input).
- `gardenWidth` and `gardenHeight` must be positive integers when set; can be null (means "not configured yet").
- `gardenImage` is a path string managed by multer, not a URL (stored as `/uploads/garden-xxx.jpg`).

**Indexes**: `userId` (for listing a user's gardens efficiently).

---

## Modified Model: `GardenBed`

Add one field:
```js
gardenId: { type: ObjectId, ref: 'Garden', required: true, index: true }
```

**After migration**: every `GardenBed` document has a `gardenId` pointing to a `Garden` owned by the same `userId`.

**Compound queries**: beds are now always scoped by `{ userId, gardenId }` — the `userId` check is kept for defence in depth alongside the gardenId scope.

---

## Modified Model: `User`

Add one field:
```js
activeGardenId: { type: ObjectId, ref: 'Garden', default: null }
```

**Semantics**: When null, the backend defaults to the user's first/only garden (for backward compat during migration). After migration, every existing user will have `activeGardenId` set.

**Existing fields kept** (not removed): `gardenName`, `gardenWidth`, `gardenHeight`, `gardenImage` — their values become stale after migration but Mongoose must not strip them (removing from schema causes data loss on next save).

---

## Entity Relationships

```
User (1) ──────< Garden (many)
                   │
                   └──────< GardenBed (many)
                               │
                               └──────< Cell (embedded)
                                           │
                                           └──── Plant (ref)

User (1) ──────< GardenAccess (grants) ──── User (grantee)
          (access is owner-level, covers all gardens of owner)

Harvest (many) ──── User (owner) — not scoped to a Garden (gardens are planning tools; harvests are logs)
```

**Note on Harvest**: Harvests remain keyed by `userId` only, not `gardenId`. A harvest is a record of what you picked; it is not tied to a particular annual plan. The `bedId` reference is sufficient for relating a harvest to a specific planting context.

---

## State Transitions

### Garden lifecycle
```
created → [active] ← → [inactive] → deleted
```
- A garden is "active" when `user.activeGardenId === garden._id`.
- Only one garden is active per user at a time.
- Deleting a garden cascades: all associated `GardenBed` documents are deleted.
- Deleting the active garden → backend sets `activeGardenId` to the most recently created remaining garden, or null if none remain.

### Garden creation methods
```
New (blank)    → Garden + 0 beds
From existing  → Garden + cloned beds (cells copied, mapRow/mapCol reset to null)
From CSV       → Garden + N beds parsed from CSV (cells empty, mapRow/mapCol null)
```

---

## Migration

### Script: `backend/src/seed/migrateToMultiGarden.js`

Idempotent — safe to re-run.

```
For each User where role = 'owner':
  If user.activeGardenId is already set → skip (already migrated)

  Create Garden {
    userId: user._id,
    name: user.gardenName || 'My Garden',
    gardenWidth: user.gardenWidth,
    gardenHeight: user.gardenHeight,
    gardenImage: user.gardenImage,
  }

  Set user.activeGardenId = garden._id
  Save user

  Update all GardenBed { userId: user._id } → set gardenId = garden._id
```

Run with: `node backend/src/seed/migrateToMultiGarden.js`

---

## `userPayload()` update

`auth.js`'s `userPayload()` becomes async and accepts an optional `garden` argument:

```js
// Before
function userPayload(user) { ... }

// After
async function buildUserPayload(user) {
  let garden = null;
  if (user.activeGardenId) {
    garden = await Garden.findById(user.activeGardenId).lean();
  }
  return {
    id:              user._id,
    name:            user.name,
    email:           user.email,
    role:            user.role || 'owner',
    isSuperAdmin:    user.email.toLowerCase() === SUPER_ADMIN_EMAIL,
    activeGardenId:  garden?._id ?? null,
    gardenName:      garden?.name     ?? user.gardenName   ?? null,
    gardenImage:     garden?.gardenImage ?? user.gardenImage ?? null,
    gardenWidth:     garden?.gardenWidth  ?? user.gardenWidth  ?? null,
    gardenHeight:    garden?.gardenHeight ?? user.gardenHeight ?? null,
    recordByBed:     user.recordByBed ?? false,
  };
}
```

All callers (`/register`, `/login`, `/me`, `/me PUT`) await this function.
