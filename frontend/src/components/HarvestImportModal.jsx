import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import PlantMatchResolver from './PlantMatchResolver';

export default function HarvestImportModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [preview, setPreview]       = useState(null);  // { totalRows, matched, unmatched, errors }
  const [resolvedMap, setResolvedMap] = useState({});   // { [row]: { plantId } | { skipped: true } }
  const [summary, setSummary]       = useState(null);
  const [uploadError, setUploadError] = useState('');

  const { data: allPlants = [] } = useQuery({
    queryKey: ['plants'],
    queryFn: () => api.get('/plants').then((r) => r.data),
    enabled: isOpen,
  });

  const importPreview = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/harvests/import', fd).then((r) => r.data);
    },
    onSuccess: (data) => {
      setPreview(data);
      setResolvedMap({});
      setUploadError('');
    },
    onError: (err) => {
      setUploadError(err.response?.data?.error || 'Upload failed');
    },
  });

  const bulkCreate = useMutation({
    mutationFn: (rows) => api.post('/harvests/bulk', { rows }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      setSummary(data);
      setPreview(null);
    },
    onError: (err) => {
      setUploadError(err.response?.data?.error || 'Import failed');
    },
  });

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(null);
    setSummary(null);
    setUploadError('');
    importPreview.mutate(file);
  }

  function handleConfirm() {
    if (!preview) return;
    const rows = [
      ...preview.matched.map((r) => ({
        plantId: r.plantId,
        harvestedAt: r.date,
        quantity: r.quantity,
      })),
      ...preview.unmatched
        .filter((r) => resolvedMap[r.row] && !resolvedMap[r.row].skipped)
        .map((r) => ({
          plantId: resolvedMap[r.row].plantId,
          harvestedAt: r.date,
          quantity: r.quantity,
        })),
    ];
    bulkCreate.mutate(rows);
  }

  function handleClose() {
    setPreview(null);
    setResolvedMap({});
    setSummary(null);
    setUploadError('');
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  }

  const allResolved =
    preview &&
    preview.unmatched.every((r) => resolvedMap[r.row] !== undefined);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-garden-100">
          <h2 className="font-semibold text-garden-900 flex items-center gap-2">
            <Upload size={16} /> Import harvests from CSV
          </h2>
          <button onClick={handleClose} className="text-garden-400 hover:text-garden-700">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* File picker */}
          {!summary && (
            <div>
              <label className="label">Select CSV file</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="input"
                onChange={handleFileChange}
                disabled={importPreview.isPending}
              />
              {importPreview.isPending && (
                <p className="text-garden-500 text-sm mt-2">Parsing file…</p>
              )}
              {uploadError && (
                <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle size={40} className="text-green-500" />
              <p className="text-lg font-semibold text-garden-900">
                Imported {summary.imported} harvest{summary.imported !== 1 ? 's' : ''}
              </p>
              <button onClick={handleClose} className="btn-primary mt-2">Done</button>
            </div>
          )}

          {/* Preview */}
          {preview && !summary && (
            <>
              <p className="text-sm text-garden-600">
                {preview.totalRows} row{preview.totalRows !== 1 ? 's' : ''} found —{' '}
                <span className="text-green-700 font-medium">{preview.matched.length} matched</span>
                {preview.unmatched.length > 0 && (
                  <>, <span className="text-yellow-700 font-medium">{preview.unmatched.length} need review</span></>
                )}
                {preview.errors.length > 0 && (
                  <>, <span className="text-red-700 font-medium">{preview.errors.length} invalid</span></>
                )}
              </p>

              {/* Matched rows */}
              {preview.matched.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-garden-700 mb-2">Ready to import</h3>
                  <div className="border border-green-100 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-garden-600">Plant</th>
                          <th className="text-left px-3 py-2 text-garden-600">Date</th>
                          <th className="text-left px-3 py-2 text-garden-600">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.matched.map((r) => (
                          <tr key={r.row} className="border-t border-green-50">
                            <td className="px-3 py-2">{r.plantEmoji} {r.plantName}</td>
                            <td className="px-3 py-2 text-garden-500">
                              {new Date(r.date).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-garden-500">{r.quantity} oz</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmatched rows — resolver */}
              {preview.unmatched.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-yellow-700 mb-2">Review required</h3>
                  <div className="space-y-2">
                    {preview.unmatched.map((r) => (
                      <PlantMatchResolver
                        key={r.row}
                        rawName={r.rawName}
                        suggestion={r.suggestion}
                        allPlants={allPlants}
                        resolved={resolvedMap[r.row]}
                        onResolve={(plantId) =>
                          setResolvedMap((m) => ({ ...m, [r.row]: { plantId } }))
                        }
                        onSkip={() =>
                          setResolvedMap((m) => ({ ...m, [r.row]: { skipped: true } }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Error rows */}
              {preview.errors.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-700 mb-2">Cannot be imported</h3>
                  <div className="border border-red-100 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-garden-600">Row</th>
                          <th className="text-left px-3 py-2 text-garden-600">Field</th>
                          <th className="text-left px-3 py-2 text-garden-600">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.errors.map((e) => (
                          <tr key={e.row} className="border-t border-red-50">
                            <td className="px-3 py-2 text-garden-500">{e.row}</td>
                            <td className="px-3 py-2 text-garden-500">{e.field}</td>
                            <td className="px-3 py-2 text-red-700">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {preview && !summary && (
          <div className="px-6 py-4 border-t border-garden-100 flex justify-between items-center gap-3">
            {preview.unmatched.length > 0 && !allResolved && (
              <p className="text-sm text-yellow-700 flex items-center gap-1.5">
                <AlertCircle size={14} /> Resolve all unmatched rows to continue
              </p>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={handleClose} className="btn-secondary">Cancel</button>
              <button
                className="btn-primary"
                disabled={!allResolved || bulkCreate.isPending}
                onClick={handleConfirm}
              >
                {bulkCreate.isPending
                  ? 'Importing…'
                  : `Import ${preview.matched.length + preview.unmatched.filter((r) => resolvedMap[r.row] && !resolvedMap[r.row].skipped).length} harvest${(preview.matched.length + preview.unmatched.filter((r) => resolvedMap[r.row] && !resolvedMap[r.row].skipped).length) !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
