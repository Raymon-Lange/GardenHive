import { createPortal } from 'react-dom';

const CELL_PX = 28;
const PAPER_PRINT_WIDTH_PX = 794;

function deriveShoppingRows(beds) {
  return beds
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((bed) => {
      const groups = {};
      bed.cells?.forEach((cell) => {
        if (!cell.plantId) return;
        const key = String(cell.plantId._id);
        if (!groups[key]) {
          groups[key] = {
            bedName: bed.name,
            plantEmoji: cell.plantId.emoji || '🌿',
            plantName: cell.plantId.name,
            cellCount: 0,
          };
        }
        groups[key].cellCount++;
      });
      return Object.values(groups)
        .filter((g) => g.cellCount > 0)
        .sort((a, b) => a.plantName.localeCompare(b.plantName));
    });
}

export default function GardenPrintView({ ref, beds, gardenWidth, gardenHeight, gardenName }) {
  // Scale the cell size to fit the paper width — no CSS transform needed.
  // html2canvas handles plain px dimensions reliably; CSS transforms on
  // intermediate containers can cause coordinate offsets in html2canvas 1.4.x.
  const printCellPx = Math.min(CELL_PX, Math.floor(PAPER_PRINT_WIDTH_PX / (gardenWidth ?? 1)));
  const printGridWidth  = (gardenWidth  ?? 1) * printCellPx;
  const printGridHeight = (gardenHeight ?? 1) * printCellPx;
  const emojiFontSize   = Math.max(10, Math.floor(printCellPx * 0.65));

  const placedBeds    = beds.filter((b) => b.mapRow != null && b.mapCol != null);
  const shoppingRows  = deriveShoppingRows(beds);
  const today         = new Date().toISOString().split('T')[0];

  // Render into document.body via portal so the element is outside any inner
  // scroll container. html2canvas computes positions relative to the window
  // scroll (window.scrollY), so nesting inside a scrolled layout div causes
  // getBoundingClientRect() to return a negative top, shifting the canvas
  // origin and clipping the bottom of the capture.
  return createPortal(
    <div
      ref={ref}
      id="garden-print-view"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: 794,
        background: 'white',
        fontFamily: 'sans-serif',
        color: '#111',
      }}
    >
      {/* ── Page 1: Garden Map ─────────────────────────────────────────────── */}
      <div data-print-section="1" style={{ padding: '12px 0 0 0' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>
          {gardenName || 'Garden Map'}
        </h1>
        <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 12px 0' }}>
          {today} · {gardenWidth} × {gardenHeight} ft · {placedBeds.length} beds
        </p>

        {/* Grid — cell size is pre-scaled so no CSS transform is required */}
        <div className="garden-print-grid-wrapper" style={{ overflow: 'hidden', width: '100%' }}>
          <div
            className="garden-print-grid"
            style={{ position: 'relative', width: printGridWidth, height: printGridHeight }}
          >
            {/* Background dot grid */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
              width={printGridWidth}
              height={printGridHeight}
            >
              {Array.from({ length: (gardenHeight ?? 1) + 1 }, (_, r) =>
                Array.from({ length: (gardenWidth ?? 1) + 1 }, (_, c) => (
                  <circle
                    key={`${r}-${c}`}
                    cx={c * printCellPx}
                    cy={r * printCellPx}
                    r={1}
                    fill="#d1c4b0"
                    opacity={0.6}
                  />
                ))
              )}
            </svg>

            {/* Placed beds */}
            {placedBeds.map((bed) => {
              const bedW = bed.cols * printCellPx;
              const bedH = bed.rows * printCellPx;
              return (
                <div
                  key={bed._id}
                  style={{
                    position: 'absolute',
                    left: bed.mapCol * printCellPx,
                    top:  bed.mapRow * printCellPx,
                    width:  bedW,
                    height: bedH,
                    border: '1px solid #6b7280',
                    background: '#e5e7eb',
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Emoji cells — flex-wrap instead of CSS grid.
                      html2canvas 1.4.x has incomplete CSS Grid support which
                      causes cells to render at wrong positions. Flex-wrap with
                      explicit px dimensions is fully supported. */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width:  bedW,
                      height: bedH,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignContent: 'flex-start',
                    }}
                  >
                    {Array.from({ length: bed.rows * bed.cols }, (_, i) => {
                      const row  = Math.floor(i / bed.cols);
                      const col  = i % bed.cols;
                      const cell = bed.cells?.find((c) => c.row === row && c.col === col);
                      return (
                        <div
                          key={i}
                          style={{
                            width:       printCellPx,
                            height:      printCellPx,
                            flexShrink:  0,
                            display:     'flex',
                            alignItems:  'center',
                            justifyContent: 'center',
                            fontSize:    emojiFontSize,
                            lineHeight:  1,
                            fontFamily:  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif",
                          }}
                        >
                          {cell?.plantId?.emoji || ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Page 2: Shopping List ───────────────────────────────────────────── */}
      <div data-print-section="2" style={{ paddingTop: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px 0' }}>Shopping List</h2>

        {shoppingRows.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 13 }}>No plants to list.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Bed', 'Plant', 'Qty', '☐ Seed', '☐ Starts', '☐ Purchased'].map((h) => (
                  <th
                    key={h}
                    style={{
                      borderBottom: '2px solid #374151',
                      textAlign: 'left',
                      padding: '4px 8px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shoppingRows.map((row, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px' }}>
                    {row.bedName}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px' }}>
                    <span
                      style={{
                        fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif",
                        fontSize: 14,
                      }}
                    >
                      {row.plantEmoji}
                    </span>
                    {' '}{row.plantName}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', textAlign: 'center' }}>
                    {row.cellCount}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', textAlign: 'center', fontSize: 16 }}>
                    ☐
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', textAlign: 'center', fontSize: 16 }}>
                    ☐
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', textAlign: 'center', fontSize: 16 }}>
                    ☐
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>,
    document.body
  );
}
