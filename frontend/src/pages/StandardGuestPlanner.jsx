import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Plus, Trash2, Download, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import AppLayout from '../components/AppLayout';
import GardenPrintView from '../components/GardenPrintView';
import api from '../lib/api';

// ── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY   = 'gh_guest_garden';
const CELL_PX       = 28;
const DEFAULT_GARDEN = { gardenWidth: 10, gardenHeight: 10, beds: [] };

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function bedsOverlap(a, b) {
  return (
    a.mapCol              < b.mapCol + b.cols &&
    a.mapCol + a.cols     > b.mapCol &&
    a.mapRow              < b.mapRow + b.rows &&
    a.mapRow + a.rows     > b.mapRow
  );
}

function findPosition(garden, newBed) {
  for (let r = 0; r <= garden.gardenHeight - newBed.rows; r++) {
    for (let c = 0; c <= garden.gardenWidth - newBed.cols; c++) {
      const candidate = { mapRow: r, mapCol: c, rows: newBed.rows, cols: newBed.cols };
      const overlaps = garden.beds.some((b) => bedsOverlap(candidate, b));
      if (!overlaps) return { mapRow: r, mapCol: c };
    }
  }
  return { mapRow: 0, mapCol: 0 }; // fallback — show warning
}

function loadGarden() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_GARDEN;
  } catch {
    return null; // localStorage unavailable
  }
}

function saveGarden(garden) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(garden));
    return true;
  } catch {
    return false;
  }
}

// ── usePublicPlants ───────────────────────────────────────────────────────────
function usePublicPlants() {
  return useQuery({
    queryKey: ['plants', 'public'],
    queryFn: () => api.get('/plants/public').then((r) => r.data),
  });
}

// ── PlantPicker ───────────────────────────────────────────────────────────────
function PlantPicker({ onSelect, onClear, hasPlant, onClose }) {
  const { data: plants = [] } = usePublicPlants();
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('');

  const filtered = plants.filter((p) => {
    if (category && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-garden-100">
          <h2 className="font-semibold text-garden-900">Choose a plant</h2>
          <button onClick={onClose} className="text-garden-400 hover:text-garden-700">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 pt-3 pb-2 space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-garden-400" />
            <input
              className="input pl-8 text-sm"
              placeholder="Search plants…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['', 'vegetable', 'fruit', 'herb'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  category === cat
                    ? 'bg-garden-600 text-white'
                    : 'bg-garden-100 text-garden-700 hover:bg-garden-200'
                )}
              >
                {cat || 'All'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {hasPlant && (
            <button
              onClick={onClear}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors mb-2"
            >
              <X size={16} /> Remove plant
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="text-center text-garden-500 text-sm py-6">No plants found</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((plant) => (
                <button
                  key={plant._id}
                  onClick={() => onSelect(plant)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-garden-50 transition-colors text-left"
                >
                  <span className="text-xl w-8 text-center shrink-0">{plant.emoji || '🌿'}</span>
                  <div>
                    <p className="font-medium text-garden-900">{plant.name}</p>
                    {plant.category && (
                      <p className="text-xs text-garden-500 capitalize">{plant.category}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CellEditorModal ───────────────────────────────────────────────────────────
function CellEditorModal({ bed, onClose, onUpdateCells }) {
  const [pickerCell, setPickerCell] = useState(null);

  const selectedCellPlant = pickerCell
    ? bed.cells.find((c) => c.row === pickerCell.row && c.col === pickerCell.col)?.plant
    : null;

  function handleSelect(plant) {
    const { row, col } = pickerCell;
    const cells = bed.cells.filter((c) => !(c.row === row && c.col === col));
    cells.push({ row, col, plant });
    onUpdateCells(cells);
    setPickerCell(null);
  }

  function handleClear() {
    const { row, col } = pickerCell;
    onUpdateCells(bed.cells.filter((c) => !(c.row === row && c.col === col)));
    setPickerCell(null);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-garden-100">
          <div>
            <h2 className="font-semibold text-garden-900">{bed.name || 'Bed'}</h2>
            <p className="text-xs text-garden-500 mt-0.5">
              {bed.rows} × {bed.cols} ft · {bed.cells.length} plant{bed.cells.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-garden-400 hover:text-garden-700">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-auto p-5 flex-1">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${bed.cols}, 3.5rem)` }}
          >
            {Array.from({ length: bed.rows * bed.cols }, (_, i) => {
              const row  = Math.floor(i / bed.cols);
              const col  = i % bed.cols;
              const cell = bed.cells.find((c) => c.row === row && c.col === col);
              return (
                <button
                  key={i}
                  onClick={() => setPickerCell({ row, col })}
                  className={clsx(
                    'w-14 h-14 rounded border-2 flex items-center justify-center text-2xl transition-colors',
                    cell
                      ? 'bg-garden-100 border-garden-400 hover:bg-garden-200'
                      : 'bg-white border-garden-200 hover:bg-garden-50 hover:border-garden-300'
                  )}
                  title={cell ? `${cell.plant.name} — click to change` : 'Click to add plant'}
                >
                  {cell
                    ? (cell.plant.emoji || '🌿')
                    : <span className="text-garden-300 text-base">+</span>
                  }
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {pickerCell && (
        <PlantPicker
          onSelect={handleSelect}
          onClear={handleClear}
          hasPlant={!!selectedCellPlant}
          onClose={() => setPickerCell(null)}
        />
      )}
    </div>
  );
}

// ── StandardGuestPlanner ──────────────────────────────────────────────────────
export default function StandardGuestPlanner() {
  const navigate      = useNavigate();
  const printViewRef  = useRef(null);
  const storageAvailable = useRef(null);

  const [garden, setGarden] = useState(() => {
    const g = loadGarden();
    if (g === null) {
      storageAvailable.current = false;
      return { ...DEFAULT_GARDEN };
    }
    storageAvailable.current = true;
    return g;
  });

  const [addForm, setAddForm]       = useState({ name: '', rows: 2, cols: 4 });
  const [addError, setAddError]     = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBedId, setEditingBedId] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showDimForm, setShowDimForm] = useState(false);
  const [dimForm, setDimForm]       = useState({ w: '', h: '' });

  // Auto-save on every change
  useEffect(() => {
    if (storageAvailable.current !== false) {
      const ok = saveGarden(garden);
      if (!ok) storageAvailable.current = false;
    }
  }, [garden]);

  // ── Dimension editing ─────────────────────────────────────────────────────
  function handleDimSave(e) {
    e.preventDefault();
    const w = Number(dimForm.w);
    const h = Number(dimForm.h);
    if (!Number.isInteger(w) || w < 1) return;
    if (!Number.isInteger(h) || h < 1) return;
    setGarden((g) => ({ ...g, gardenWidth: w, gardenHeight: h }));
    setShowDimForm(false);
  }

  // ── Add bed ───────────────────────────────────────────────────────────────
  function handleAddBed(e) {
    e.preventDefault();
    const rows = Number(addForm.rows);
    const cols = Number(addForm.cols);
    if (!addForm.name.trim()) { setAddError('Bed name is required'); return; }
    if (!Number.isInteger(rows) || rows < 1) { setAddError('Height must be a positive whole number'); return; }
    if (!Number.isInteger(cols) || cols < 1) { setAddError('Width must be a positive whole number'); return; }
    if (rows > garden.gardenHeight || cols > garden.gardenWidth) {
      setAddError('Bed is larger than the garden — reduce size or increase garden dimensions');
      return;
    }

    const newBed = { id: generateId(), name: addForm.name.trim(), rows, cols, cells: [] };
    const pos    = findPosition(garden, newBed);
    const bedWithPos = { ...newBed, ...pos };

    setGarden((g) => ({ ...g, beds: [...g.beds, bedWithPos] }));
    setAddForm({ name: '', rows: 2, cols: 4 });
    setAddError('');
    setShowAddForm(false);
  }

  // ── Remove bed ────────────────────────────────────────────────────────────
  function handleRemoveBed(id) {
    setGarden((g) => ({ ...g, beds: g.beds.filter((b) => b.id !== id) }));
  }

  // ── Update cells ──────────────────────────────────────────────────────────
  function handleUpdateCells(bedId, cells) {
    setGarden((g) => ({
      ...g,
      beds: g.beds.map((b) => b.id === bedId ? { ...b, cells } : b),
    }));
  }

  // ── Sign up to save ───────────────────────────────────────────────────────
  function handleSignupToSave() {
    navigate('/signup');
  }

  // ── PDF download ──────────────────────────────────────────────────────────
  async function handleDownloadPdf() {
    if (!printViewRef.current) return;
    setIsPdfLoading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const sections = Array.from(
        printViewRef.current.querySelectorAll('[data-print-section]')
      ).sort((a, b) => a.dataset.printSection.localeCompare(b.dataset.printSection));

      let firstPage = true;
      for (const section of sections) {
        const canvas  = await html2canvas(section, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const PAGE_W  = pdf.internal.pageSize.getWidth();
        const PAGE_H  = pdf.internal.pageSize.getHeight();
        const imgH    = (canvas.height * PAGE_W) / canvas.width;
        if (!firstPage) pdf.addPage();
        firstPage = false;
        if (imgH <= PAGE_H) {
          pdf.addImage(imgData, 'PNG', 0, 0, PAGE_W, imgH);
        } else {
          const slicePx = Math.floor((PAGE_H / imgH) * canvas.height);
          let offsetPx  = 0;
          let firstSlice = true;
          while (offsetPx < canvas.height) {
            if (!firstSlice) pdf.addPage();
            firstSlice = false;
            const chunkPx = Math.min(slicePx, canvas.height - offsetPx);
            const chunk   = document.createElement('canvas');
            chunk.width   = canvas.width;
            chunk.height  = chunkPx;
            chunk.getContext('2d').drawImage(canvas, 0, offsetPx, canvas.width, chunkPx, 0, 0, canvas.width, chunkPx);
            pdf.addImage(chunk.toDataURL('image/png'), 'PNG', 0, 0, PAGE_W, (chunkPx * PAGE_W) / canvas.width);
            offsetPx += chunkPx;
          }
        }
      }
      pdf.save(`garden-plan-${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setIsPdfLoading(false);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const gridW     = garden.gardenWidth  * CELL_PX;
  const gridH     = garden.gardenHeight * CELL_PX;
  const hasPlants = garden.beds.some((b) => b.cells.length > 0);
  const editingBed = editingBedId ? garden.beds.find((b) => b.id === editingBedId) : null;

  const printBeds = garden.beds.map((b) => ({
    ...b,
    _id:   b.id,
    cells: b.cells.map((c) => ({ row: c.row, col: c.col, plantId: c.plant })),
  }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      {/* Storage unavailable warning */}
      {storageAvailable.current === false && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-4 text-sm text-amber-800">
          <AlertTriangle size={15} />
          Your browser storage is unavailable — your plan cannot be saved between sessions.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-garden-900">Free Garden Planner</h1>
          <p className="text-garden-600 text-sm mt-0.5">
            {garden.gardenWidth} × {garden.gardenHeight} ft ·{' '}
            {garden.beds.length} bed{garden.beds.length !== 1 ? 's' : ''} ·{' '}
            <button
              onClick={() => {
                setDimForm({ w: String(garden.gardenWidth), h: String(garden.gardenHeight) });
                setShowDimForm((v) => !v);
              }}
              className="underline text-garden-500 hover:text-garden-700"
            >
              change size
            </button>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={handleDownloadPdf}
            disabled={!hasPlants || isPdfLoading}
            title={!hasPlants ? 'Add at least one plant to download' : undefined}
          >
            <Download size={15} />
            {isPdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
          <button className="btn-primary" onClick={handleSignupToSave}>
            Sign up to save
          </button>
        </div>
      </div>

      {/* Dimensions form */}
      {showDimForm && (
        <div className="card p-4 mb-4">
          <form onSubmit={handleDimSave} className="flex flex-wrap gap-4 items-end">
            <div className="w-28">
              <label className="label">Width (ft)</label>
              <input
                className="input"
                type="number"
                min="1"
                value={dimForm.w}
                onChange={(e) => setDimForm((f) => ({ ...f, w: e.target.value }))}
              />
            </div>
            <div className="w-28">
              <label className="label">Height (ft)</label>
              <input
                className="input"
                type="number"
                min="1"
                value={dimForm.h}
                onChange={(e) => setDimForm((f) => ({ ...f, h: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" className="btn-secondary" onClick={() => setShowDimForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Bed form */}
      <div className="mb-4">
        {!showAddForm ? (
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} /> Add bed
          </button>
        ) : (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-garden-900">New garden bed</h2>
              <button
                className="text-garden-400 hover:text-garden-700"
                onClick={() => { setShowAddForm(false); setAddError(''); }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddBed} className="flex flex-wrap gap-4 items-end">
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
              <button type="submit" className="btn-primary">Add</button>
            </form>
            {addError && <p className="text-red-500 text-sm mt-2">{addError}</p>}
          </div>
        )}
      </div>

      {/* Scale ruler */}
      {garden.beds.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-xs text-garden-500">
          <span className="inline-block bg-garden-300 rounded" style={{ width: CELL_PX, height: 6 }} />
          <span>= 1 sq ft</span>
        </div>
      )}

      {/* Garden grid */}
      {garden.beds.length > 0 && (
        <div className="card p-4 overflow-auto mb-4">
          <div className="relative select-none" style={{ width: gridW, height: gridH }}>
            {/* Dot grid */}
            <svg className="absolute inset-0 pointer-events-none" width={gridW} height={gridH}>
              {Array.from({ length: garden.gardenHeight + 1 }, (_, r) =>
                Array.from({ length: garden.gardenWidth + 1 }, (_, c) => (
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

            {/* Bed tiles */}
            {garden.beds.map((bed) => {
              const plantedCount = bed.cells.length;
              const totalCells   = bed.rows * bed.cols;
              return (
                <div
                  key={bed.id}
                  className="absolute rounded border-2 bg-garden-100 border-garden-400 cursor-pointer hover:bg-garden-200 transition-colors overflow-hidden"
                  style={{
                    left:   bed.mapCol * CELL_PX,
                    top:    bed.mapRow * CELL_PX,
                    width:  bed.cols   * CELL_PX,
                    height: bed.rows   * CELL_PX,
                  }}
                  onClick={() => setEditingBedId(bed.id)}
                  title={`${bed.name} — click to plant`}
                >
                  {/* Plant emoji preview */}
                  <div
                    className="absolute inset-0 grid opacity-50"
                    style={{
                      gridTemplateColumns: `repeat(${bed.cols}, ${CELL_PX}px)`,
                      gridTemplateRows:    `repeat(${bed.rows}, ${CELL_PX}px)`,
                    }}
                  >
                    {Array.from({ length: bed.rows * bed.cols }, (_, i) => {
                      const row  = Math.floor(i / bed.cols);
                      const col  = i % bed.cols;
                      const cell = bed.cells.find((c) => c.row === row && c.col === col);
                      return (
                        <div key={i} className="flex items-center justify-center text-[10px] leading-none">
                          {cell?.plant.emoji || ''}
                        </div>
                      );
                    })}
                  </div>
                  <div className="relative z-10 flex flex-col items-center justify-center h-full px-1 text-center">
                    <p className="font-semibold text-garden-800 leading-tight text-[11px]">{bed.name}</p>
                    <p className="text-[10px] text-garden-600 opacity-70">{bed.rows}×{bed.cols} ft</p>
                    {plantedCount > 0 && (
                      <p className="text-[10px] text-garden-600 opacity-70">{plantedCount}/{totalCells} planted</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Beds list */}
      {garden.beds.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold text-garden-900 mb-2 text-sm">Beds</h2>
          <div className="flex flex-wrap gap-2">
            {garden.beds.map((bed) => (
              <div
                key={bed.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-garden-100 border-garden-400 text-xs font-medium text-garden-800"
              >
                <button
                  onClick={() => setEditingBedId(bed.id)}
                  className="hover:underline"
                >
                  {bed.name}
                  <span className="ml-1 text-garden-500 font-normal opacity-70">
                    {bed.rows}×{bed.cols} ft
                  </span>
                </button>
                <button
                  onClick={() => handleRemoveBed(bed.id)}
                  className="text-garden-400 hover:text-red-500 transition-colors"
                  title="Remove bed"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {garden.beds.length === 0 && (
        <div className="card p-8 text-center text-garden-500">
          <p className="mb-2 font-medium text-garden-700">No beds yet</p>
          <p className="text-sm">Click "Add bed" above to start planning your garden.</p>
        </div>
      )}

      {/* Cell editor modal */}
      {editingBed && (
        <CellEditorModal
          bed={editingBed}
          onClose={() => setEditingBedId(null)}
          onUpdateCells={(cells) => handleUpdateCells(editingBedId, cells)}
        />
      )}

      {/* Hidden print view */}
      <GardenPrintView
        ref={printViewRef}
        beds={printBeds}
        gardenWidth={garden.gardenWidth}
        gardenHeight={garden.gardenHeight}
        gardenName="My Garden Plan"
      />
    </AppLayout>
  );
}
