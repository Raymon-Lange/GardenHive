import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Trash2, ChevronRight, Rows3 } from 'lucide-react';

function useBeds() {
  return useQuery({
    queryKey: ['beds'],
    queryFn: () => api.get('/beds').then((r) => r.data),
  });
}

export default function GardenBeds() {
  const queryClient = useQueryClient();
  const { data: beds = [], isLoading } = useBeds();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', rows: 4, cols: 4 });

  const createBed = useMutation({
    mutationFn: (body) => api.post('/beds', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      setShowForm(false);
      setForm({ name: '', rows: 4, cols: 4 });
    },
  });

  const deleteBed = useMutation({
    mutationFn: (id) => api.delete(`/beds/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beds'] }),
  });

  function handleCreate(e) {
    e.preventDefault();
    createBed.mutate({ name: form.name, rows: Number(form.rows), cols: Number(form.cols) });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garden-900">Garden Beds</h1>
          <p className="text-garden-600 text-sm mt-0.5">
            {beds.length} {beds.length === 1 ? 'bed' : 'beds'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> New bed
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-garden-900 mb-4">New garden bed</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-48">
              <label className="label">Bed name</label>
              <input
                className="input"
                placeholder="e.g. Front raised bed"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="w-24">
              <label className="label">Rows</label>
              <input
                type="number"
                className="input"
                min={1}
                max={20}
                value={form.rows}
                onChange={(e) => setForm((f) => ({ ...f, rows: e.target.value }))}
                required
              />
            </div>
            <div className="w-24">
              <label className="label">Cols</label>
              <input
                type="number"
                className="input"
                min={1}
                max={20}
                value={form.cols}
                onChange={(e) => setForm((f) => ({ ...f, cols: e.target.value }))}
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={createBed.isPending}>
                {createBed.isPending ? 'Creating…' : 'Create'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
          {createBed.isError && (
            <p className="text-red-600 text-sm mt-3">
              {createBed.error?.response?.data?.error || 'Failed to create bed'}
            </p>
          )}
        </div>
      )}

      {/* Bed list */}
      {isLoading ? (
        <p className="text-garden-500">Loading…</p>
      ) : beds.length === 0 ? (
        <div className="card p-12 text-center">
          <Rows3 size={40} className="text-garden-300 mx-auto mb-3" />
          <p className="text-garden-600 font-medium">No garden beds yet</p>
          <p className="text-garden-500 text-sm mt-1">Create your first bed to start planning.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {beds.map((bed) => {
            const planted = bed.cells?.filter((c) => c.plantId).length ?? 0;
            const total = bed.rows * bed.cols;
            return (
              <div key={bed._id} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-garden-900">{bed.name}</h3>
                    <p className="text-xs text-garden-500 mt-0.5">
                      {bed.rows} × {bed.cols} ft · {planted}/{total} planted
                    </p>
                  </div>
                  <button
                    className="btn-danger p-1.5"
                    onClick={() => {
                      if (confirm(`Delete "${bed.name}"?`)) deleteBed.mutate(bed._id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Mini grid preview */}
                <div
                  className="grid gap-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(bed.cols, 8)}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: Math.min(bed.rows, 5) * Math.min(bed.cols, 8) }).map((_, i) => {
                    const row = Math.floor(i / Math.min(bed.cols, 8));
                    const col = i % Math.min(bed.cols, 8);
                    const cell = bed.cells?.find((c) => c.row === row && c.col === col);
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-sm text-center leading-none flex items-center justify-center text-[10px] ${
                          cell?.plantId ? 'bg-garden-200' : 'bg-garden-100'
                        }`}
                        title={cell?.plantId?.name}
                      >
                        {cell?.plantId?.emoji || ''}
                      </div>
                    );
                  })}
                </div>

                <Link
                  to={`/beds/${bed._id}`}
                  className="btn-secondary text-sm justify-between mt-auto"
                >
                  Open grid <ChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
