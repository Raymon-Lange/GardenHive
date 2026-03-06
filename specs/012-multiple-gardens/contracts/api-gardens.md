# API Contract: `/api/gardens`

All routes require `Authorization: Bearer <token>` (owner only — no helper access to garden management).
Error envelope: `{ error: "Human-readable message" }`.

---

## GET /api/gardens

Returns all gardens belonging to the authenticated user.

**Response 200**
```json
[
  {
    "_id": "664a...",
    "userId": "664b...",
    "name": "Spring 2026",
    "gardenWidth": 20,
    "gardenHeight": 15,
    "gardenImage": "/uploads/garden-abc.jpg",
    "createdAt": "2026-03-01T10:00:00.000Z",
    "updatedAt": "2026-03-01T10:00:00.000Z"
  }
]
```

---

## POST /api/gardens

Create a new garden.

**Request body (method: `new`)**
```json
{
  "name": "Summer 2026",
  "gardenWidth": 20,
  "gardenHeight": 15
}
```

**Request body (method: `existing`)**
```json
{
  "name": "Summer 2026",
  "sourceGardenId": "664a..."
}
```
Clones all beds from the source garden (cells preserved, `mapRow`/`mapCol` reset to null). `sourceGardenId` must belong to the authenticated user.

**Response 201**
```json
{
  "_id": "664c...",
  "userId": "664b...",
  "name": "Summer 2026",
  "gardenWidth": null,
  "gardenHeight": null,
  "gardenImage": null,
  "createdAt": "2026-03-05T10:00:00.000Z",
  "updatedAt": "2026-03-05T10:00:00.000Z"
}
```

**Errors**
- `400` — `name` missing
- `400` — `sourceGardenId` not found or not owned by user
- `400` — `gardenWidth`/`gardenHeight` not positive integers when provided

---

## POST /api/gardens/import

Create a garden from a CSV file defining beds.

**Content-Type**: `multipart/form-data`
**Fields**:
- `file` — CSV file (max 1MB)
- `name` — garden name (string, required)

**CSV format**:
```
Bed Name,Rows,Cols
Front Raised Bed,4,6
Back Vegetable Patch,3,4
```

**Response 201**
```json
{
  "garden": { "_id": "...", "name": "My Imported Garden", ... },
  "bedsCreated": 3
}
```

**Errors**
- `400` — no file uploaded
- `400` — not a CSV file
- `400` — missing required columns: `Bed Name`, `Rows`, `Cols`
- `400` — `name` field missing
- `400` — CSV parse error (malformed file)

---

## PUT /api/gardens/:id

Update a garden's name, dimensions, or reset image.

**Request body** (all fields optional)
```json
{
  "name": "Spring 2027",
  "gardenWidth": 20,
  "gardenHeight": 15
}
```

**Response 200** — updated `Garden` document

**Errors**
- `400` — `gardenWidth`/`gardenHeight` not positive integers
- `400` — reducing dimensions clips existing placed beds
- `403` — garden does not belong to authenticated user
- `404` — garden not found

---

## POST /api/gardens/:id/image

Upload an image for a garden.

**Content-Type**: `multipart/form-data`
**Field**: `image` (image file, max 5MB)

**Response 200** — updated `Garden` document

**Errors**
- `400` — no file
- `400` — not an image

---

## DELETE /api/gardens/:id/image

Remove a garden's image.

**Response 200** — updated `Garden` document (gardenImage: null)

---

## DELETE /api/gardens/:id

Delete a garden and all its beds. Cannot delete the last remaining garden.

**Response 200**
```json
{ "message": "Garden deleted" }
```

**Errors**
- `400` — cannot delete the only remaining garden
- `403` — garden does not belong to authenticated user
- `404` — garden not found

---

## PUT /api/auth/me/active-garden

Set the user's active garden.

**Request body**
```json
{ "gardenId": "664a..." }
```

**Response 200** — updated user payload (same shape as `/api/auth/me`)

**Errors**
- `400` — `gardenId` missing
- `404` — garden not found or not owned by user

---

## Modified: GET /api/beds

Now requires `gardenId` query param (returns `400` if omitted and user has gardens).

```
GET /api/beds?gardenId=664a...
GET /api/beds?gardenId=664a...&ownerId=664b...   (helper access)
```

## Modified: POST /api/beds

Body now requires `gardenId`:
```json
{ "name": "Herb Garden", "rows": 2, "cols": 3, "gardenId": "664a..." }
```

## Modified: /api/access/shared response

Each shared garden object now includes `activeGardenId`:
```json
{
  "ownerId": "...",
  "ownerName": "Alice",
  "gardenName": "Alice's Garden",
  "gardenImage": null,
  "activeGardenId": "664a...",
  "permission": "full"
}
```
