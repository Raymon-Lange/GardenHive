# Data Model: Garden Layout PDF & Shopping List

**Branch**: `003-garden-pdf`
**Date**: 2026-02-23

---

## Overview

This feature introduces **no new Mongoose models**. The PDF is generated on demand from data already loaded in the Garden Map view. All entities below are derived (computed) from existing stored data.

---

## Existing Models Used (Unchanged)

### GardenBed (`backend/src/models/GardenBed.js`)

Provides the data for both PDF pages.

| Field | Type | Role in PDF |
|---|---|---|
| `name` | String | Bed label on map (page 1) and bed column in shopping list (page 2) |
| `rows` | Number | Grid height in cells — used to draw bed rectangle on page 1 |
| `cols` | Number | Grid width in cells — used to draw bed rectangle on page 1 |
| `mapRow` | Number \| null | Top-left row position in garden grid — placement on page 1 |
| `mapCol` | Number \| null | Top-left col position in garden grid — placement on page 1 |
| `cells[]` | Array | Per-cell plant assignment — used for emoji display (page 1) and shopping list (page 2) |
| `cells[].row` | Number | Cell row within the bed |
| `cells[].col` | Number | Cell column within the bed |
| `cells[].plantId` | Ref → Plant | Populated at query time; provides `emoji` and `name` for display |

### Plant (`backend/src/models/Plant.js`)

Populated via `cells[].plantId` when `GET /beds` is called.

| Field | Type | Role in PDF |
|---|---|---|
| `name` | String | Plant name in shopping list table (page 2) |
| `emoji` | String | Emoji displayed in grid cells (page 1) and shopping list row (page 2) |

### User (via `AuthContext`)

| Field | Type | Role in PDF |
|---|---|---|
| `gardenWidth` | Number | Total garden width in feet — determines grid dimensions on page 1 |
| `gardenHeight` | Number | Total garden height in feet — determines grid dimensions on page 1 |
| `gardenName` | String \| null | Used for the PDF filename and page title |

---

## Derived Entities (Computed at Render Time, Not Stored)

### ShoppingListRow

Computed from the `beds` array. One row per unique `(bed, plant)` combination where `cellCount > 0`.

| Field | Type | Derived From |
|---|---|---|
| `bedName` | String | `bed.name` |
| `plantEmoji` | String | `cell.plantId.emoji` (fallback: `🌿`) |
| `plantName` | String | `cell.plantId.name` |
| `cellCount` | Number | Count of cells in this bed where `plantId === this plant` |

**Derivation algorithm**:
```
for each bed in beds (sorted by bed.name):
  group cells by plantId
  for each unique plantId where count > 0 (sorted by plant.name):
    yield ShoppingListRow { bedName, plantEmoji, plantName, cellCount }
```

**Validation rules** (enforced in component, not schema):
- Beds with no planted cells are excluded (FR-007)
- Plant emoji fallback: `🌿` when `cell.plantId.emoji` is empty or missing (edge case from spec)
- Only placed beds (`mapRow != null && mapCol != null`) appear on the map grid (page 1); all beds with planted cells appear in the shopping list (page 2) regardless of placement status

### PrintDocument

Not a stored entity — describes the structure of the generated output.

| Section | Source | Output |
|---|---|---|
| Page 1 header | `user.gardenName`, current date | Title text above the grid |
| Page 1 grid | `beds` (placed), `user.gardenWidth/Height` | Visual garden map, beds + emoji cells |
| Page 2 header | Static | `"Shopping List"` heading |
| Page 2 table | `ShoppingListRow[]` | Bed / Plant / Qty / ☐ Seed / ☐ Starts / ☐ Purchased |
| Page 2 empty state | When `ShoppingListRow[]` is empty | `"No plants to list."` message |

---

## Data Flow

```
AuthContext.user
  └── gardenWidth, gardenHeight, gardenName
                        │
                        ▼
React Query ['beds']         ─── GET /beds (existing endpoint, no change)
  └── beds[] with cells[].plantId populated
                        │
                        ▼
              GardenPrintView (component)
                  ├── Page 1: grid visual (placed beds + emoji)
                  └── Page 2: ShoppingListRow[] (derived from beds)
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
        html2canvas             window.print()
        → jsPDF.save()          → browser print dialog
        (named .pdf download)
```
