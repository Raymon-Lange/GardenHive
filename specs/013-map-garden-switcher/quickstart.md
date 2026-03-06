# Quickstart: Garden Map Switcher with Harvest Indicator (013)

## Integration Scenarios

### Scenario 1: Owner with multiple gardens opens the map

1. Owner logs in — `GardenContext` loads their garden list from `GET /api/gardens`.
2. Owner navigates to `/map`.
3. Map header shows a garden selector (`<select>`) listing all their gardens, with the active garden pre-selected.
4. A "Harvest default" badge appears next to the active garden name.
5. The map grid renders beds belonging to the active garden.

### Scenario 2: Owner switches to a different garden via the map selector

1. Owner opens the garden selector dropdown on the map page.
2. Owner picks "Winter Plot".
3. `setCurrentGardenId("winterPlotId")` is called — this calls `PUT /api/auth/me/active-garden` and updates `GardenContext.currentGardenId`.
4. React Query invalidates `['beds', gardenId]` — beds for "Winter Plot" load.
5. The map redraws with Winter Plot's bed layout and plant assignments.
6. The "Harvest default" badge now shows "Winter Plot".

### Scenario 3: Owner records a harvest after switching gardens

1. Owner has switched to "Winter Plot" on the map.
2. Owner navigates to `/harvests`.
3. The harvest bed picker shows only beds belonging to "Winter Plot" (fetched via `GET /api/beds?gardenId=winterPlotId`).
4. Owner selects a bed and records the harvest — the harvest is implicitly attributed to Winter Plot via the bed's `gardenId`.

### Scenario 4: Owner with only one garden

1. Owner has one garden "My Garden".
2. On the map page, no selector dropdown is shown (nothing to switch to).
3. The garden name is displayed with the "Harvest default" badge — purely informational.

## Key Files

| File | Change |
|------|--------|
| `frontend/src/pages/GardenMap.jsx` | Add garden selector to header; show "Harvest default" badge |
| `frontend/src/pages/Harvests.jsx` | Use `currentGardenId` from `GardenContext` to filter bed picker |
