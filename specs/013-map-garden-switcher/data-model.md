# Data Model: Garden Map Switcher with Harvest Indicator (013)

## No Schema Changes Required

This feature is entirely frontend-facing. All required data already exists:

| Entity | Relevant Fields | Where Used |
|--------|----------------|------------|
| `Garden` | `_id`, `name`, `gardenWidth`, `gardenHeight`, `userId` | Garden selector list |
| `User` | `activeGardenId` | Persisted active garden; returned on login + GET /api/auth/me |
| `GardenBed` | `gardenId`, `name`, `rows`, `cols` | Bed picker in harvest form (filtered by active garden) |
| `Harvest` | `bedId` (→ GardenBed → gardenId) | Implicitly garden-attributed via bed reference |

## Existing Relationships

```
User
 └── activeGardenId ──► Garden (one active at a time)
 └── has many ──────── Garden (all their plans)

Garden
 └── has many ──────── GardenBed (gardenId field)

GardenBed
 └── has many ──────── Harvest (via bedId)
```

## Why No Harvest Schema Change

A `Harvest` already belongs to a garden indirectly:
`Harvest.bedId → GardenBed.gardenId → Garden`

Filtering harvests or beds by garden is done by querying `GardenBed` with `gardenId`, which `GET /api/beds?gardenId=` already supports. No `gardenId` field needs to be added to `Harvest` for this feature.

## Active Garden State

The active garden is managed in two layers:
1. **Persisted**: `User.activeGardenId` (updated via `PUT /api/auth/me/active-garden`)
2. **Client state**: `GardenContext.currentGardenId` (initialised from `user.activeGardenId` in localStorage, kept in sync by `setCurrentGardenId`)
