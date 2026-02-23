import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ExternalLink, X } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import GardenDimensionsModal from '../components/GardenDimensionsModal';

const CELL_PX = 28; // pixels per sq ft

// Earthy colours per bed (cycles if more than 10)
const BED_COLORS = [
  { bg: 'bg-garden-200', border: 'border-garden-400', text: 'text-garden-800' },
  { bg: 'bg-harvest-200', border: 'border-harvest-400', text: 'text-harvest-800' },
  { bg: 'bg-soil-200',    border: 'border-soil-400',    text: 'text-soil-800'   },
  { bg: 'bg-green-200',   border: 'border-green-400',   text: 'text-green-800'  },
  { bg: 'bg-lime-200',    border: 'border-lime-400',    text: 'text-lime-800'   },
  { bg: 'bg-amber-200',   border: 'border-amber-400',   text: 'text-amber-800'  },
  { bg: 'bg-teal-200',    border: 'border-teal-400',    text: 'text-teal-800'   },
  { bg: 'bg-emerald-200', border: 'border-emerald-400', text: 'text-emerald-800'},
  { bg: 'bg-yellow-200',  border: 'border-yellow-400',  text: 'text-yellow-800' },
  { bg: 'bg-orange-200',  border: 'border-orange-400',  text: 'text-orange-800' },
];

// AABB overlap check — returns true if the two bed rectangles intersect
function bedsOverlap(a, b) {
  return (
    a.mapCol          < b.mapCol + b.cols &&
    a.mapCol + a.cols > b.mapCol &&
    a.mapRow          < b.mapRow + b.rows &&
    a.mapRow + a.rows > b.mapRow
  );
}

function useBeds() {
  return useQuery({
    queryKey: ['beds'],
    queryFn: () => api.get('/beds').then((r) => r.data),
  });
}

export default function GardenMap() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const gridRef = useRef(null);

  const { data: beds = [], isLoading } = useBeds();

  // Drag state
  const [dragging, setDragging] = useState(null);
  // { bedId, grabOffsetX, grabOffsetY, liveRow, liveCol, originRow, originCol }

  // Add Bed form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', rows: 2, cols: 2 });
  const [addError, setAddError] = useState('');

  const gardenWidth  = user?.gardenWidth  ?? null;
  const gardenHeight = user?.gardenHeight ?? null;
  const isOwner = user?.role === 'owner';

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createBed = useMutation({
    mutationFn: (body) => api.post('/beds', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      setShowAddForm(false);
      setAddForm({ name: '', rows: 2, cols: 2 });
      setAddError('');
    },
    onError: (err) => setAddError(err.response?.data?.error || 'Failed to create bed'),
  });

  const updatePosition = useMutation({
    mutationFn: ({ id, mapRow, mapCol }) =>
      api.put(`/beds/${id}`, { mapRow, mapCol }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beds'] }),
  });

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e, bed) => {
    if (!isOwner) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const bedLeft = (bed.mapCol ?? 0) * CELL_PX;
    const bedTop  = (bed.mapRow ?? 0) * CELL_PX;
    const grabOffsetX = e.clientX - gridRect.left - bedLeft;
    const grabOffsetY = e.clientY - gridRect.top  - bedTop;

    setDragging({
      bedId:        bed._id,
      grabOffsetX,
      grabOffsetY,
      liveRow:      bed.mapRow ?? 0,
      liveCol:      bed.mapCol ?? 0,
      originRow:    bed.mapRow,
      originCol:    bed.mapCol,
      startX:       e.clientX,
      startY:       e.clientY,
      didMove:      false,
    });
  }, [isOwner]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !gridRef.current) return;

    const dx = Math.abs(e.clientX - dragging.startX);
    const dy = Math.abs(e.clientY - dragging.startY);
    if (!dragging.didMove && dx < 8 && dy < 8) return;

    const gridRect = gridRef.current.getBoundingClientRect();
    const rawX = e.clientX - gridRect.left - dragging.grabOffsetX;
    const rawY = e.clientY - gridRect.top  - dragging.grabOffsetY;

    const draggedBed = beds.find((b) => b._id === dragging.bedId);
    if (!draggedBed) return;

    const snappedCol = Math.round(rawX / CELL_PX);
    const snappedRow = Math.round(rawY / CELL_PX);

    const clampedCol = Math.max(0, Math.min(snappedCol, (gardenWidth  ?? 0) - draggedBed.cols));
    const clampedRow = Math.max(0, Math.min(snappedRow, (gardenHeight ?? 0) - draggedBed.rows));

    setDragging((d) => ({ ...d, liveCol: clampedCol, liveRow: clampedRow, didMove: true }));
  }, [dragging, beds, gardenWidth, gardenHeight]);

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;

    if (!dragging.didMove) {
      setDragging(null);
      return;
    }

    const draggedBed = beds.find((b) => b._id === dragging.bedId);
    if (!draggedBed) { setDragging(null); return; }

    const proposed = {
      mapRow: dragging.liveRow,
      mapCol: dragging.liveCol,
      rows: draggedBed.rows,
      cols: draggedBed.cols,
    };

    const hasOverlap = beds
      .filter((b) => b._id !== dragging.bedId && b.mapRow != null && b.mapCol != null)
      .some((b) => bedsOverlap(proposed, b));

    setDragging(null);

    if (!hasOverlap) {
      updatePosition.mutate({ id: dragging.bedId, mapRow: dragging.liveRow, mapCol: dragging.liveCol });
    }
    // If overlap: bed reverts — React Query data hasn't changed
  }, [dragging, beds, updatePosition]);

  // ── Add Bed form ─────────────────────────────────────────────────────────────

  function handleCreateBed(e) {
    e.preventDefault();
    const rows = Number(addForm.rows);
    const cols = Number(addForm.cols);
    if (!addForm.name.trim()) { setAddError('Bed name is required'); return; }
    if (!Number.isInteger(rows) || rows < 1) { setAddError('Height must be a positive whole number'); return; }
    if (!Number.isInteger(cols) || cols < 1) { setAddError('Width must be a positive whole number'); return; }
    setAddError('');
    createBed.mutate({ name: addForm.name.trim(), rows, cols });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) return <p className="text-garden-500">Loading…</p>;

  // US1: Dimension gate — show setup modal for first-time users
  if (gardenWidth == null || gardenHeight == null) {
    return (
      <>
        <div>
          <h1 className="text-2xl font-bold text-garden-900 mb-2">Garden Map</h1>
          <p className="text-garden-500">Set up your garden size to get started.</p>
        </div>
        <GardenDimensionsModal onSave={(w, h) => updateUser({ gardenWidth: w, gardenHeight: h })} />
      </>
    );
  }

  const gridWidth  = gardenWidth  * CELL_PX;
  const gridHeight = gardenHeight * CELL_PX;

  const placedBeds   = beds.filter((b) => b.mapRow != null && b.mapCol != null);
  const unplacedBeds = beds.filter((b) => b.mapRow == null || b.mapCol == null);

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-garden-900">Garden Map</h1>
          <p className="text-garden-600 text-sm mt-0.5">
            {gardenWidth} × {gardenHeight} ft · {placedBeds.length} beds placed
            {isOwner && ' · drag to reposition'}
          </p>
        </div>
        {isOwner && (
          <button className="btn-primary" onClick={() => setShowAddForm((v) => !v)}>
            <Plus size={16} /> Add bed
          </button>
        )}
      </div>

      {/* Add Bed form */}
      {showAddForm && isOwner && (
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-garden-900">New garden bed</h2>
            <button
              className="text-garden-400 hover:text-garden-700 transition-colors"
              onClick={() => { setShowAddForm(false); setAddError(''); }}
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreateBed} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-40">
              <label className="label">Bed name</label>
              <input
                className="input"
                placeholder="e.g. Raised Bed 1"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="w-24">
              <label className="label">Width (ft)</label>
              <input
                className="input"
                type="number"
                min="1"
                max="50"
                value={addForm.cols}
                onChange={(e) => setAddForm((f) => ({ ...f, cols: e.target.value }))}
              />
            </div>
            <div className="w-24">
              <label className="label">Height (ft)</label>
              <input
                className="input"
                type="number"
                min="1"
                max="50"
                value={addForm.rows}
                onChange={(e) => setAddForm((f) => ({ ...f, rows: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={createBed.isPending}>
              {createBed.isPending ? 'Creating…' : 'Create'}
            </button>
          </form>
          {addError && <p className="text-red-500 text-sm mt-2">{addError}</p>}
        </div>
      )}

      {/* Scale ruler */}
      <div className="flex items-center gap-2 mb-4 text-xs text-garden-500">
        <span className="inline-block bg-garden-300 rounded" style={{ width: CELL_PX, height: 6 }} />
        <span>= 1 sq ft</span>
      </div>

      {/* Grid */}
      <div className="card p-4 overflow-auto">
        <div
          ref={gridRef}
          className="relative select-none"
          style={{ width: gridWidth, height: gridHeight }}
        >
          {/* Background grid dots */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={gridWidth}
            height={gridHeight}
          >
            {Array.from({ length: gardenHeight + 1 }, (_, r) =>
              Array.from({ length: gardenWidth + 1 }, (_, c) => (
                <circle
                  key={`${r}-${c}`}
                  cx={c * CELL_PX}
                  cy={r * CELL_PX}
                  r={1.5}
                  fill="#d1c4b0"
                  opacity={0.5}
                />
              ))
            )}
          </svg>

          {/* Placed beds */}
          {placedBeds.map((bed, idx) => {
            const isDragging = dragging?.bedId === bed._id;
            const colors = BED_COLORS[idx % BED_COLORS.length];
            const displayRow = isDragging ? dragging.liveRow : bed.mapRow;
            const displayCol = isDragging ? dragging.liveCol : bed.mapCol;
            const plantedCount = bed.cells?.filter((c) => c.plantId).length ?? 0;
            const totalCells = bed.rows * bed.cols;

            return (
              <div
                key={bed._id}
                className={`absolute rounded border-2 flex flex-col items-center justify-center
                  overflow-hidden ${colors.bg} ${colors.border}
                  ${isDragging ? 'opacity-70 shadow-lg z-10 cursor-grabbing' : isOwner ? 'cursor-grab' : ''}
                  transition-shadow`}
                style={{
                  left:        displayCol * CELL_PX,
                  top:         displayRow * CELL_PX,
                  width:       bed.cols   * CELL_PX,
                  height:      bed.rows   * CELL_PX,
                  touchAction: 'none',
                }}
                onPointerDown={(e) => handlePointerDown(e, bed)}
              >
                {/* Plant emoji preview */}
                {bed.rows >= 2 && bed.cols >= 2 && (
                  <div
                    className="absolute inset-0 grid opacity-40"
                    style={{
                      gridTemplateColumns: `repeat(${bed.cols}, ${CELL_PX}px)`,
                      gridTemplateRows:    `repeat(${bed.rows}, ${CELL_PX}px)`,
                    }}
                  >
                    {Array.from({ length: bed.rows * bed.cols }, (_, i) => {
                      const row = Math.floor(i / bed.cols);
                      const col = i % bed.cols;
                      const cell = bed.cells?.find((c) => c.row === row && c.col === col);
                      return (
                        <div key={i} className="flex items-center justify-center text-[10px] leading-none">
                          {cell?.plantId?.emoji || ''}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Open button — top-right corner */}
                <button
                  className={`absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100
                    hover:opacity-100 ${colors.text} hover:bg-white/30 transition-opacity z-20`}
                  style={{ touchAction: 'auto' }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/beds/${bed._id}`); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Open bed"
                >
                  <ExternalLink size={11} />
                </button>

                {/* Label */}
                <div className={`relative z-10 text-center px-1 ${colors.text}`}>
                  <p className="font-semibold leading-tight text-[11px]">
                    {bed.name.split(' — ')[1] || bed.name}
                  </p>
                  <p className="text-[10px] opacity-70 mt-0.5">{bed.rows}×{bed.cols} ft</p>
                  {plantedCount > 0 && (
                    <p className="text-[10px] opacity-70">{plantedCount}/{totalCells} planted</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unplaced beds staging area */}
      {unplacedBeds.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-garden-900 mb-2 text-sm">
            Unplaced beds
            <span className="ml-1 text-garden-500 font-normal">— drag onto the map to place</span>
          </h2>
          <div
            className="flex flex-wrap gap-3"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {unplacedBeds.map((bed) => {
              const isDragging = dragging?.bedId === bed._id;
              const allIdx = beds.indexOf(bed);
              const colors = BED_COLORS[allIdx % BED_COLORS.length];
              return (
                <div
                  key={bed._id}
                  className={`rounded border-2 flex flex-col items-center justify-center
                    ${colors.bg} ${colors.border} ${colors.text}
                    ${isDragging ? 'opacity-50 cursor-grabbing' : isOwner ? 'cursor-grab' : ''}
                    shadow-sm`}
                  style={{
                    width:       bed.cols * CELL_PX,
                    height:      bed.rows * CELL_PX,
                    minWidth:    64,
                    minHeight:   40,
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => handlePointerDown(e, bed)}
                >
                  <p className="font-semibold leading-tight text-[11px] px-1 text-center">
                    {bed.name.split(' — ')[1] || bed.name}
                  </p>
                  <p className="text-[10px] opacity-70">{bed.rows}×{bed.cols} ft</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-garden-400 mt-2">
            Tip: drag a bed tile onto the grid above to place it.
          </p>
        </div>
      )}

      {/* Placed beds legend */}
      {placedBeds.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-garden-900 mb-3 text-sm">Beds</h2>
          <div className="flex flex-wrap gap-2">
            {placedBeds.map((bed, idx) => {
              const colors = BED_COLORS[idx % BED_COLORS.length];
              return (
                <button
                  key={bed._id}
                  onClick={() => navigate(`/beds/${bed._id}`)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium
                    ${colors.bg} ${colors.border} ${colors.text} hover:brightness-95 transition-all`}
                >
                  <span className="w-2 h-2 rounded-full bg-current opacity-60" />
                  {bed.name.split(' — ')[1] || bed.name}
                  <span className="opacity-60">{bed.rows * bed.cols} sq ft</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
