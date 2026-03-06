# API Contracts: Garden Map Switcher with Harvest Indicator (013)

## No New Endpoints

This feature introduces no new backend routes. All required data is already available via existing endpoints.

## Existing Endpoints Used

### GET /api/gardens
Returns all garden plans belonging to the authenticated owner, sorted by creation date.

**Used by**: Garden selector on the map page (via `GardenContext.gardens`).

**Response shape** (unchanged):
```json
[
  { "_id": "...", "name": "Spring 2025", "gardenWidth": 10, "gardenHeight": 8, "createdAt": "..." },
  { "_id": "...", "name": "Winter Plot", "gardenWidth": 6, "gardenHeight": 4, "createdAt": "..." }
]
```

---

### PUT /api/auth/me/active-garden
Sets the owner's active garden. Called when the user selects a different garden from the map selector.

**Used by**: `GardenContext.setCurrentGardenId`.

**Request body** (unchanged):
```json
{ "gardenId": "<ObjectId>" }
```

**Response** (unchanged): full user payload including updated `activeGardenId`.

---

### GET /api/beds?gardenId=:id
Returns all beds belonging to the given garden (scoped to the authenticated user/owner).

**Used by**: Harvest form bed picker — now called with `currentGardenId` so only the active garden's beds appear.

**Already requires** `gardenId` query param (enforced since feature 012).

---

### GET /api/auth/me
Returns current user including `activeGardenId`. Used to initialise `GardenContext` on page load.

**No changes.**
