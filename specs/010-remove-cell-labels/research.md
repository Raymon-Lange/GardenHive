# Research: Remove Plant Name Labels from Garden Map PDF

**Branch**: `010-remove-cell-labels` | **Date**: 2026-02-27

---

## Decision 1 — Remove the `marginTop` Offset with the Label

**Decision**: Remove `marginTop: -(emojiFontPx / 2)` from the cell content wrapper at the same time as the label `<div>`.

**Rationale**: The negative `marginTop` was introduced in feature 008 specifically to compensate for the vertical shift caused by the emoji+label block being centred as a unit. The label accounts for roughly half the total block height, so the offset pushes the emoji up by `emojiFontPx / 2`. With the label gone, the block is just the emoji div, and the cell's `justifyContent: 'center'` will centre it correctly without any offset. Leaving the offset in place would shift the emoji too far upward.

**Alternatives considered**:
- **Keep the offset**: Rejected — with only the emoji in the wrapper, `marginTop: -(emojiFontPx / 2)` over-corrects and the emoji visually sits in the top half of the cell.
- **Replace with a smaller offset**: Rejected — unnecessary complexity; flex centering without any offset is the correct natural behaviour.

---

## Decision 2 — Clean Up `labelFontPx` and `shortName`

**Decision**: Remove the `labelFontPx` and `shortName` variables from the cell renderer block since they are only used by the deleted label `<div>`.

**Rationale**: Per constitution Principle VII (Simplicity & YAGNI), unused variables must not remain in the codebase. Both are local to the per-cell render scope and have no other consumers.

**Alternatives considered**:
- **Leave them in place**: Rejected — ESLint `no-unused-vars` would flag them, and they add dead code noise.
