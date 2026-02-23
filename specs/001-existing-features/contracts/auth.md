# Contract: Authentication & Account Routes

**Base path**: `/api/auth`
**File**: `backend/src/routes/auth.js`

All responses use JSON. Errors always return `{ error: "message" }`.
Successful auth responses return `{ token, user }` where `user` is:
```json
{ "id": "...", "name": "...", "email": "...", "role": "owner|helper",
  "gardenName": "...|null", "gardenImage": "/uploads/...|null" }
```

---

## POST /api/auth/register

Create a new account and receive a session token.

**Auth**: None

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Display name |
| `email` | string | yes | Must be unique (case-insensitive) |
| `password` | string | yes | Min 6 characters |
| `role` | string | no | `owner` (default) or `helper` |

**Side effect**: Activates any pending `GardenAccess` records matching this email
(`status: pending` → `active`, `granteeId` populated).

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 201 | `{ token, user }` | Registration successful |
| 400 | `{ error: "Name, email, and password are required" }` | Missing required field |
| 400 | `{ error: "Password must be at least 6 characters" }` | Short password |
| 400 | `{ error: "Role must be owner or helper" }` | Invalid role value |
| 409 | `{ error: "Email already in use" }` | Duplicate email |
| 500 | `{ error: message }` | Unexpected error |

---

## POST /api/auth/login

Authenticate an existing user.

**Auth**: None

**Request body**:

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `password` | string | yes |

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `{ token, user }` | Login successful |
| 400 | `{ error: "Email and password are required" }` | Missing fields |
| 401 | `{ error: "Invalid email or password" }` | Wrong credentials |
| 401 | `{ error: "This account has been deactivated" }` | Helper soft-deleted |
| 500 | `{ error: message }` | Unexpected error |

---

## GET /api/auth/me

Return the current user's profile.

**Auth**: Bearer token required

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `user` object | Success |
| 401 | `{ error: "No token provided" \| "Invalid or expired token" \| "Account is inactive" }` | Auth failure |
| 404 | `{ error: "User not found" }` | Token valid but user deleted |
| 500 | `{ error: message }` | Unexpected error |

---

## PUT /api/auth/me

Update the current user's display name.

**Auth**: Bearer token required

**Request body**:

| Field | Type | Required |
|---|---|---|
| `name` | string | yes |

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `user` object | Updated successfully |
| 400 | `{ error: "Name is required" }` | Empty name |
| 401 | auth error | |
| 404 | `{ error: "User not found" }` | |
| 500 | `{ error: message }` | |

---

## PUT /api/auth/me/password

Change the current user's password.

**Auth**: Bearer token required

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `currentPassword` | string | yes | Must match stored hash |
| `newPassword` | string | yes | Min 6 characters |

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `{ message: "Password updated" }` | Success |
| 400 | `{ error: "currentPassword and newPassword are required" }` | Missing fields |
| 400 | `{ error: "New password must be at least 6 characters" }` | Too short |
| 400 | `{ error: "Current password is incorrect" }` | Wrong current password |
| 401 | auth error | |
| 404 | `{ error: "User not found" }` | |
| 500 | `{ error: message }` | |

---

## DELETE /api/auth/me

Delete (owner) or deactivate (helper) the current account.

**Auth**: Bearer token required

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `password` | string | yes | Confirmation password |

**Side effects**:
- **Owner**: Hard-deletes all `Harvest`, `GardenBed`, `GardenAccess` (as owner
  or grantee), then the `User` document.
- **Helper**: Deletes the helper's `GardenAccess` records; sets `User.active = false`.

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `{ message: "Account deleted" }` | Success |
| 400 | `{ error: "Password is required" }` | Missing field |
| 400 | `{ error: "Incorrect password" }` | Wrong password |
| 401 | auth error | |
| 404 | `{ error: "User not found" }` | |
| 500 | `{ error: message }` | |

---

## POST /api/auth/me/hidden-plants

Toggle a plant in or out of the user's hidden-plants list.

**Auth**: Bearer token required

**Request body**:

| Field | Type | Required |
|---|---|---|
| `plantId` | string (ObjectId) | yes |

**Behaviour**: If `plantId` is not in `hiddenPlants`, it is added.
If it is already there, it is removed (toggle).

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `{ hiddenPlants: [...ObjectId] }` | Success |
| 400 | `{ error: "plantId is required" }` | Missing field |
| 401 | auth error | |
| 404 | `{ error: "User not found" }` | |
| 500 | `{ error: message }` | |

---

## PUT /api/auth/me/garden

Set or clear the current user's garden name.

**Auth**: Bearer token required

**Request body**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `gardenName` | string | no | Omit or send empty string to clear |

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `user` object | Success |
| 401 | auth error | |
| 404 | `{ error: "User not found" }` | |
| 500 | `{ error: message }` | |

---

## POST /api/auth/me/garden-image

Upload a garden cover image. Replaces any existing image.

**Auth**: Bearer token required

**Content-Type**: `multipart/form-data`

**Form field**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `image` | file | yes | Must be `image/*` MIME type; max 5 MB |

**Side effect**: If a previous image exists, its file is deleted from disk before
the new one is stored.

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `user` object (with updated `gardenImage`) | Upload successful |
| 400 | `{ error: "No image file provided" }` | Missing file |
| 400 | `{ error: "Only image files are allowed" }` | Wrong file type (multer) |
| 401 | auth error | |
| 404 | `{ error: "User not found" }` | |
| 500 | `{ error: message }` | |

---

## DELETE /api/auth/me/garden-image

Remove the current user's garden cover image.

**Auth**: Bearer token required

**Side effect**: Deletes the image file from disk (if it exists).

**Responses**:

| Status | Body | Condition |
|---|---|---|
| 200 | `user` object (with `gardenImage: null`) | Success (even if no image existed) |
| 401 | auth error | |
| 404 | `{ error: "User not found" }` | |
| 500 | `{ error: message }` | |

---

## GET /api/health

Health check — verifies the server is running.

**Auth**: None

**Response**:

| Status | Body | Condition |
|---|---|---|
| 200 | `{ status: "ok" }` | Server is up |
