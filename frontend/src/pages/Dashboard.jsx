import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Rows3, ChevronRight, TrendingUp, Plus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const UNITS = ['lbs', 'oz', 'kg', 'g', 'count'];

const PIE_COLORS = [
  '#529440', '#a97849', '#fbbf24', '#74b060', '#d97706',
  '#3e7630', '#be9268', '#f59e0b', '#325e27', '#8d613b',
  '#a0cc8e', '#fcd34d', '#2a4c22', '#e5d3be', '#fde68a',
];

// Rolling 12-month window
function rolling12() {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 11);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

function useHarvestTotals() {
  const { from, to } = rolling12();
  return useQuery({
    queryKey: ['harvests', 'totals', 'rolling12'],
    queryFn: () => api.get('/harvests/totals', { params: { from, to } }).then((r) => r.data),
  });
}

function useMonthly() {
  return useQuery({
    queryKey: ['harvests', 'monthly', 'rolling12'],
    queryFn: () => api.get('/harvests/monthly').then((r) => r.data),
  });
}

function useRecentHarvests() {
  return useQuery({
    queryKey: ['harvests'],
    queryFn: () => api.get('/harvests', { params: { limit: 8 } }).then((r) => r.data),
  });
}

function useBeds() {
  return useQuery({
    queryKey: ['beds'],
    queryFn: () => api.get('/beds').then((r) => r.data),
  });
}

function usePlants() {
  return useQuery({
    queryKey: ['plants'],
    queryFn: () => api.get('/plants').then((r) => r.data),
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function rollingLabel() {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 11);
  from.setDate(1);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return `${fmt(from)} – ${fmt(now)}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: totals = [] } = useHarvestTotals();
  const { data: monthly = [] } = useMonthly();
  const { data: recent = [] } = useRecentHarvests();
  const { data: beds = [] } = useBeds();
  const { data: plants = [] } = usePlants();

  const [form, setForm] = useState({
    plantId: '', bedId: '', quantity: '', unit: 'lbs',
    harvestedAt: todayISO(), notes: '',
  });
  const [formError, setFormError] = useState('');

  const logHarvest = useMutation({
    mutationFn: (body) => api.post('/harvests', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['harvests', 'totals'] });
      setForm((f) => ({ ...f, plantId: '', bedId: '', quantity: '', notes: '' }));
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error || 'Failed to log harvest'),
  });

  function handleHarvestSubmit(e) {
    e.preventDefault();
    if (!form.plantId || !form.quantity) { setFormError('Plant and quantity are required.'); return; }
    logHarvest.mutate({
      plantId: form.plantId,
      bedId: form.bedId || undefined,
      quantity: Number(form.quantity),
      unit: form.unit,
      harvestedAt: form.harvestedAt,
      notes: form.notes,
    });
  }

  // Group totals by plant
  const byPlant = totals.reduce((acc, t) => {
    const key = String(t.plantId);
    if (!acc[key]) acc[key] = { ...t, totalOz: 0, entries: [] };
    acc[key].totalOz += t.total;
    acc[key].entries.push({ total: t.total, unit: t.unit });
    return acc;
  }, {});
  const plantCards = Object.values(byPlant).sort((a, b) => b.totalOz - a.totalOz);

  // Pie data
  const top10 = plantCards.slice(0, 10);
  const otherOz = plantCards.slice(10).reduce((s, p) => s + p.totalOz, 0);
  const pieData = [
    ...top10.map((p) => ({ name: `${p.plantEmoji} ${p.plantName}`, value: Math.round(p.totalOz) })),
    ...(otherOz > 0 ? [{ name: 'Other', value: Math.round(otherOz) }] : []),
  ];

  const totalOz = plantCards.reduce((s, p) => s + p.totalOz, 0);
  const label = rollingLabel();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-garden-900">
          Good {greeting()}, {user?.name?.split(' ')[0]} 🌱
        </h1>
        <p className="text-garden-600 text-sm mt-1">Rolling 12 months · {label}</p>
      </div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <StatCard icon={Rows3}      label="Garden beds"     value={beds.length}                        link="/map" />
        <StatCard icon={TrendingUp} label="Total harvested" value={`${Math.round(totalOz / 16)} lbs`} link="/harvests" sublabel="last 12 months" />
      </div>

      {/* Charts */}
      {monthly.some((m) => m.totalOz > 0) && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">

          {/* Line chart */}
          <div className="card p-5">
            <h2 className="font-semibold text-garden-900 mb-1">Monthly harvest (oz)</h2>
            <p className="text-xs text-garden-500 mb-4">{label}</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4f0dd" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#3e7630' }} />
                <YAxis tick={{ fontSize: 11, fill: '#3e7630' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #c8e2bb', fontSize: 12 }}
                  formatter={(v) => [`${v} oz`, 'Harvested']}
                />
                <Line
                  type="monotone"
                  dataKey="totalOz"
                  stroke="#529440"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#529440' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="card p-5">
            <h2 className="font-semibold text-garden-900 mb-1">Harvest by plant (oz)</h2>
            <p className="text-xs text-garden-500 mb-4">{label}</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="42%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #c8e2bb', fontSize: 12 }}
                  formatter={(v, name) => [`${v} oz`, name]}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: '#3e7630' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* No data in rolling window — show helpful message */}
      {!monthly.some((m) => m.totalOz > 0) && (
        <div className="card p-8 text-center mb-8">
          <p className="text-garden-600 font-medium">No harvests in the last 12 months</p>
          <p className="text-garden-500 text-sm mt-1">Log a harvest to see your charts.</p>
          <Link to="/harvests" className="btn-primary mt-4 inline-flex">Log a harvest</Link>
        </div>
      )}

      {/* Quick harvest entry */}
      <div className="card p-5 mb-8">
        <h2 className="font-semibold text-garden-900 mb-4 flex items-center gap-2">
          <Plus size={16} /> Log a harvest
        </h2>
        {formError && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {formError}
          </div>
        )}
        <form onSubmit={handleHarvestSubmit}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label">Plant *</label>
              <select className="input" value={form.plantId} onChange={(e) => setForm((f) => ({ ...f, plantId: e.target.value }))} required>
                <option value="">Select a plant…</option>
                {plants.map((p) => (
                  <option key={p._id} value={p._id}>{p.emoji} {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Garden bed</label>
              <select className="input" value={form.bedId} onChange={(e) => setForm((f) => ({ ...f, bedId: e.target.value }))}>
                <option value="">No specific bed</option>
                {beds.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Quantity *</label>
                <input type="number" className="input" min={0} step="any" placeholder="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} required />
              </div>
              <div className="w-20">
                <label className="label">Unit</label>
                <select className="input" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.harvestedAt} onChange={(e) => setForm((f) => ({ ...f, harvestedAt: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <input type="text" className="input flex-1" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            <button type="submit" className="btn-primary shrink-0" disabled={logHarvest.isPending}>
              {logHarvest.isPending ? 'Saving…' : 'Log harvest'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent harvests */}
      {recent.length > 0 && (
        <div>
          <h2 className="font-semibold text-garden-900 mb-3">Recent entries</h2>
          <div className="card divide-y divide-garden-50">
            {recent.slice(0, 6).map((h) => (
              <div key={h._id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{h.plantId?.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-garden-900">{h.plantId?.name}</p>
                    <p className="text-xs text-garden-500">
                      {h.quantity} {h.unit}{h.bedId ? ` · ${h.bedId.name}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-garden-400">
                  {new Date(h.harvestedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, link, sublabel }) {
  return (
    <Link to={link} className="card p-5 flex items-center gap-4 hover:border-garden-300 transition-colors group">
      <div className="w-10 h-10 bg-garden-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-garden-200 transition-colors">
        <Icon size={20} className="text-garden-600" />
      </div>
      <div>
        <p className="text-2xl font-bold text-garden-900">{value}</p>
        <p className="text-xs text-garden-500">{label}{sublabel ? ` · ${sublabel}` : ''}</p>
      </div>
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatQty(n) {
  return Number.isInteger(n) ? n : n.toFixed(1);
}
