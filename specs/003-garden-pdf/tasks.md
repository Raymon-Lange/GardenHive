# Tasks: Garden Layout PDF & Shopping List

**Input**: Design documents from `/specs/003-garden-pdf/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not included — no new backend route files (Constitution VI applies per route file). This is a frontend-only feature.

**Organization**: Tasks grouped by user story (P1 → P2) to enable independent delivery of each increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths included in every description

## Path Conventions

- Backend source: `backend/src/` — **NO CHANGES this feature**
- Frontend source: `frontend/src/`
- Frontend components: `frontend/src/components/`
- Frontend pages: `frontend/src/pages/`

---

## Phase 1: Setup (Baseline Verification)

**Purpose**: Install new dependencies before any source changes.

- [x] T001 Run `npm install jspdf html2canvas` in `frontend/` to add jsPDF v2.x and html2canvas v1.x as dependencies; verify both appear in `frontend/package.json` under `"dependencies"` with pinned semver

---

## Phase 2: Foundational (Shared Component)

**Purpose**: Create `GardenPrintView.jsx`, which is the shared print layout component consumed by both user stories (US1 uses it as an html2canvas target; US2 shows it via `@media print`).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Create `frontend/src/components/GardenPrintView.jsx` — a React function component that accepts `{ ref, beds, gardenWidth, gardenHeight, gardenName }` props (React 19 ref-as-prop, no `forwardRef` wrapper needed) and renders two print sections off-screen; full spec below:

  **Positioning (hidden from normal view, capturable by html2canvas):**
  ```jsx
  <div ref={ref} id="garden-print-view"
    style={{ position: 'fixed', left: '-9999px', top: 0, width: 794, background: 'white', fontFamily: 'sans-serif' }}>
  ```
  Use `position: fixed; left: -9999px` NOT `display: none` — html2canvas cannot capture hidden elements.

  **Constants (copy from GardenMap.jsx):**
  ```js
  const CELL_PX = 28;
  const PAPER_PRINT_WIDTH_PX = 794;
  const printScale = Math.min(1, PAPER_PRINT_WIDTH_PX / (gardenWidth * CELL_PX));
  ```

  **Section 1 — Garden Map** (`data-print-section="1"`):
  - Heading: garden name (`gardenName || 'Garden Map'`) + today's date (ISO format)
  - Grid wrapper div with class `garden-print-grid-wrapper` and `style={{ overflow:'hidden', width: '100%' }}`
  - Inner grid div with class `garden-print-grid` and `style={{ transform: \`scale(${printScale})\`, transformOrigin: 'top left', position: 'relative', width: gardenWidth * CELL_PX, height: gardenHeight * CELL_PX }}`
  - SVG dot background (same pattern as GardenMap.jsx lines 287–304: one `<circle r={1.5} fill="#d1c4b0" opacity={0.5}` per grid intersection)
  - Loop over `beds.filter(b => b.mapRow != null && b.mapCol != null)` — for each placed bed render an absolutely-positioned div with: left=`mapCol * CELL_PX`, top=`mapRow * CELL_PX`, width=`cols * CELL_PX`, height=`rows * CELL_PX`, border `2px solid #6b7280`, background `#e5e7eb`, border-radius 4px
  - Inside each bed, render the emoji grid: same logic as GardenMap.jsx lines 340–350 — `Array.from({ length: rows * cols }, (_, i) => ...)` looking up `cells.find(c => c.row === row && c.col === col)` and rendering `cell?.plantId?.emoji || ''` in a div with class `emoji-cell`
  - Bed label at bottom of bed: bed name (split on ` — ` and take second part or full name)

  **Section 2 — Shopping List** (`data-print-section="2"`):
  - Heading: "Shopping List"
  - Derive `shoppingRows` from `beds`:
    ```js
    const shoppingRows = beds
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap(bed => {
        const groups = {};
        bed.cells?.forEach(cell => {
          if (!cell.plantId) return;
          const key = String(cell.plantId._id);
          if (!groups[key]) groups[key] = { bedName: bed.name, plantEmoji: cell.plantId.emoji || '🌿', plantName: cell.plantId.name, cellCount: 0 };
          groups[key].cellCount++;
        });
        return Object.values(groups)
          .filter(g => g.cellCount > 0)
          .sort((a, b) => a.plantName.localeCompare(b.plantName));
      });
    ```
  - If `shoppingRows.length === 0`: render `<p>No plants to list.</p>` instead of the table
  - Otherwise render a `<table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>`:
    - `<thead>`: one header row with columns: **Bed** | **Plant** | **Qty** | **☐ Seed** | **☐ Starts** | **☐ Purchased** — th cells with `style={{ borderBottom:'2px solid #374151', textAlign:'left', padding:'4px 8px' }}`
    - `<tbody>`: one `<tr>` per `shoppingRow` with td cells styled `{ border: '1px solid #d1d5db', padding: '4px 8px' }`:
      - `bedName`
      - `{plantEmoji} {plantName}` (class `emoji-cell` on the emoji span)
      - `cellCount`
      - `☐` (U+2610)
      - `☐` (U+2610)
      - `☐` (U+2610)

**Checkpoint**: GardenPrintView renders off-screen; both sections have the correct HTML structure for html2canvas capture and @media print display.

---

## Phase 3: User Story 1 — Download Garden Layout PDF (Priority: P1) 🎯 MVP

**Goal**: Owner or helper clicks "Download PDF" on the Garden Map page and receives a named two-page PDF file.

**Independent Test**: Navigate to Garden Map, click "Download PDF", wait for browser download, open the file in a PDF viewer — confirm page 1 shows the garden grid with plant emojis and page 2 shows the shopping list table.

### Implementation for User Story 1

- [x] T003 [US1] Integrate GardenPrintView into `frontend/src/pages/GardenMap.jsx` — add the following (do not change any existing code):
  1. Import: `import GardenPrintView from '../components/GardenPrintView';`
  2. After existing `const gridRef = useRef(null)`: add `const printViewRef = useRef(null);`
  3. After existing `const [addError, setAddError] = useState('')`: add `const [isPdfLoading, setIsPdfLoading] = useState(false);`
  4. At the very bottom of the JSX return (after the `</div>` that closes the whole page), before the final `</div>`, render:
     ```jsx
     <GardenPrintView
       ref={printViewRef}
       beds={beds}
       gardenWidth={gardenWidth}
       gardenHeight={gardenHeight}
       gardenName={user?.gardenName}
     />
     ```
     (Place this OUTSIDE the `gardenWidth == null` gate — it should always render once dimensions are set, so html2canvas can always find it in the DOM)
  (depends on T002)

- [x] T004 [US1] Add `handleDownloadPdf` async function and "Download PDF" button to `frontend/src/pages/GardenMap.jsx`:

  **Function** (add after the existing `handleCreateBed` function):
  ```js
  async function handleDownloadPdf() {
    if (!printViewRef.current) return;
    setIsPdfLoading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const printScale = Math.min(1, 794 / ((gardenWidth ?? 1) * CELL_PX));
      printViewRef.current.style.setProperty('--print-scale', printScale);

      const section1 = printViewRef.current.querySelector('[data-print-section="1"]');
      const section2 = printViewRef.current.querySelector('[data-print-section="2"]');

      const canvas1 = await html2canvas(section1, { scale: 2, useCORS: true, logging: false });
      const canvas2 = await html2canvas(section2, { scale: 2, useCORS: true, logging: false });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const PAGE_W = pdf.internal.pageSize.getWidth();
      const PAGE_H = pdf.internal.pageSize.getHeight();

      // Page 1: garden grid
      const img1 = canvas1.toDataURL('image/png');
      const h1 = (canvas1.height * PAGE_W) / canvas1.width;
      pdf.addImage(img1, 'PNG', 0, 0, PAGE_W, Math.min(h1, PAGE_H));

      // Page 2+: shopping list (tile canvas2 across pages if needed)
      pdf.addPage();
      const img2 = canvas2.toDataURL('image/png');
      const totalH2 = (canvas2.height * PAGE_W) / canvas2.width;
      if (totalH2 <= PAGE_H) {
        pdf.addImage(img2, 'PNG', 0, 0, PAGE_W, totalH2);
      } else {
        // Slice canvas2 across multiple pages
        const sliceHeightPx = Math.floor((PAGE_H / totalH2) * canvas2.height);
        let offsetPx = 0;
        let pageAdded = false;
        while (offsetPx < canvas2.height) {
          if (pageAdded) pdf.addPage();
          pageAdded = true;
          const remaining = canvas2.height - offsetPx;
          const chunkPx = Math.min(sliceHeightPx, remaining);
          const chunkCanvas = document.createElement('canvas');
          chunkCanvas.width = canvas2.width;
          chunkCanvas.height = chunkPx;
          chunkCanvas.getContext('2d').drawImage(canvas2, 0, offsetPx, canvas2.width, chunkPx, 0, 0, canvas2.width, chunkPx);
          const chunkH = (chunkPx * PAGE_W) / canvas2.width;
          pdf.addImage(chunkCanvas.toDataURL('image/png'), 'PNG', 0, 0, PAGE_W, chunkH);
          offsetPx += chunkPx;
        }
      }

      const slug = (user?.gardenName || 'garden').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`${slug}-${dateStr}.pdf`);
    } finally {
      setIsPdfLoading(false);
    }
  }
  ```

  **Button** — in the header `<div className="flex items-center justify-between mb-4">`, add a `<div className="flex gap-2">` wrapper around the existing "Add bed" button and add the new button before it:
  ```jsx
  <div className="flex gap-2 items-center">
    <button
      className="btn-secondary print:hidden"
      onClick={handleDownloadPdf}
      disabled={isPdfLoading}
    >
      {isPdfLoading ? 'Generating…' : 'Download PDF'}
    </button>
    {isOwner && (
      <button className="btn-primary" onClick={() => setShowAddForm((v) => !v)}>
        <Plus size={16} /> Add bed
      </button>
    )}
  </div>
  ```
  (depends on T003)

**Checkpoint**: US1 complete — clicking "Download PDF" generates and downloads a two-page PDF with the garden grid on page 1 and shopping list on page 2. Independently testable.

---

## Phase 4: User Story 2 — Print Directly from Browser (Priority: P2)

**Goal**: User clicks "Print" and the browser's native print dialog opens showing the two-page layout, with all navigation hidden.

**Independent Test**: Click "Print" button, confirm browser print dialog opens, inspect preview — page 1 shows the garden grid, page 2 shows shopping list, navigation sidebar and buttons are hidden.

### Implementation for User Story 2

- [x] T005 [P] [US2] Add `@media print` CSS block to `frontend/src/index.css` — append after the existing `@layer components` block (do not modify any existing CSS):
  ```css
  @media print {
    /* 1. Show only the print view, hide all other page content */
    body > * {
      display: none !important;
    }
    #garden-print-view {
      display: block !important;
      position: static !important;
      left: 0 !important;
      width: 100% !important;
    }

    /* 2. Paper size and margins */
    @page {
      size: A4 landscape;
      margin: 12mm 10mm;
    }

    /* 3. White background, preserve colours on bed elements */
    html, body {
      background: white !important;
      color: black !important;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* 4. Page break after garden map section */
    [data-print-section="1"] {
      break-after: page;
      page-break-after: always;
    }

    /* 5. Scale the garden grid to fit paper width */
    .garden-print-grid {
      transform: scale(var(--print-scale, 1));
      transform-origin: top left;
    }
    .garden-print-grid-wrapper {
      overflow: hidden;
      width: 100%;
    }

    /* 6. Repeating table header on continuation pages */
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* 7. Remove card shadow and overflow clipping */
    .card {
      overflow: visible !important;
      box-shadow: none !important;
    }

    /* 8. Emoji font stack for reliable print rendering */
    .emoji-cell {
      font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
      font-size: 14px;
    }
  }
  ```
  (can run in parallel with T003 — touches `index.css`, not `GardenMap.jsx`; depends on T002 for knowledge of class names and IDs)

- [x] T006 [US2] Add `handlePrint` function and "Print" button to `frontend/src/pages/GardenMap.jsx`:

  **Function** (add after `handleDownloadPdf`):
  ```js
  function handlePrint() {
    if (!printViewRef.current) return;
    const printScale = Math.min(1, 794 / ((gardenWidth ?? 1) * CELL_PX));
    printViewRef.current.style.setProperty('--print-scale', printScale);
    const original = document.title;
    document.title = `${user?.gardenName || 'Garden'} - ${new Date().toISOString().split('T')[0]}`;
    window.print();
    window.addEventListener('afterprint', () => { document.title = original; }, { once: true });
  }
  ```

  **Button** — add a "Print" button to the same `<div className="flex gap-2 items-center">` wrapper created in T004, before the "Download PDF" button:
  ```jsx
  <button className="btn-secondary print:hidden" onClick={handlePrint}>
    Print
  </button>
  ```
  (depends on T003 — printViewRef must exist; depends on T005 — @media print CSS must be in place for the print view to appear correctly in the print dialog)

**Checkpoint**: US2 complete — "Print" opens the browser print dialog showing the two-page garden PDF layout with navigation hidden. Both US1 and US2 are independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation and quality gate.

- [ ] T007 Run all 7 validation scenarios from `specs/003-garden-pdf/quickstart.md` manually and confirm every checklist item passes (depends on T004, T006)
- [x] T008 [P] Run `npm run lint` in `frontend/` and confirm zero errors (depends on T004, T006)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: No hard dependency on Phase 1 (different file), but install deps first to avoid confusion
- **US1 (Phase 3)**: Depends on Phase 2 (T002) — GardenPrintView must exist before GardenMap integrates it
- **US2 (Phase 4)**: T005 depends on Phase 2 (T002) only — can run in parallel with US1; T006 depends on T003 (GardenPrintView integrated into GardenMap)
- **Polish (Phase 5)**: Depends on T004 and T006 complete

### User Story Dependencies

- **US1 (P1)**: Depends on T002 (foundational component). T003 then T004 sequentially.
- **US2 (P2)**: T005 depends on T002 (can run parallel with T003). T006 depends on T003 + T005.

### Within Each Phase

- **Phase 3**: T003 then T004 sequentially (same file, logical dependency)
- **Phase 4**: T005 and T003 in parallel (different files); T006 after both T003 and T005
- **Phase 5**: T007 and T008 can run in parallel once T004 and T006 are done

---

## Parallel Execution Examples

### Phase 3 + 4 — Once T002 and T003 are done

```text
Sequential first:
  T001 — npm install jspdf html2canvas
  T002 — Create GardenPrintView.jsx

Sequential (same file):
  T003 — Integrate GardenPrintView into GardenMap.jsx

Parallel after T002 (T003 started / T005 can start immediately):
  Task A: T004 — Add handleDownloadPdf + button (depends on T003)
  Task B: T005 — Add @media print CSS to index.css (parallel — different file, depends only on T002)

Then sequentially:
  T006 — Add handlePrint + Print button (depends on T003, T005)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Install dependencies (T001)
2. Complete Phase 2: Create GardenPrintView.jsx (T002)
3. Complete Phase 3: US1 — integrate component + add download handler (T003, T004)
4. **STOP and VALIDATE**: Navigate to Garden Map → click "Download PDF" → verify two-page PDF
5. Ship MVP: users can download the garden layout PDF

### Incremental Delivery

1. T001 → T002 → Foundation ready
2. T003 → T004 → **Demo: "Download PDF" works**
3. T005 → T006 → **Demo: "Print" opens browser dialog with correct layout**
4. T007 → T008 → All edge cases validated, lint passes

---

## Notes

- `[P]` tasks touch different files: `index.css` vs `GardenMap.jsx`
- No backend changes — feature is entirely frontend
- Dynamic `import('jspdf')` and `import('html2canvas')` in `handleDownloadPdf` ensures these ~150 KB libraries are not in the initial bundle — loaded only when the user clicks Download PDF
- `btn-secondary` CSS class may not exist yet — check `frontend/src/index.css`. If missing, add `.btn-secondary { @apply btn-primary bg-white text-garden-700 border border-garden-300 hover:bg-garden-50; }` or use `btn-primary` with a different visual style
- `GardenPrintView` uses React 19 ref-as-prop (no `forwardRef` wrapper) — the `ref` prop is passed directly in the function signature
- The `--print-scale` CSS variable is set imperatively on `printViewRef.current` before both `html2canvas` capture and `window.print()` calls — this ensures the grid scales correctly for both output paths
