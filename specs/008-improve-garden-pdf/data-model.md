# Data Model: Garden PDF Visual Redesign

**Branch**: `008-improve-garden-pdf` | **Date**: 2026-02-27

---

## Overview

This feature introduces **no new Mongoose models, no new database fields, and no new API endpoints**. All data is derived at render time from existing entities already available in the browser via React Query (`useBeds()`) and `AuthContext`.

The "data model" for this feature is the **computed PDF layout model** — a set of derived values calculated from existing data to drive the spatial rendering and pagination logic.

---

## Existing Entities Used (read-only)

### User (from `AuthContext`)

| Field | Type | Used for |
|-------|------|---------|
| `gardenName` | `String` | PDF header title, output filename slug |
| `gardenWidth` | `Number` (sq ft) | Map scale calculation (X axis) |
| `gardenHeight` | `Number` (sq ft) | Map scale calculation (Y axis) |
| `role` | `String` enum | Controls whether Download/Print buttons are visible (`owner` or helper) |

### GardenBed (from `GET /api/beds`)

| Field | Type | Used for |
|-------|------|---------|
| `_id` | `ObjectId` | React key |
| `name` | `String` | Bed card label, checklist Bed column |
| `rows` | `Number` (sq ft) | Bed card height = `rows × scale` |
| `cols` | `Number` (sq ft) | Bed card width = `cols × scale` |
| `mapRow` | `Number \| null` | Bed card top offset = `HEADER_H + mapRow × scale`. `null` = unplaced (excluded from map) |
| `mapCol` | `Number \| null` | Bed card left offset = `MARGIN + mapCol × scale`. `null` = unplaced (excluded from map) |
| `cells[]` | `Array` | Plant-cell grid |
| `cells[].row` | `Number` | Cell row index within bed |
| `cells[].col` | `Number` | Cell column index within bed |
| `cells[].plantId` | `Plant \| null` | Populated plant object (or `null` if unplanted) |

### Plant (populated on `cells[].plantId` by `/api/beds`)

| Field | Type | Used for |
|-------|------|---------|
| `_id` | `ObjectId` | Shopping list deduplication key |
| `name` | `String` | Cell label (abbreviated), checklist Plant column |
| `emoji` | `String` | Cell icon. Fallback: `'🌿'` if absent |
| `category` | `String` enum | Cell background colour via `CATEGORY_COLORS` map |

---

## Computed PDF Layout Model

These values are derived at render time inside `GardenPrintView.jsx`. They are never stored or sent to the server.

### PdfLayoutConfig

Calculated once per render from garden dimensions:

| Field | Type | Formula |
|-------|------|---------|
| `scale` | `Number` (px/ft) | `Math.min(USABLE_W_PX / gardenWidth, USABLE_H_PX / gardenHeight)` |
| `isCompact` (per bed) | `Boolean` | `scale < COMPACT_THRESHOLD_PX` (18 px/ft) |
| `isPaginated` | `Boolean` | `gardenHeight * scale > USABLE_H_PX` |
| `stripCount` | `Number` | `isPaginated ? Math.ceil(gardenHeight / Math.floor(USABLE_H_PX / scale)) : 1` |

**Constants**:

```
PAPER_W_PX          = 816   // 8.5" × 96dpi (US Letter)
PAPER_H_PX          = 1056  // 11" × 96dpi
MARGIN_PX           = 48    // 0.5" margins
HEADER_H_PX         = 72    // 0.75" header bar
USABLE_W_PX         = 720   // PAPER_W_PX - 2*MARGIN_PX
USABLE_H_PX         = 888   // PAPER_H_PX - HEADER_H_PX - 2*MARGIN_PX
COMPACT_THRESHOLD_PX = 18   // px/ft — below this, plant-name labels fall below 8pt in PDF
```

### BedRenderBounds

Per placed bed, derived from `PdfLayoutConfig`:

| Field | Type | Value |
|-------|------|-------|
| `x` | `Number` (px) | `MARGIN_PX + bed.mapCol * scale` |
| `y` | `Number` (px) | `HEADER_H_PX + bed.mapRow * scale` |
| `w` | `Number` (px) | `bed.cols * scale` |
| `h` | `Number` (px) | `bed.rows * scale` |
| `compact` | `Boolean` | `scale < COMPACT_THRESHOLD_PX` |
| `cellSize` | `Number` (px) | `scale` (each cell is 1 sq ft) |
| `labelFontPx` | `Number` (px) | `scale * 0.30` (hidden if `compact`) |
| `emojiFontPx` | `Number` (px) | `Math.max(10, scale * 0.65)` |
| `borderColor` | `String` (hex) | `#52B788` (all beds) |
| `bgColor` | `String` (hex) | Light tint of bed's dominant category, or `#E5E7EB` if no plants |

### ShoppingListRow

Derived from all placed beds' cells. One row per unique `(bed, plant)` combination where `cellCount > 0`:

| Field | Type | Source |
|-------|------|--------|
| `bedName` | `String` | `bed.name` |
| `plantName` | `String` | `cell.plantId.name` |
| `plantEmoji` | `String` | `cell.plantId.emoji \|\| '🌿'` |
| `cellCount` | `Number` | Count of cells with this `plantId` in this bed |

Sorted by `bedName` then `plantName` (existing `deriveShoppingRows` logic preserved).

### ShoppingListSummary

Derived from all `ShoppingListRow` entries:

| Field | Type | Value |
|-------|------|-------|
| `totalCells` | `Number` | Sum of `row.cellCount` across all rows |
| `totalVarieties` | `Number` | Count of unique `plantName` values across all rows |

---

## No Schema Changes

The following were confirmed as **out of scope** and require **no changes**:

- `User` model: no new fields
- `GardenBed` model: no new fields
- `Plant` model: no new fields
- No new collections
- No new API routes or middleware
- No changes to existing API response shapes
