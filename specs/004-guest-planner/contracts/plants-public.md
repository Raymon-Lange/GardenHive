# Contract: GET /api/plants/public

**Feature**: `004-guest-planner`
**Auth required**: No

---

## Request

```
GET /api/plants/public
```

No query parameters. No authentication header required.

---

## Response — 200 OK

Returns an array of system plant objects sorted alphabetically by name. Only plants where `ownerId` is `null` are included.

```json
[
  {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "name": "Basil",
    "category": "herb",
    "emoji": "🌿",
    "description": "Sweet basil, great for companion planting with tomatoes.",
    "perSqFt": 4,
    "daysToHarvest": 60,
    "daysToGermination": 7,
    "spacingIn": 6,
    "depthIn": 0.25,
    "ownerId": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

Returns `[]` if no system plants exist.

---

## Response — 500 Internal Server Error

```json
{ "error": "Human-readable error message" }
```

---

## Constraints

- `ownerId` is always `null` in every returned document — no user-created custom plants are ever included.
- No filtering, search, or pagination supported on this endpoint.
- This endpoint is intentionally read-only and exposes no user data.
