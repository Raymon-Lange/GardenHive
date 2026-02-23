# Research: Garden Layout PDF & Shopping List

**Branch**: `003-garden-pdf`
**Date**: 2026-02-23

---

## Decision 1: PDF Generation Approach

**Decision**: Use `jsPDF + html2canvas` for the named PDF file download (US1) and `window.print()` with `@media print` CSS for the browser print dialog (US2).

**Rationale**:

The spec requires two distinct outputs:
- **US1**: A downloadable file named e.g. `my-garden-2026-02-23.pdf` — requires a programmatic file download with a controlled filename.
- **US2**: The browser's native print dialog — requires `window.print()`.

Neither goal alone is sufficient to cover both. The cleanest split:

| Goal | Mechanism | Why |
|---|---|---|
| Named file download | `html2canvas` → `jsPDF.save(filename)` | Only client-side way to force a filename; `pdf.save()` uses a synthetic `<a download>` click |
| Browser print dialog | `window.print()` + `@media print` CSS | Native, zero-dep, perfect emoji via system font |

`html2canvas` rasterises the live DOM element. The browser's own rendering engine (including its color emoji font — Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji) paints the canvas. Whatever the user sees on screen is exactly what lands in the PDF — no font embedding, no Unicode shaping, no COLR table issues.

**Bundle impact**: ~150 KB gzip (html2canvas ~60 KB + jsPDF ~90 KB). Acceptable for an on-demand feature.

**Alternatives considered and rejected**:

- **`@react-pdf/renderer`**: Architecturally broken emoji rendering — emoji codepoints require COLR or CBDT font tables which PDFKit (used internally) does not support. Glyph renders as blank box or monochrome silhouette. Additionally adds ~1.4 MB gzipped and requires Node.js stream/Buffer Vite polyfills. Rejected.
- **Browser print CSS only (no download library)**: Cannot produce a named programmatic download — `window.print()` always opens a dialog and the filename is OS-controlled. Would fail FR-001 as written. Rejected for US1, used for US2.
- **`jsPDF` alone (no html2canvas)**: Same emoji problem as react-pdf — jsPDF's built-in text renderer uses embedded PDF fonts with no emoji glyphs. Working around it requires fetching a per-emoji PNG from Twemoji CDN and calling `doc.addImage()` per cell — more work than the html2canvas approach with a CDN dependency. Rejected.

---

## Decision 2: Garden Grid Rendering on PDF Page 1

**Decision**: `html2canvas` captures the live `GardenPrintView` grid section directly. A computed `transform: scale()` shrinks the grid to fit the paper width before capture.

**Rationale**: The grid is already rendered as absolute-positioned `div`s with a SVG dot background in `GardenMap.jsx`. Re-implementing it inside a PDF primitive system (react-pdf, jsPDF rects) would require duplicating all the layout logic. Capturing the DOM is zero-duplication.

**Scale formula**: `printScale = Math.min(1, PAPER_PRINT_WIDTH_PX / (gardenWidth * CELL_PX))`
- `PAPER_PRINT_WIDTH_PX` = 794 px (A4/Letter printable width at 96 dpi, 10 mm margins)
- `CELL_PX` = 28 (existing constant in `GardenMap.jsx`)
- Scale clamped to ≤ 1 (never upscale small gardens)

For html2canvas capture, the print view element is temporarily made visible (off-screen, `position: fixed; left: -9999px`), captured, then re-hidden. This avoids the `overflow: auto` clip issue identified in research.

For the `window.print()` path, the same scale is injected as a CSS variable `--print-scale` on the wrapper element; `@media print` CSS reads it via `transform: scale(var(--print-scale, 1))`.

---

## Decision 3: Shopping List Multi-Page Handling

**Decision**: Two separate strategies by output type:

- **Browser print dialog (US2)**: CSS `thead { display: table-header-group }` causes the browser to automatically repeat the `<thead>` on every continuation page. Zero JavaScript needed. Works in Chrome, Firefox, and Safari.
- **PDF download (US1)**: `html2canvas` captures the full table height as a single tall canvas. The canvas is then sliced into A4-height chunks. For each continuation chunk, the header row is captured separately and prepended by drawing it onto each slice before embedding in jsPDF.

**Scale for shopping list**: No scaling needed — the table uses natural CSS widths that fit within the A4 printable width. Only the garden grid needs the `transform: scale()` treatment.

---

## Decision 4: Print Layout Architecture

**Decision**: A dedicated `GardenPrintView` component, always rendered in the DOM but hidden from normal view. It is the single source of truth for both the download path and the print path.

- **Normal view**: Rendered off-screen with `position: fixed; left: -9999px` (avoids `display: none` which would prevent `html2canvas` from capturing it and also prevents the browser from laying it out for print).
- **Download path**: `html2canvas` targets the component's DOM node via a `forwardRef`.
- **Print path**: `@media print` CSS shows the print view (`display: block`) and hides all other page content (sidebar, top bar, GardenMap interactive controls).

This avoids duplicating the garden map rendering logic and ensures the two outputs are always visually identical.

---

## Decision 5: Checkboxes in Print / PDF

**Decision**: Use the Unicode ballot box character `☐` (U+2610 BALLOT BOX) as the printable checkbox symbol in table cells.

**Rationale**: Renders as a clean empty square in all major system fonts. No CSS tricks, no `<input type="checkbox">` (which would require disabling browser checkbox styles), no SVG. Prints correctly in all browsers. html2canvas captures it as-is.

---

## Decision 6: No New Backend Endpoint

**Decision**: Confirmed. All data required for the PDF is already available in the Garden Map view: the `beds` React Query cache (`GET /beds`) and `user.gardenWidth`/`user.gardenHeight` from `AuthContext`. No new server-side route is needed.

**Rationale**: Generating the PDF client-side avoids adding Puppeteer/Playwright to the backend (which would add ~300 MB binary and significant CI/CD complexity). The spec assumption explicitly states this.

---

## Dependency Compatibility Confirmed

- `jspdf` v2.x: ships full ESM, works with Vite 7 and React 19 (framework-agnostic DOM API only)
- `html2canvas` v1.x: ships full ESM, works with Vite 7 and React 19 (interacts with DOM nodes only, not the React reconciler)
- No Node.js polyfills required for either library under Vite 7
