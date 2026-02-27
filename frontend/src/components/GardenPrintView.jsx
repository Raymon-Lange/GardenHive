import { createPortal } from 'react-dom';

// ── PDF design constants ────────────────────────────────────────────────────
const PAPER_W_PX            = 816;   // 8.5" × 96 dpi (US Letter)
const PAPER_H_PX            = 1056;  // 11" × 96 dpi
const MARGIN_PX             = 48;    // 0.5" margins
const HEADER_H_PX           = 72;    // 0.75" header bar
const USABLE_W_PX           = 720;   // PAPER_W_PX - 2*MARGIN_PX
const USABLE_H_PX           = 888;   // PAPER_H_PX - HEADER_H_PX - 2*MARGIN_PX
const COMPACT_THRESHOLD_PX  = 18;    // px/ft — below this, plant labels fall below 8pt in PDF

const PDF_PALETTE = {
  bg:          '#F0FAF3',
  cardBorder:  '#52B788',
  headerBg:    '#2D6A4F',
  headerText:  '#FFFFFF',
  bodyText:    '#1B1B1B',
  muted:       '#6B7280',
  divider:     '#CDE8D5',
};

const CATEGORY_COLORS = {
  vegetable: '#BBF7D0',
  fruit:     '#FED7AA',
  herb:      '#FEF08A',
  flower:    '#FBCFE8',
};

function computeLayout(gardenWidth, gardenHeight) {
  const gw = gardenWidth  || 1;
  const gh = gardenHeight || 1;
  const scale         = Math.min(USABLE_W_PX / gw, USABLE_H_PX / gh);
  const mapH          = gh * scale;
  const isPaginated   = mapH > USABLE_H_PX;
  const stripHeightFt = isPaginated ? Math.floor(USABLE_H_PX / scale) : gh;
  const stripCount    = isPaginated ? Math.ceil(gh / stripHeightFt)   : 1;
  return { scale, isPaginated, stripCount, stripHeightFt };
}

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
            bedName:    bed.name,
            plantEmoji: cell.plantId.emoji || '🌿',
            plantName:  cell.plantId.name,
            cellCount:  0,
          };
        }
        groups[key].cellCount++;
      });
      return Object.values(groups)
        .filter((g) => g.cellCount > 0)
        .sort((a, b) => a.plantName.localeCompare(b.plantName));
    });
}

function abbreviate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function MapStrip({ beds, gardenWidth, gardenHeight, scale, stripIndex, stripHeightFt, stripCount, isPaginated }) {
  const compact   = scale < COMPACT_THRESHOLD_PX;
  const stripTopFt  = stripIndex * stripHeightFt;
  const stripBotFt  = Math.min(stripTopFt + stripHeightFt, gardenHeight || 1);
  const mapW      = (gardenWidth  || 1) * scale;
  const mapH      = (stripBotFt - stripTopFt) * scale;
  const today     = new Date().toISOString().split('T')[0];

  const bedsInStrip = beds.filter(
    (b) => b.mapRow != null && b.mapCol != null &&
           b.mapRow < stripBotFt && (b.mapRow + b.rows) > stripTopFt
  );

  return (
    <div
      data-print-section={isPaginated ? `map-${String(stripIndex + 1).padStart(2, '0')}` : 'map-01'}
      style={{
        width:      PAPER_W_PX,
        minHeight:  PAPER_H_PX,
        background: PDF_PALETTE.bg,
        fontFamily: 'sans-serif',
        boxSizing:  'border-box',
        position:   'relative',
      }}
    >
      {/* Header bar */}
      <div style={{
        height:     HEADER_H_PX,
        background: PDF_PALETTE.headerBg,
        padding:    '12px 24px',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing:  'border-box',
      }}>
        <div>
          <div style={{ color: PDF_PALETTE.headerText, fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
            {gardenWidth && gardenHeight
              ? `${gardenWidth} × ${gardenHeight} ft`
              : 'Garden Map'}
          </div>
          <div style={{ color: PDF_PALETTE.headerText, fontSize: 11, opacity: 0.85, marginTop: 2 }}>
            {today} · {beds.filter(b => b.mapRow != null).length} beds
          </div>
        </div>
        {isPaginated && (
          <div style={{ color: PDF_PALETTE.headerText, fontSize: 10, opacity: 0.75 }}>
            Map {stripIndex + 1} of {stripCount}
          </div>
        )}
      </div>

      {/* Map area */}
      <div style={{ padding: `${MARGIN_PX / 2}px ${MARGIN_PX}px` }}>
        <div style={{ position: 'relative', width: mapW, height: mapH }}>
          {/* Dot grid */}
          <svg
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            width={mapW}
            height={mapH}
          >
            {Array.from({ length: Math.ceil(stripBotFt - stripTopFt) + 1 }, (_, r) =>
              Array.from({ length: (gardenWidth || 1) + 1 }, (_, c) => (
                <circle
                  key={`${r}-${c}`}
                  cx={c * scale}
                  cy={r * scale}
                  r={1.5}
                  fill={PDF_PALETTE.divider}
                />
              ))
            )}
          </svg>

          {/* Bed cards */}
          {bedsInStrip.map((bed) => {
            const bedTopFt   = bed.mapRow - stripTopFt;
            const x          = bed.mapCol * scale;
            const y          = bedTopFt * scale;
            const w          = bed.cols * scale;
            const h          = bed.rows * scale;
            const isCompact  = compact;
            const emojiFontPx = Math.max(10, scale * 0.65);
            const labelFontPx = Math.max(6, scale * 0.30);

            const plantedCells = bed.cells?.filter(c => c.plantId) || [];

            return (
              <div
                key={bed._id}
                style={{
                  position:    'absolute',
                  left:        x,
                  top:         y,
                  width:       w,
                  height:      h,
                  border:      `1.5px solid ${PDF_PALETTE.cardBorder}`,
                  background:  PDF_PALETTE.bg,
                  borderRadius: 3,
                  overflow:    'hidden',
                  boxSizing:   'border-box',
                }}
              >
                {isCompact ? (
                  /* Compact mode */
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: 2, boxSizing: 'border-box',
                  }}>
                    <div style={{
                      fontSize: Math.max(6, scale * 0.28),
                      fontWeight: 700,
                      color: PDF_PALETTE.bodyText,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}>
                      {abbreviate(bed.name, 16)}
                    </div>
                    <div style={{
                      fontSize: Math.max(5, scale * 0.22),
                      color: PDF_PALETTE.muted,
                      textAlign: 'center',
                      marginTop: 1,
                    }}>
                      · {plantedCells.length} plants
                    </div>
                  </div>
                ) : (
                  /* Full detail mode */
                  <>
                    {/* Bed name label */}
                    <div style={{
                      position:   'absolute',
                      top:        2,
                      left:       4,
                      fontSize:   Math.max(7, scale * 0.22),
                      fontWeight: 700,
                      color:      PDF_PALETTE.headerBg,
                      zIndex:     2,
                      lineHeight: 1,
                      maxWidth:   w - 8,
                      overflow:   'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {abbreviate(bed.name, 16)}
                    </div>

                    {/* Plant cells */}
                    <div style={{
                      position:    'absolute',
                      top:         0,
                      left:        0,
                      width:       w,
                      height:      h,
                      display:     'flex',
                      flexWrap:    'wrap',
                      alignContent: 'flex-start',
                    }}>
                      {Array.from({ length: bed.rows * bed.cols }, (_, i) => {
                        const row  = Math.floor(i / bed.cols);
                        const col  = i % bed.cols;
                        const cell = bed.cells?.find((c) => c.row === row && c.col === col);
                        const plant = cell?.plantId;
                        const categoryColor = plant
                          ? (CATEGORY_COLORS[plant.category] ?? CATEGORY_COLORS.vegetable)
                          : 'transparent';
                        const shortName = plant ? abbreviate(plant.name, 12) : '';

                        return (
                          <div
                            key={i}
                            style={{
                              width:          scale,
                              height:         scale,
                              flexShrink:     0,
                              display:        'flex',
                              flexDirection:  'column',
                              alignItems:     'center',
                              justifyContent: 'center',
                              background:     categoryColor,
                              borderRight:    `0.5px solid ${PDF_PALETTE.divider}`,
                              borderBottom:   `0.5px solid ${PDF_PALETTE.divider}`,
                              boxSizing:      'border-box',
                              overflow:       'hidden',
                            }}
                          >
                            {plant && (
                              <>
                                <div style={{
                                  fontSize:   emojiFontPx,
                                  lineHeight: 1,
                                  fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif",
                                }}>
                                  {plant.emoji || '🌿'}
                                </div>
                                <div style={{
                                  fontSize:   labelFontPx,
                                  lineHeight: 1,
                                  color:      PDF_PALETTE.bodyText,
                                  textAlign:  'center',
                                  maxWidth:   scale - 2,
                                  overflow:   'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {shortName}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChecklistPage({ beds }) {
  const shoppingRows = deriveShoppingRows(beds);
  const today        = new Date().toISOString().split('T')[0];
  const totalCells   = shoppingRows.reduce((s, r) => s + r.cellCount, 0);
  const totalVarieties = new Set(shoppingRows.map((r) => r.plantName)).size;

  return (
    <div
      data-print-section="checklist"
      style={{
        width:      PAPER_W_PX,
        minHeight:  PAPER_H_PX,
        background: PDF_PALETTE.bg,
        fontFamily: 'sans-serif',
        boxSizing:  'border-box',
      }}
    >
      {/* Header bar */}
      <div style={{
        height:     HEADER_H_PX,
        background: PDF_PALETTE.headerBg,
        padding:    '12px 24px',
        display:    'flex',
        alignItems: 'center',
        boxSizing:  'border-box',
      }}>
        <div style={{ color: PDF_PALETTE.headerText, fontSize: 20, fontWeight: 700 }}>
          Shopping List
        </div>
      </div>

      <div style={{ padding: `${MARGIN_PX / 2}px ${MARGIN_PX}px` }}>
        {shoppingRows.length === 0 ? (
          <p style={{ color: PDF_PALETTE.muted, fontSize: 13 }}>No plants to list.</p>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: PDF_PALETTE.headerBg }}>
                  {['Bed', 'Plant', 'Qty', '☐ Seed', '☐ Starts', '☐ Purchased'].map((h) => (
                    <th
                      key={h}
                      style={{
                        color:      PDF_PALETTE.headerText,
                        textAlign:  'left',
                        padding:    '6px 8px',
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
                  <tr key={i} style={{ background: i % 2 === 0 ? '#FFFFFF' : PDF_PALETTE.bg }}>
                    <td style={{ borderBottom: `1px solid ${PDF_PALETTE.divider}`, padding: '5px 8px', color: PDF_PALETTE.bodyText }}>
                      {row.bedName}
                    </td>
                    <td style={{ borderBottom: `1px solid ${PDF_PALETTE.divider}`, padding: '5px 8px', color: PDF_PALETTE.bodyText }}>
                      <span style={{ fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif", fontSize: 14 }}>
                        {row.plantEmoji}
                      </span>
                      {' '}{row.plantName}
                    </td>
                    <td style={{ borderBottom: `1px solid ${PDF_PALETTE.divider}`, padding: '5px 8px', textAlign: 'center', color: PDF_PALETTE.bodyText }}>
                      {row.cellCount}
                    </td>
                    <td style={{ borderBottom: `1px solid ${PDF_PALETTE.divider}`, padding: '5px 8px', textAlign: 'center', fontSize: 16 }}>☐</td>
                    <td style={{ borderBottom: `1px solid ${PDF_PALETTE.divider}`, padding: '5px 8px', textAlign: 'center', fontSize: 16 }}>☐</td>
                    <td style={{ borderBottom: `1px solid ${PDF_PALETTE.divider}`, padding: '5px 8px', textAlign: 'center', fontSize: 16 }}>☐</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{
              borderTop:   `1px solid ${PDF_PALETTE.cardBorder}`,
              marginTop:   8,
              paddingTop:  8,
              textAlign:   'right',
              fontSize:    12,
              fontWeight:  700,
              color:       PDF_PALETTE.bodyText,
            }}>
              {totalVarieties} {totalVarieties === 1 ? 'variety' : 'varieties'} · {totalCells} plants total
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{
          position:   'absolute',
          bottom:     MARGIN_PX / 2,
          right:      MARGIN_PX,
          fontSize:   10,
          color:      PDF_PALETTE.muted,
        }}>
          Generated: {today}
        </div>
      </div>
    </div>
  );
}

export default function GardenPrintView({ ref, beds, gardenWidth, gardenHeight, gardenName }) {
  const { scale, isPaginated, stripCount, stripHeightFt } = computeLayout(gardenWidth, gardenHeight);
  const placedBeds = beds.filter((b) => b.mapRow != null && b.mapCol != null);

  return createPortal(
    <div
      ref={ref}
      id="garden-print-view"
      style={{
        position:   'absolute',
        left:       '-9999px',
        top:        0,
        background: PDF_PALETTE.bg,
        fontFamily: 'sans-serif',
      }}
    >
      {Array.from({ length: stripCount }, (_, i) => (
        <MapStrip
          key={i}
          beds={placedBeds}
          gardenWidth={gardenWidth}
          gardenHeight={gardenHeight}
          scale={scale}
          stripIndex={i}
          stripHeightFt={stripHeightFt}
          stripCount={stripCount}
          isPaginated={isPaginated}
        />
      ))}
      <ChecklistPage beds={beds} gardenName={gardenName} />
    </div>,
    document.body
  );
}
