import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Leaf, Copy, Upload } from 'lucide-react';
import api from '../lib/api';
import { useGarden } from '../context/GardenContext';

const CSV_TEMPLATE = 'Bed Name,Rows,Cols\nFront Bed,4,6\nSide Bed,2,4\n';

export default function NewGardenModal({ onClose }) {
  const queryClient = useQueryClient();
  const { setCurrentGardenId, gardens } = useGarden();
  const [tab, setTab] = useState('blank'); // 'blank' | 'copy' | 'csv'
  const [form, setForm] = useState({ name: '', gardenWidth: '', gardenHeight: '' });
  const [copyForm, setCopyForm] = useState({ name: '', sourceGardenId: '' });
  const [csvName, setCsvName] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null); // { bedsCreated, errors }
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const createGarden = useMutation({
    mutationFn: (body) => api.post('/gardens', body).then((r) => r.data),
    onSuccess: async (garden) => {
      await queryClient.invalidateQueries({ queryKey: ['gardens'] });
      await setCurrentGardenId(garden._id);
      onClose();
    },
  });

  const importGarden = useMutation({
    mutationFn: async ({ name, file }) => {
      const data = new FormData();
      data.append('name', name);
      data.append('file', file);
      return api.post('/gardens/import', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['gardens'] });
      await setCurrentGardenId(result.garden._id);
      if (result.errors?.length) {
        setCsvResult(result);
      } else {
        onClose();
      }
    },
  });

  function switchTab(t) {
    setTab(t);
    setErrors({});
    setCsvResult(null);
    createGarden.reset();
    importGarden.reset();
  }

  function validateBlank() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Garden name is required';
    if (form.gardenWidth !== '') {
      const w = Number(form.gardenWidth);
      if (!Number.isInteger(w) || w < 1) errs.gardenWidth = 'Enter a whole number greater than 0';
    }
    if (form.gardenHeight !== '') {
      const h = Number(form.gardenHeight);
      if (!Number.isInteger(h) || h < 1) errs.gardenHeight = 'Enter a whole number greater than 0';
    }
    return errs;
  }

  function handleBlankSubmit(e) {
    e.preventDefault();
    const errs = validateBlank();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    createGarden.mutate({
      name: form.name.trim(),
      gardenWidth:  form.gardenWidth  !== '' ? Number(form.gardenWidth)  : undefined,
      gardenHeight: form.gardenHeight !== '' ? Number(form.gardenHeight) : undefined,
    });
  }

  function handleCopySubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!copyForm.name.trim()) errs.copyName = 'Garden name is required';
    if (!copyForm.sourceGardenId) errs.sourceGardenId = 'Select a garden to copy';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    createGarden.mutate({
      name: copyForm.name.trim(),
      sourceGardenId: copyForm.sourceGardenId,
    });
  }

  function handleCsvSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!csvName.trim()) errs.csvName = 'Garden name is required';
    if (!csvFile) errs.csvFile = 'Select a CSV file';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    importGarden.mutate({ name: csvName.trim(), file: csvFile });
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'garden-beds-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Leaf size={22} className="text-garden-600" />
            <h2 className="text-xl font-bold text-garden-900">New garden plan</h2>
          </div>
          <button onClick={onClose} className="text-garden-400 hover:text-garden-700 transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-garden-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => switchTab('blank')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-md transition-colors ${
              tab === 'blank' ? 'bg-white text-garden-900 shadow-sm font-medium' : 'text-garden-600 hover:text-garden-800'
            }`}
          >
            <Leaf size={14} /> Blank
          </button>
          <button
            type="button"
            onClick={() => switchTab('copy')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-md transition-colors ${
              tab === 'copy' ? 'bg-white text-garden-900 shadow-sm font-medium' : 'text-garden-600 hover:text-garden-800'
            }`}
          >
            <Copy size={14} /> Copy
          </button>
          <button
            type="button"
            onClick={() => switchTab('csv')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-md transition-colors ${
              tab === 'csv' ? 'bg-white text-garden-900 shadow-sm font-medium' : 'text-garden-600 hover:text-garden-800'
            }`}
          >
            <Upload size={14} /> Import CSV
          </button>
        </div>

        {tab === 'blank' && (
          <form onSubmit={handleBlankSubmit} className="space-y-4">
            <div>
              <label className="label">Garden name</label>
              <input
                className="input"
                placeholder="e.g. Spring 2026"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="label">Width (ft) <span className="text-garden-400 font-normal">optional</span></label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 20"
                  value={form.gardenWidth}
                  onChange={(e) => setForm((f) => ({ ...f, gardenWidth: e.target.value }))}
                />
                {errors.gardenWidth && <p className="text-red-500 text-xs mt-1">{errors.gardenWidth}</p>}
              </div>
              <div className="flex-1">
                <label className="label">Height (ft) <span className="text-garden-400 font-normal">optional</span></label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 12"
                  value={form.gardenHeight}
                  onChange={(e) => setForm((f) => ({ ...f, gardenHeight: e.target.value }))}
                />
                {errors.gardenHeight && <p className="text-red-500 text-xs mt-1">{errors.gardenHeight}</p>}
              </div>
            </div>

            {createGarden.isError && (
              <p className="text-red-500 text-sm">{createGarden.error?.response?.data?.error || 'Failed to create garden'}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={createGarden.isPending}>
                {createGarden.isPending ? 'Creating…' : 'Create garden'}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}

        {tab === 'copy' && (
          <form onSubmit={handleCopySubmit} className="space-y-4">
            <p className="text-garden-600 text-sm">
              Copies all beds and plant assignments. Map positions are reset. Dimensions are inherited from the source.
            </p>
            <div>
              <label className="label">New garden name</label>
              <input
                className="input"
                placeholder="e.g. Summer 2026"
                value={copyForm.name}
                onChange={(e) => setCopyForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
              {errors.copyName && <p className="text-red-500 text-xs mt-1">{errors.copyName}</p>}
            </div>

            <div>
              <label className="label">Copy from</label>
              <select
                className="input"
                value={copyForm.sourceGardenId}
                onChange={(e) => setCopyForm((f) => ({ ...f, sourceGardenId: e.target.value }))}
              >
                <option value="">Select a garden…</option>
                {gardens.map((g) => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
              {errors.sourceGardenId && <p className="text-red-500 text-xs mt-1">{errors.sourceGardenId}</p>}
            </div>

            {createGarden.isError && (
              <p className="text-red-500 text-sm">{createGarden.error?.response?.data?.error || 'Failed to copy garden'}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={createGarden.isPending}>
                {createGarden.isPending ? 'Copying…' : 'Copy garden'}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}

        {tab === 'csv' && (
          <form onSubmit={handleCsvSubmit} className="space-y-4">
            <p className="text-garden-600 text-sm">
              Upload a CSV with columns <code className="text-xs bg-garden-100 px-1 rounded">Bed Name</code>,{' '}
              <code className="text-xs bg-garden-100 px-1 rounded">Rows</code>,{' '}
              <code className="text-xs bg-garden-100 px-1 rounded">Cols</code>.{' '}
              <button type="button" onClick={downloadTemplate} className="text-garden-600 underline hover:text-garden-800 text-sm">
                Download template
              </button>
            </p>

            <div>
              <label className="label">Garden name</label>
              <input
                className="input"
                placeholder="e.g. Spring 2026"
                value={csvName}
                onChange={(e) => setCsvName(e.target.value)}
                autoFocus
              />
              {errors.csvName && <p className="text-red-500 text-xs mt-1">{errors.csvName}</p>}
            </div>

            <div>
              <label className="label">CSV file</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="input text-sm"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              {errors.csvFile && <p className="text-red-500 text-xs mt-1">{errors.csvFile}</p>}
            </div>

            {importGarden.isError && (
              <p className="text-red-500 text-sm">{importGarden.error?.response?.data?.error || 'Failed to import garden'}</p>
            )}

            {csvResult && (
              <div className="bg-garden-50 border border-garden-200 rounded-lg p-3 text-sm space-y-1">
                <p className="text-garden-800 font-medium">{csvResult.bedsCreated} bed{csvResult.bedsCreated !== 1 ? 's' : ''} imported</p>
                {csvResult.errors?.length > 0 && (
                  <>
                    <p className="text-amber-700 font-medium">{csvResult.errors.length} row{csvResult.errors.length !== 1 ? 's' : ''} skipped:</p>
                    <ul className="list-disc list-inside text-amber-600 space-y-0.5">
                      {csvResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                    <button type="button" className="btn-primary mt-2 w-full" onClick={onClose}>
                      Close
                    </button>
                  </>
                )}
              </div>
            )}

            {!csvResult && (
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={importGarden.isPending}>
                  {importGarden.isPending ? 'Importing…' : 'Import garden'}
                </button>
                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
