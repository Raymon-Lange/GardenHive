# Research: Garden PDF Visual Redesign

**Branch**: `008-improve-garden-pdf` | **Date**: 2026-02-27

---

## Decision 1 — PDF Rendering Pipeline

**Decision**: Retain the existing React DOM → html2canvas (scale:2) → jsPDF pipeline. No new packages.

**Rationale**: The existing pipeline already handles emoji rendering correctly (html2canvas uses the browser's own rendering engine, so platform emoji fonts work out-of-the-box). A fully programmatic jsPDF approach would require either embedding a Unicode emoji font (~2–5 MB) or substituting emoji with images. Neither is worth the complexity gain. The redesign only changes what the hidden DOM component renders — the capture and assembly steps are unchanged.

**Alternatives considered**:
- **Fully programmatic jsPDF drawing**: Rejected — no native emoji support; would require html2canvas per-cell anyway for emoji, making it more complex, not less.
- **pdf-lib / pdfkit**: Rejected — same emoji limitation; introduces a new dependency for no net benefit.
- **Puppeteer server-side rendering**: Rejected — requires a backend endpoint, contradicts the "frontend-only / no new API" constraint, and adds significant infrastructure complexity.

---

## Decision 2 — PDF Format and Orientation

**Decision**: US Letter portrait (8.5" × 11", 612pt × 792pt) replacing the existing A4 landscape.

**Rationale**: The spec requires letter-size. Portrait orientation suits a garden map better than landscape for most gardens (gardens tend to be taller than wide when displayed as a proportional map) and also matches the shopping checklist page flow.

**Usable area** (at 0.5" margins, 0.75" header):
- Width: 7.5" = 720px DOM / 540pt PDF
- Height (map area): 9.25" = 888px DOM / 666pt PDF

**Alternatives considered**:
- **A4 landscape** (current): Rejected — spec requires letter; landscape doesn't suit portrait checklist tables.
- **A4 portrait**: Rejected — spec explicitly states letter-size.

---

## Decision 3 — Spatial Layout Scale Algorithm

**Decision**: Aspect-ratio-preserving two-axis `min()` scale.

```
USABLE_W_PX = 720   # page width minus margins
USABLE_H_PX = 888   # page height minus header and margins
scale = min(USABLE_W_PX / gardenWidth, USABLE_H_PX / gardenHeight)  # px per sq ft
```

Bed position: `left = MARGIN_PX + bed.mapCol * scale`, `top = HEADER_H_PX + bed.mapRow * scale`
Bed size: `width = bed.cols * scale`, `height = bed.rows * scale`

**Rationale**: A single-axis scale (width-only, as in the existing code) distorts proportions when the garden is taller than wide. The `min()` of both axes guarantees the entire garden boundary fits within the usable area while preserving the aspect ratio.

**Alternatives considered**:
- **Width-only scale** (current approach): Rejected — distorts tall gardens; beds near the bottom may fall outside the page boundary.
- **Fixed cell size regardless of garden size**: Rejected — large gardens overflow; doesn't satisfy the spatial accuracy requirement.

---

## Decision 4 — Compact Mode Threshold

**Decision**: Compact mode activates when `scale < 18px/ft` (DOM pixels per square foot).

**Derivation**:
- Plant label font is rendered at `scale * 0.30 px` in the DOM.
- html2canvas captures at 2× pixel density → effective font = `scale * 0.60 px`.
- jsPDF places image at 720px DOM → 540pt PDF, so PDF scale factor = 540/720 = 0.75.
- Final PDF font size = `scale * 0.60 * 0.75 = scale * 0.45 pt`.
- For 8pt in PDF: `scale * 0.45 = 8` → `scale = 17.8 px/ft` ≈ **18 px/ft threshold**.

At `USABLE_W_PX = 720`, this triggers for gardens wider than 40 ft (`720/18 = 40`).

**Implementation constant**: `const COMPACT_THRESHOLD_PX = 18`

**Fallback behaviour**: Compact card displays bed name (max 16 chars + ellipsis) and plant count centred in the bed boundary. Full spatial position and category-derived border colour are preserved.

**Alternatives considered**:
- **8px/ft threshold**: Too aggressive — most medium gardens would go compact even though cells remain readable.
- **User-configurable threshold**: Rejected per YAGNI — adds UI complexity for a rarely-needed escape hatch.

---

## Decision 5 — Map Pagination Threshold

**Decision**: Paginate when `gardenHeight * scale > USABLE_H_PX`.

Since `scale = min(720/gardenWidth, 888/gardenHeight)`:
- If `scale` is width-limited: garden fits vertically by definition unless `gardenHeight/gardenWidth > 888/720 ≈ 1.23`.
- If `scale` is height-limited: scale = 888/gardenHeight → `gardenHeight * scale = 888` → fits exactly.
- Pagination only triggers for very tall/narrow gardens where the width-limited scale makes the height exceed the usable area.

Concretely, pagination activates for gardens where `gardenHeight > gardenWidth * 1.23`. Example: a 10 ft × 20 ft garden (taller than wide) with `scale = 720/10 = 72 px/ft` → map height = `20 * 72 = 1440px > 888` → paginates into 2 strips.

**Strip height** (in garden sq ft): `stripHeight = floor(USABLE_H_PX / scale)`
**Number of strips**: `ceil(gardenHeight / stripHeight)`

Each strip is a separate `data-print-section="map-N"` div. A 120×80px SVG index thumbnail (garden outline + highlighted strip) renders in the top-right of each map page.

**Alternatives considered**:
- **Scale down until everything fits**: Rejected — spec explicitly defines the 6pt pagination threshold rather than infinite shrinking.
- **Horizontal strips**: Chosen over vertical strips because garden data (`mapRow`) flows top-to-bottom and this matches reading order.

---

## Decision 6 — Category Colour Assignments

**Decision**: Four distinct, print-friendly Tailwind-derived accent colours.

| Category | Hex | Tailwind Equivalent | Greyscale luminance |
|----------|-----|--------------------|--------------------|
| `vegetable` | `#BBF7D0` | green-200 | ~89% |
| `fruit` | `#FED7AA` | orange-200 | ~87% |
| `herb` | `#FEF08A` | yellow-200 | ~92% |
| `flower` | `#FBCFE8` | pink-200 | ~85% |

All four are visually distinct against the `#F0FAF3` page background. In greyscale, their luminance differences (85%–92%) are small but the hue contrast in colour printing is strong. For black-and-white printing, the category text label remains the primary differentiator.

**Implementation constant**:
```js
const CATEGORY_COLORS = {
  vegetable: '#BBF7D0',
  fruit:     '#FED7AA',
  herb:      '#FEF08A',
  flower:    '#FBCFE8',
};
const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS.vegetable;
```

---

## Decision 7 — Print Button Implementation

**Decision**: Generate PDF identically to Download, then open as a blob URL via `window.open()`. Remove CSS `@media print` path entirely.

```js
async function handlePrint() {
  try {
    const pdf = await buildPdf(/* ... */);
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl);
  } catch (e) {
    setPdfError('Could not generate PDF — please try again');
  }
}
```

When the browser opens a PDF blob URL, it displays the PDF in the built-in viewer. The user then uses the viewer's own Print button (Ctrl+P) or the browser auto-triggers the print dialog depending on the `bloburl` output mode.

**Rationale**: The CSS @media print approach is fragile — it depends on `#garden-print-view` matching the screen layout precisely, and cannot programmatically handle the compact mode and pagination logic that are now required. A single PDF-generation path for both download and print reduces maintenance burden and guarantees visual consistency.

**Alternatives considered**:
- **window.print() + CSS @media print** (current): Rejected — can't express compact mode or multi-strip pagination in CSS alone; diverges from the PDF download output.
- **iframe with autoPrint()**: Rejected — cross-origin and popup-blocker issues on some browsers.

---

## Decision 8 — Toast / Error Notification

**Decision**: Inline `useState` + `setTimeout` auto-dismiss. No new component or library.

```jsx
const [pdfError, setPdfError] = useState(null);
// In catch: setPdfError('Could not generate PDF — please try again');
//           setTimeout(() => setPdfError(null), 4000);

// In render:
{pdfError && (
  <div className="fixed bottom-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded shadow-lg">
    {pdfError}
  </div>
)}
```

**Rationale**: Per YAGNI — this is used in exactly one place (`GardenMap.jsx`). The app has no existing toast system. A three-line inline solution is correct at this scope. A reusable toast component becomes appropriate only when a third usage location appears (per constitution Principle VII).

**Alternatives considered**:
- **react-hot-toast / sonner**: Rejected — adds a dependency for a single call site.
- **Custom `<Toast>` component**: Rejected — premature abstraction; only one usage.
- **Alert dialog**: Rejected — modal interruption is too disruptive for a transient error.

---

## Resolved NEEDS CLARIFICATION

All `[NEEDS CLARIFICATION]` markers from the spec were resolved in the clarification session. No unknowns remain. See `spec.md → ## Clarifications` for the full record.
