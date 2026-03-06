# Research: Garden Map Switcher with Harvest Indicator (013)

## Decision 1: Backend changes required?

**Decision**: No backend changes required.

**Rationale**: All necessary data and API endpoints already exist from feature 012-multiple-gardens:
- `GET /api/gardens` — returns the owner's full garden list
- `PUT /api/auth/me/active-garden` — persists the active garden choice
- `GardenContext` already exposes `gardens`, `currentGardenId`, and `setCurrentGardenId` to all pages

**Alternatives considered**: Adding a dedicated `/api/gardens/active` shortcut endpoint — rejected because `GardenContext` already manages this client-side and the active garden ID is already returned in every `GET /api/auth/me` response.

---

## Decision 2: Where does the garden selector live on the map page?

**Decision**: Inline in the GardenMap header, to the right of the "Garden Map" heading. Only shown when the owner has more than one garden.

**Rationale**: The map header already has a two-column layout (title left, action buttons right). A compact `<select>` element or custom dropdown fits naturally in the header row without adding a new visual section. Keeps the selector visible while scrolling is not needed.

**Alternatives considered**:
- Floating overlay on the map canvas — rejected; overlaps bed content and complicates drag interactions.
- Separate panel above the map — rejected; adds vertical space before the grid which degrades map visibility.

---

## Decision 3: What does "harvest default indicator" mean in practice?

**Decision**: Two-part implementation:
1. A small badge/label next to the active garden name on the map page (e.g., "Harvest default") to communicate the link visually.
2. The bed picker in the Harvest recording form filters to show only beds belonging to the active garden, so the "default" is actually enforced in the UI.

**Rationale**: The indicator alone (without the harvest form using it) would be misleading — it would say "harvests go here" but the form would still show all beds across all gardens. Making the harvest form garden-aware is the minimum needed to make the indicator true.

**Alternatives considered**:
- Label only, no harvest form change — rejected; creates a false promise if the harvest form ignores the active garden.
- Add `gardenId` to the Harvest schema — out of scope for this feature; a harvest is already implicitly garden-attributed through `bedId → GardenBed.gardenId`. No schema change is needed to filter the bed picker.

---

## Decision 4: How is the harvest bed picker currently populated?

**Finding**: `Harvests.jsx` fetches ALL beds for the user via `GET /api/beds` without a `gardenId` filter and does not use `GardenContext`. After feature 012, `GET /api/beds` requires a `gardenId` query parameter. This means `Harvests.jsx` currently sends an unfiltered request, which returns a 400 error — beds in the harvest form are already broken in the multi-garden world.

**Decision**: Update `Harvests.jsx` to use `currentGardenId` from `GardenContext` to scope the bed list to the active garden. This fixes the existing breakage AND satisfies the harvest-default requirement.

---

## Decision 5: Should the garden selector on the map also appear on other pages?

**Decision**: Scoped to the Garden Map page only for this feature. The sidebar in AppLayout already serves as the global garden switcher for all pages.

**Rationale**: The spec explicitly asks for the selector "on the Garden Map". Adding it to other pages (Beds list, Harvests) is a separate concern. The sidebar switcher remains the global control.
