import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Trash2, Leaf } from 'lucide-react';

const UNITS = ['lbs', 'oz', 'kg', 'g', 'count'];

function usePlants() {
  return useQuery({
    queryKey: ['plants'],
    queryFn: () => api.get('/plants').then((r) => r.data),
  });
}

function useBeds() {
  return useQuery({
    queryKey: ['beds'],
    queryFn: () => api.get('/beds').then((r) => r.data),
  });
}

function useHarvests() {
  return useQuery({
    queryKey: ['harvests'],
    queryFn: () => api.get('/harvests').then((r) => r.data),
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Harvests() {
  const queryClient = useQueryClient();
  const { data: plants = [] } = usePlants();
  const { data: beds = [] } = useBeds();
  const { data: harvests = [], isLoading } = useHarvests();

  const [form, setForm] = useState({
    plantId: '',
    bedId: '',
    quantity: '',
    unit: 'oz',
    harvestedAt: todayISO(),
    notes: '',
  });
  const [error, setError] = useState('');

  const logHarvest = useMutation({
    mutationFn: (body) => api.post('/harvests', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['harvests', 'totals'] });
      setForm((f) => ({ ...f, quantity: '', notes: '' }));
      setError('');
    },
    onError: (err) => setError(err.response?.data?.error || 'Failed to log harvest'),
  });

  const deleteHarvest = useMutation({
    mutationFn: (id) => api.delete(`/harvests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['harvests', 'totals'] });
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.plantId || !form.quantity) {
      setError('Plant and quantity are required.');
      return;
    }
    logHarvest.mutate({
      plantId: form.plantId,
      bedId: form.bedId || undefined,
      quantity: Number(form.quantity),
      unit: form.unit,
      harvestedAt: form.harvestedAt,
      notes: form.notes,
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-garden-900">Harvest Log</h1>
        <p className="text-garden-600 text-sm mt-0.5">Record what you picked from the garden</p>
      </div>

      {/* Quick-entry form */}
      <div className="card p-5 mb-8">
        <h2 className="font-semibold text-garden-900 mb-4 flex items-center gap-2">
          <Plus size={16} /> Log a harvest
        </h2>
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Plant *</label>
              <select
                className="input"
                value={form.plantId}
                onChange={(e) => setForm((f) => ({ ...f, plantId: e.target.value }))}
                required
              >
                <option value="">Select a plant…</option>
                {plants.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.emoji} {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Garden bed (optional)</label>
              <select
                className="input"
                value={form.bedId}
                onChange={(e) => setForm((f) => ({ ...f, bedId: e.target.value }))}
              >
                <option value="">No specific bed</option>
                {beds.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={form.harvestedAt}
                onChange={(e) => setForm((f) => ({ ...f, harvestedAt: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Quantity *</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                />
              </div>
              <div className="w-24">
                <label className="label">Unit</label>
                <select
                  className="input"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Notes (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. First harvest of the season"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={logHarvest.isPending}>
            {logHarvest.isPending ? 'Saving…' : 'Log harvest'}
          </button>
        </form>
      </div>

      {/* History */}
      <div>
        <h2 className="font-semibold text-garden-900 mb-3">Recent harvests</h2>
        {isLoading ? (
          <p className="text-garden-500 text-sm">Loading…</p>
        ) : harvests.length === 0 ? (
          <div className="card p-10 text-center">
            <Leaf size={36} className="text-garden-300 mx-auto mb-3" />
            <p className="text-garden-600">No harvests logged yet.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-garden-100 bg-garden-50">
                  <th className="text-left px-4 py-3 font-medium text-garden-600">Plant</th>
                  <th className="text-left px-4 py-3 font-medium text-garden-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-garden-600">Bed</th>
                  <th className="text-left px-4 py-3 font-medium text-garden-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-garden-600">Season</th>
                  <th className="text-left px-4 py-3 font-medium text-garden-600">Logged by</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {harvests.map((h) => (
                  <tr key={h._id} className="border-b border-garden-50 hover:bg-garden-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span>{h.plantId?.emoji}</span>
                        <span className="font-medium text-garden-900">{h.plantId?.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-garden-700">
                      {h.quantity} {h.unit}
                    </td>
                    <td className="px-4 py-3 text-garden-500">{h.bedId?.name || '—'}</td>
                    <td className="px-4 py-3 text-garden-500">
                      {new Date(h.harvestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-garden-500">{h.season}</td>
                    <td className="px-4 py-3 text-garden-500">{h.loggedById?.name || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="btn-danger"
                        onClick={() => {
                          if (confirm('Delete this harvest entry?')) deleteHarvest.mutate(h._id);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
