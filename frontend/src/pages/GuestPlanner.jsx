import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Download } from 'lucide-react';
import clsx from 'clsx';
import AppLayout from '../components/AppLayout';
import GardenPrintView from '../components/GardenPrintView';
import api from '../lib/api';

function usePublicPlants() {
  return useQuery({
    queryKey: ['plants', 'public'],
    queryFn: () => api.get('/plants/public').then((r) => r.data),
  });
}

function PlantPicker({ onSelect, onClear, hasPlant, onClose }) {
  const { data: plants = [] } = usePublicPlants();
  const [search, setSearch] = useState('');
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

export default function GuestPlanner() {
  const navigate = useNavigate();
  const printViewRef = useRef(null);
  const [bed, setBed] = useState({ name: '', rows: null, cols: null, cells: [] });
  const [formState, setFormState] = useState({ name: '', rows: '', cols: '' });
  const [formError, setFormError] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [pickerCell, setPickerCell] = useState(null); // { row, col } | null
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const hasPlants = bed.cells.length > 0;

  function handleSetup(e) {
    e.preventDefault();
    const rows = Number(formState.rows);
    const cols = Number(formState.cols);
    if (!Number.isInteger(rows) || rows < 1) {
      setFormError('Rows must be a positive whole number');
      return;
    }
    if (!Number.isInteger(cols) || cols < 1) {
      setFormError('Columns must be a positive whole number');
      return;
    }
    setFormError('');
    setBed({ name: formState.name.trim(), rows, cols, cells: [] });
    setIsSetup(true);
  }

  function handlePickerSelect(plant) {
    const { row, col } = pickerCell;
    setBed((b) => {
      const cells = b.cells.filter((c) => !(c.row === row && c.col === col));
      cells.push({ row, col, plant });
      return { ...b, cells };
    });
    setPickerCell(null);
  }

  function handlePickerClear() {
    const { row, col } = pickerCell;
    setBed((b) => ({
      ...b,
      cells: b.cells.filter((c) => !(c.row === row && c.col === col)),
    }));
    setPickerCell(null);
  }

  function handleSignupToSave() {
    sessionStorage.setItem('gh_guest_bed', JSON.stringify(bed));
    navigate('/signup');
  }

  async function handleDownloadPdf() {
    if (!printViewRef.current) return;
    setIsPdfLoading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const printScale = Math.min(1, 794 / (bed.cols * 28));
      printViewRef.current.style.setProperty('--print-scale', printScale);

      const section1 = printViewRef.current.querySelector('[data-print-section="1"]');
      const section2 = printViewRef.current.querySelector('[data-print-section="2"]');

      const canvas1 = await html2canvas(section1, { scale: 2, useCORS: true, logging: false });
      const canvas2 = await html2canvas(section2, { scale: 2, useCORS: true, logging: false });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const PAGE_W = pdf.internal.pageSize.getWidth();
      const PAGE_H = pdf.internal.pageSize.getHeight();

      const img1 = canvas1.toDataURL('image/png');
      const h1 = (canvas1.height * PAGE_W) / canvas1.width;
      pdf.addImage(img1, 'PNG', 0, 0, PAGE_W, Math.min(h1, PAGE_H));

      pdf.addPage();
      const totalH2 = (canvas2.height * PAGE_W) / canvas2.width;
      if (totalH2 <= PAGE_H) {
        pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, PAGE_W, totalH2);
      } else {
        const sliceHeightPx = Math.floor((PAGE_H / totalH2) * canvas2.height);
        let offsetPx = 0;
        let firstPage = true;
        while (offsetPx < canvas2.height) {
          if (!firstPage) pdf.addPage();
          firstPage = false;
          const chunkPx = Math.min(sliceHeightPx, canvas2.height - offsetPx);
          const chunkCanvas = document.createElement('canvas');
          chunkCanvas.width = canvas2.width;
          chunkCanvas.height = chunkPx;
          chunkCanvas.getContext('2d').drawImage(
            canvas2, 0, offsetPx, canvas2.width, chunkPx, 0, 0, canvas2.width, chunkPx
          );
          const chunkH = (chunkPx * PAGE_W) / canvas2.width;
          pdf.addImage(chunkCanvas.toDataURL('image/png'), 'PNG', 0, 0, PAGE_W, chunkH);
          offsetPx += chunkPx;
        }
      }

      const slug = (bed.name || 'garden-plan')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`${slug}-${dateStr}.pdf`);
    } finally {
      setIsPdfLoading(false);
    }
  }

  // Transform guest cells for GardenPrintView which expects plantId not plant
  const printBed = isSetup ? {
    _id: 'guest',
    name: bed.name || 'My Garden Plan',
    rows: bed.rows,
    cols: bed.cols,
    mapRow: 0,
    mapCol: 0,
    cells: bed.cells.map((c) => ({ row: c.row, col: c.col, plantId: c.plant })),
  } : null;

  // ── Setup form ───────────────────────────────────────────────────────────────

  if (!isSetup) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-garden-900 mb-1">Free Garden Planner</h1>
          <p className="text-garden-600 text-sm mb-6">
            Design a garden bed without an account. Sign up to save your work.
          </p>
          <div className="card p-6">
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="label">
                  Bed name <span className="text-garden-400 font-normal">(optional)</span>
                </label>
                <input
                  className="input"
                  placeholder="e.g. Raised Bed 1"
                  value={formState.name}
                  onChange={(e) => setFormState((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="label">Rows <span className="text-red-500">*</span></label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="e.g. 4"
                    value={formState.rows}
                    onChange={(e) => setFormState((f) => ({ ...f, rows: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="label">Columns <span className="text-red-500">*</span></label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="e.g. 3"
                    value={formState.cols}
                    onChange={(e) => setFormState((f) => ({ ...f, cols: e.target.value }))}
                  />
                </div>
              </div>
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <button type="submit" className="btn-primary w-full">
                Start planning
              </button>
            </form>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Grid view ────────────────────────────────────────────────────────────────

  const selectedCellPlant = pickerCell
    ? bed.cells.find((c) => c.row === pickerCell.row && c.col === pickerCell.col)?.plant
    : null;

  return (
    <AppLayout>
      {/* Unsaved warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-sm text-amber-800">
        Your layout is not saved and will be lost if you leave this page.{' '}
        {hasPlants && (
          <button
            onClick={handleSignupToSave}
            className="underline font-medium hover:text-amber-900"
          >
            Sign up to save
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-garden-900">
            {bed.name || 'My Garden Bed'}
          </h1>
          <p className="text-garden-600 text-sm mt-0.5">
            {bed.rows} × {bed.cols} ft · {bed.cells.length} plant{bed.cells.length !== 1 ? 's' : ''} placed
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={handleDownloadPdf}
            disabled={!hasPlants || isPdfLoading}
            title={!hasPlants ? 'Place at least one plant to download' : undefined}
          >
            <Download size={15} />
            {isPdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
          {hasPlants && (
            <button className="btn-primary" onClick={handleSignupToSave}>
              Sign up to save
            </button>
          )}
        </div>
      </div>

      {/* Bed grid */}
      <div className="card p-4 overflow-auto">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${bed.cols}, 3.5rem)` }}
        >
          {Array.from({ length: bed.rows * bed.cols }, (_, i) => {
            const row = Math.floor(i / bed.cols);
            const col = i % bed.cols;
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

      {/* Plant picker modal */}
      {pickerCell && (
        <PlantPicker
          onSelect={handlePickerSelect}
          onClear={handlePickerClear}
          hasPlant={!!selectedCellPlant}
          onClose={() => setPickerCell(null)}
        />
      )}

      {/* Hidden print view for PDF export */}
      {printBed && (
        <GardenPrintView
          ref={printViewRef}
          beds={[printBed]}
          gardenWidth={bed.cols}
          gardenHeight={bed.rows}
          gardenName={bed.name || 'My Garden Plan'}
        />
      )}
    </AppLayout>
  );
}
