# Implementation Plan: Remove Plant Name Labels from Garden Map PDF

**Branch**: `010-remove-cell-labels` | **Date**: 2026-02-27 | **Spec**: [spec.md](./spec.md)

## Summary

Remove the abbreviated plant name `<div>` from the plant cell renderer in `GardenPrintView.jsx`. The emoji icon remains; the text label below it is deleted. One element removed from one file.

## Technical Context

**Language/Version**: JavaScript + React 19 (frontend only — no backend changes)
**Primary Dependencies**: jsPDF 4.2.0 + html2canvas 1.4.1 (already installed — no changes)
**Storage**: N/A
**Testing**: Manual PDF inspection per quickstart.md
**Target Platform**: Browser
**Performance Goals**: No change
**Constraints**: Frontend-only; no new packages; no new files
**Scale/Scope**: Affects the cell renderer in every garden map PDF

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Layered Separation | ✅ Pass | Pure frontend rendering change. |
| II. REST-First API Design | ✅ Pass | No API changes. |
| III. Permission-Gated Multi-Tenancy | ✅ Pass | No route changes. |
| IV. Schema-Validated Data Integrity | ✅ Pass | No model changes. |
| V. Server State via React Query / UI State | ✅ Pass | No new state. |
| VI. Test-Before-Deploy | ✅ Pass | Manual PDF verification per quickstart.md. |
| VII. Simplicity & YAGNI | ✅ Pass | One element deleted. Zero new code. |
| VIII. Consistent Naming | ✅ Pass | No new identifiers. |

## Project Structure

### Documentation (this feature)

```text
specs/010-remove-cell-labels/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (file changed)

```text
frontend/
└── src/
    └── components/
        └── GardenPrintView.jsx    ← remove label <div> from cell renderer
```

**No new files. No backend changes. No new packages.**

## Complexity Tracking

> No constitution violations. No complexity entries required.

---

## Implementation Approach

### The Change

In the plant cell renderer (full detail mode), each planted cell currently renders:

```jsx
<div style={{ marginTop: -(emojiFontPx / 2) }}>
  <div style={{ fontSize: emojiFontPx, ... }}>
    {plant.emoji || '🌿'}
  </div>
  <div style={{ fontSize: labelFontPx, ... }}>
    {shortName}                          ← DELETE THIS DIV
  </div>
</div>
```

After the change:

```jsx
<div style={{ marginTop: -(emojiFontPx / 2) }}>
  <div style={{ fontSize: emojiFontPx, ... }}>
    {plant.emoji || '🌿'}
  </div>
</div>
```

The `shortName` variable and `labelFontPx` constant are also unused after this change and should be removed from the cell renderer block to keep the code clean.

### Centring Note

The `marginTop: -(emojiFontPx / 2)` offset on the wrapper div was added in feature 008 to correct a y-axis shift caused by the emoji+label block being taller than the emoji alone. With the label removed, the wrapper div contains only the emoji, so the offset may over-correct and shift the emoji slightly upward. The offset should be removed along with the label so the emoji is flex-centred naturally within the cell.
