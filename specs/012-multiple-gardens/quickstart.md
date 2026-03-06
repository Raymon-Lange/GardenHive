# Quickstart: 012-multiple-gardens

## What's changing

Users can now own multiple named garden plans (e.g., "Spring 2026", "Backyard 2025"). Each garden has its own set of beds, dimensions, and map layout. The user's "active" garden is what all the existing pages (Map, Beds, Dashboard) show.

## Running the migration

**Must run before starting backend with new code** (or data will be inconsistent).

```bash
cd backend
node src/seed/migrateToMultiGarden.js
```

This is idempotent — safe to re-run. It:
1. Creates a `Garden` document for each existing owner (using their current gardenName/Width/Height/Image).
2. Sets `user.activeGardenId` to that garden.
3. Assigns `gardenId` on all existing `GardenBed` documents.

## Dev workflow

```bash
# From repo root
docker compose -f docker-compose.dev.yml up -d

# Run migration once
docker compose -f docker-compose.dev.yml exec backend node src/seed/migrateToMultiGarden.js

# Backend tests
cd backend && npm test

# Frontend lint
cd frontend && npm run lint

# E2E tests (after docker stack is up)
npx playwright test
```

## Key query changes

**Before** (beds were all owned by userId):
```js
// Frontend
api.get('/beds')
```

**After** (beds scoped to a garden):
```js
// Frontend — gardenId from GardenContext
api.get(`/beds?gardenId=${currentGardenId}`)
```

The `currentGardenId` comes from `useGarden()`:
```js
const { currentGardenId } = useGarden();
// currentGardenId = active own garden OR shared owner's active garden
```

## Garden switcher

The sidebar now has two switchers:
1. **Own garden switcher** — cycle through your own gardens (only for owners).
2. **Shared garden switcher** — switch between gardens shared with you (existing behaviour, unchanged).

## Creating a new garden

Click "+ New Garden" button (in the own garden switcher or a dedicated Gardens page). A modal appears with three tabs:
- **New** — enter name and optional dimensions.
- **Copy from existing** — select an existing garden to clone beds from.
- **Import CSV** — upload a CSV with bed definitions.

## CSV template

```
Bed Name,Rows,Cols
Front Raised Bed,4,6
Back Vegetable Patch,3,4
Herb Corner,2,3
```

No plant cell assignments in this format (add plants manually after import).
