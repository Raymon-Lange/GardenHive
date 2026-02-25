# Data Model: Super Admin Stats Dashboard

**Branch**: `007-super-admin-stats`
**Date**: 2026-02-25

---

## Persistent Model Changes

### `User` (modified — additive)

One new field added to the existing schema. No existing fields are changed.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `lastLoginAt` | Date | No | `null` | Timestamp of the user's most recent successful login. `null` when the user has never logged in since this feature was deployed. |

**Change location**: `backend/src/models/User.js` — add inside `userSchema`:

```js
lastLoginAt: { type: Date, default: null },
```

**Migration**: Additive change with `default: null`. All existing User documents remain valid without any migration script — Mongoose reads missing fields as `null` per the default.

**Update trigger**: `POST /api/auth/login` success path — `await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })`.

---

## New Backend Middleware

### `backend/src/middleware/requireSuperAdmin.js`

Not a Mongoose model — an Express middleware module for super-admin authorization.

| Export | Signature | Description |
|---|---|---|
| `requireSuperAdmin` | `async (req, res, next) → void` | Verifies the authenticated user (`req.userId`) is the super admin by DB lookup. Returns 401 if user not found, 403 if not the super admin. Must be composed after `requireAuth`. |

**Hardcoded constant**: `SUPER_ADMIN_EMAIL = 'raymon.lange@gmail.com'` — defined only in this file, never in frontend code.

---

## New Backend Route

### `backend/src/routes/admin.js`

Protected by `requireAuth` + `requireSuperAdmin` on every endpoint.

---

## Transient Shapes (API response only — not persisted)

### `AdminStats` (`GET /api/admin/stats` response)

Platform-wide aggregate counts. Computed on demand; never stored.

| Field | Type | Description |
|---|---|---|
| `totalUsers` | Number | Count of all registered User documents |
| `totalGardens` | Number | Count of all GardenBed documents (each bed = one garden slot; see note) |
| `totalHarvests` | Number | Count of all Harvest documents |

> **Note on "gardens"**: GardenHive has no separate Garden model. The spec uses "gardens created" to refer to GardenBed documents. `totalGardens` is `GardenBed.countDocuments({})`.

### `AdminUserRow` (each element of `GET /api/admin/users` response array)

| Field | Type | Description |
|---|---|---|
| `_id` | String | User ObjectId |
| `name` | String | User's display name |
| `email` | String | User's email address (lowercase-normalised) |
| `createdAt` | String | ISO 8601 account creation timestamp |
| `lastLoginAt` | String \| null | ISO 8601 last login timestamp, or `null` if never logged in since feature deployment |
| `bedCount` | Number | Count of GardenBed documents owned by this user (always ≥ 0) |
| `harvestCount` | Number | Count of Harvest documents logged by this user (always ≥ 0) |

---

## `userPayload()` Change (auth.js)

The `userPayload()` helper in `backend/src/routes/auth.js` gains one derived field. This field is returned in the login response and stored in `localStorage` as part of `gh_user`.

| Field | Type | Derived from | Description |
|---|---|---|---|
| `isSuperAdmin` | Boolean | `user.email === SUPER_ADMIN_EMAIL` | `true` only for `raymon.lange@gmail.com`; `false` for everyone else. Never stored in the User schema — always computed at response time. |

---

## Frontend State Changes

### `AuthContext` (`frontend/src/context/AuthContext.jsx`)

The `user` object in context already mirrors `localStorage gh_user`. Once `userPayload()` includes `isSuperAdmin`, no code change is needed in AuthContext — the field flows through automatically on login/refresh.

**Consumed by**:
- `AdminRoute.jsx` — checks `user.isSuperAdmin` to allow or redirect
- `AppLayout.jsx` — checks `user?.isSuperAdmin` to conditionally render the admin nav link
