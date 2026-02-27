# Data Model: Garden PDF Layout Simplification

**Branch**: `009-simplify-pdf-layout` | **Date**: 2026-02-27

---

## No Schema Changes

This feature introduces **no new Mongoose models, no new database fields, and no new API endpoints**. All data continues to flow from `useBeds()` (React Query) and `AuthContext`.

---

## Changed Computed Model

### ShoppingListRow (before)

| Field | Type | Source |
|-------|------|--------|
| `bedName` | `String` | `bed.name` |
| `plantName` | `String` | `cell.plantId.name` |
| `plantEmoji` | `String` | `cell.plantId.emoji \|\| '🌿'` |
| `cellCount` | `Number` | Count of cells with this `plantId` in **this bed** |

Sorted by `bedName` then `plantName`. One row per `(bed, plant)` combination.

### ShoppingListRow (after)

| Field | Type | Source |
|-------|------|--------|
| `plantName` | `String` | `cell.plantId.name` |
| `plantEmoji` | `String` | `cell.plantId.emoji \|\| '🌿'` |
| `cellCount` | `Number` | Sum of cells with this `plantId` **across all beds** |

Sorted by `plantName` only. One row per unique `plant._id` across all beds.

**Removed field**: `bedName` — no longer needed; the Bed column is removed from the table.

---

## Unchanged Computed Models

- **PdfLayoutConfig** (`scale`, `isPaginated`, `stripCount`, `stripHeightFt`) — unchanged
- **BedRenderBounds** (`x`, `y`, `w`, `h`, `compact`, `cellSize`, etc.) — unchanged
- **ShoppingListSummary** (`totalCells`, `totalVarieties`) — logic unchanged; `totalVarieties` now correctly counts unique plant rows (which equals unique plants across all beds, consistent with the new one-row-per-plant approach)
