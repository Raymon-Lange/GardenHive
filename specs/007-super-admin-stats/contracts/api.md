# API Contracts: Super Admin Stats Dashboard

**Branch**: `007-super-admin-stats`
**Date**: 2026-02-25

All endpoints are mounted on a new `/api/admin` router.
All endpoints require:
1. A valid Bearer JWT token (`Authorization: Bearer <token>`) — enforced by `requireAuth`
2. The authenticated user must be `raymon.lange@gmail.com` — enforced by `requireSuperAdmin`

---

## GET /api/admin/stats

Return platform-wide aggregate counts.

### Request

```
GET /api/admin/stats
Authorization: Bearer <token>
```

No request body.

### Response — 200 OK

```json
{
  "totalUsers": 42,
  "totalGardens": 87,
  "totalHarvests": 1203
}
```

| Field | Type | Description |
|---|---|---|
| `totalUsers` | Number | Count of all registered User documents |
| `totalGardens` | Number | Count of all GardenBed documents across all users |
| `totalHarvests` | Number | Count of all Harvest documents across all users |

### Response — 401 Unauthorized

Returned when no JWT token is provided or the token is invalid/expired.

```json
{ "error": "Unauthorized" }
```

### Response — 403 Forbidden

Returned when a valid authenticated user is not the super admin.

```json
{ "error": "Forbidden" }
```

---

## GET /api/admin/users

Return a report of all registered users with per-user engagement counts.

### Request

```
GET /api/admin/users
Authorization: Bearer <token>
```

No request body.

### Response — 200 OK

Returns an array of user report rows, sorted by `createdAt` descending (newest first).

```json
[
  {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "lastLoginAt": "2026-02-20T14:33:00.000Z",
    "bedCount": 3,
    "harvestCount": 47
  },
  {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e2",
    "name": "Bob Jones",
    "email": "bob@example.com",
    "createdAt": "2026-01-10T08:00:00.000Z",
    "lastLoginAt": null,
    "bedCount": 0,
    "harvestCount": 0
  }
]
```

| Field | Type | Description |
|---|---|---|
| `_id` | String | User ObjectId |
| `name` | String | User's display name |
| `email` | String | User's email address (lowercase-normalised) |
| `createdAt` | String | ISO 8601 account creation timestamp |
| `lastLoginAt` | String \| null | ISO 8601 last login timestamp, or `null` if never logged in since feature deployment |
| `bedCount` | Number | Count of GardenBed documents owned by this user (always ≥ 0, never blank) |
| `harvestCount` | Number | Count of Harvest documents logged by this user (always ≥ 0, never blank) |

### Response — Empty Database

When no users exist, returns an empty array (never 404).

```json
[]
```

### Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

### Response — 403 Forbidden

```json
{ "error": "Forbidden" }
```

---

## Auth Endpoint Change: POST /api/auth/login

The existing login endpoint gains side-effect behaviour (no response shape change).

### Existing Response Shape (unchanged)

```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "name": "Alice",
    "email": "alice@example.com",
    "role": "owner",
    "isSuperAdmin": false,
    "gardenName": "My Garden",
    "gardenImage": null,
    "gardenWidth": 8,
    "gardenHeight": 6
  }
}
```

### New Field in `user` Object

| Field | Type | Description |
|---|---|---|
| `isSuperAdmin` | Boolean | `true` only when `email === 'raymon.lange@gmail.com'`; `false` for all other users |

### Side Effect (no response change)

On every successful login, `User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })` is called after password verification. This does not affect the response body.
