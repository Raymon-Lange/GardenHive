# Contract: Garden Access (Sharing) Routes

**Base path**: `/api/access`
**File**: `backend/src/routes/access.js`
**Auth**: All routes require a valid Bearer token (`requireAuth`).

Errors always return `{ error: "message" }`.

A **GardenAccess** response object (grant record) has this shape:
```json
{
  "_id": "...",
  "ownerId": "...",
  "granteeEmail": "alice@example.com",
  "granteeId": "..." | null,
  "permission": "analytics" | "harvests_analytics" | "full",
  "status": "pending" | "active",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## GET /api/access

Return all garden access grants issued by the current user (gardens they own).

**Auth**: Bearer token required

**Response**: Array of GardenAccess grant objects, sorted by `createdAt` descending.
Includes both `pending` and `active` grants.

| Status | Body | Condition |
|---|---|---|
| 200 | `[GardenAccess, ...]` | Success (empty array if none) |
| 401 | auth error | |
| 500 | `{ error: message }` | |

---

## GET /api/access/shared

Return all gardens the current user has been granted access to (as grantee).

**Auth**: Bearer token required

**Response**: Array of shared garden summaries (only `active` grants).

```json
[
  {
    "ownerId": "...",
    "ownerName": "Bob",
    "ownerEmail": "bob@example.com",
    "gardenName": "Bob's Kitchen Garden" | null,
    "gardenImage": "/uploads/..." | null,
    "permission": "full"
  }
]
```

| Status | Body | Condition |
|---|---|---|
| 200 | `[SharedGarden, ...]` | Success (empty array if no active grants) |
| 401 | auth error | |
| 500 | `{ error: message }` | |

---

## POST /api/access

Invite someone to access the current user's garden.

**Auth**: Bearer token required

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | The invitee's email address |
| `permission` | string | yes | `analytics`, `harvests_analytics`, or `full` |

**Behaviour**:
- Email is normalised to lowercase and trimmed before storage.
- If the email belongs to a registered user → grant is created as `status: active`
  with `granteeId` populated immediately.
- If the email is not registered → grant is created as `status: pending` with
  `granteeId: null`. Activates automatically when the invitee registers.
- Self-invite (owner's own email) is rejected.
- Duplicate invite (same `ownerId` + `granteeEmail`) is rejected with 409.

**Response**: Newly created GardenAccess grant object.

| Status | Body | Condition |
|---|---|---|
| 201 | `GardenAccess` | Invite created |
| 400 | `{ error: "email and permission are required" }` | Missing fields |
| 400 | `{ error: "Invalid permission value" }` | Unknown permission string |
| 400 | `{ error: "You cannot invite yourself" }` | Self-invite |
| 401 | auth error | |
| 409 | `{ error: "This person already has access" }` | Duplicate invite |
| 500 | `{ error: message }` | |

---

## PUT /api/access/:id

Update the permission level of an existing grant. The current user must be the grant owner.

**Auth**: Bearer token required

**Path params**: `id` — ObjectId of the GardenAccess grant

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `permission` | string | yes | `analytics`, `harvests_analytics`, or `full` |

**Response**: Updated GardenAccess grant object.

| Status | Body | Condition |
|---|---|---|
| 200 | `GardenAccess` | Updated |
| 400 | `{ error: "Invalid permission value" }` | Unknown permission string |
| 401 | auth error | |
| 404 | `{ error: "Grant not found" }` | Not found or not owned by current user |
| 500 | `{ error: message }` | |

---

## DELETE /api/access/:id

Revoke a garden access grant. The current user must be the grant owner.

**Auth**: Bearer token required

**Path params**: `id` — ObjectId of the GardenAccess grant

**Side effect**: The grantee immediately loses access to the garden. Their
existing actions (e.g., logged harvests) remain in the database.

| Status | Body | Condition |
|---|---|---|
| 200 | `{ message: "Access revoked" }` | Revoked |
| 401 | auth error | |
| 404 | `{ error: "Grant not found" }` | Not found or not owned by current user |
| 500 | `{ error: message }` | |
