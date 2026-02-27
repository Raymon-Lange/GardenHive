# Research: Garden PDF Layout Simplification

**Branch**: `009-simplify-pdf-layout` | **Date**: 2026-02-27

---

## Decision 1 — Neutral Cell Background Colour

**Decision**: White (`#FFFFFF`) for planted cells; transparent for empty cells (unchanged).

**Rationale**: White provides the strongest contrast against the `#F0FAF3` page background and the `#52B788` bed card border. The emoji and abbreviated plant name remain clearly readable. Any grey tint risks blending with the page background at small cell sizes.

**Alternatives considered**:
- **Page background `#F0FAF3`**: Rejected — no visual separation between planted and empty cells; beds look uniform.
- **Light grey `#E5E7EB`**: Rejected — lower contrast for the emoji and label text; harder to read at compact scale.

---

## Decision 2 — Row Grouping Strategy for Checklist

**Decision**: Group by `plant._id` across all beds; sum `cellCount`. Sort by `plantName` ascending.

**Rationale**: Grouping by `_id` (not by name string) correctly handles edge cases where two distinct plant entries could share the same display name. Summing quantities gives the shopper the total number of each plant to purchase, which is the primary use case for taking the checklist to a nursery.

**Alternatives considered**:
- **Keep per-bed rows, just hide the Bed column**: Rejected — produces duplicate rows for the same plant without explanation, which is confusing (e.g., "Tomato (Cherry) — 8" appearing twice).
- **Group by plant name string**: Rejected — fragile; two plants with identical names but different `_id`s would be incorrectly merged.

---

## Decision 3 — Retention of `CATEGORY_COLORS` Constant

**Decision**: Leave `CATEGORY_COLORS` in `GardenPrintView.jsx` unchanged.

**Rationale**: Deleting it would require confirming no other component references it. It is a pure constant with zero runtime cost. Per constitution Principle VII, removing it is a YAGNI inversion — it offers future value at no present cost.

**Alternatives considered**:
- **Delete `CATEGORY_COLORS`**: Deferred — no active use after this change, but removal is a separate cleanup task if desired.
