import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Rows3, Leaf, ChevronRight, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// Earthy chart colours
const PIE_COLORS = [
  '#529440', '#a97849', '#fbbf24', '#74b060', '#d97706',
  '#3e7630', '#be9268', '#f59e0b', '#325e27', '#8d613b',
  '#a0cc8e', '#fcd34d', '#2a4c22', '#e5d3be', '#fde68a',
];

function useYears() {
  return useQuery({
    queryKey: ['harvests', 'years'],
    queryFn: () => api.get('/harvests/years').then((r) => r.data),
  });
}

function useHarvestTotals(year) {
  return useQuery({
    queryKey: ['harvests', 'totals', year],
    queryFn: () =>
      api.get('/harvests/totals').then((r) =>
        r.data.filter((t) => t.season?.endsWith(String(year)))
      ),
    enabled: !!year,
  });
}

function useMonthly(year) {
  return useQuery({
    queryKey: ['harvests', 'monthly', year],
    queryFn: () => api.get('/harvests/monthly', { params: { year } }).then((r) => r.data),
    enabled: !!year,
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

function currentSeason() {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  let name;
  if (month >= 2 && month <= 4) name = 'Spring';
  else if (month >= 5 && month <= 7) name = 'Summer';
  else if (month >= 8 && month <= 10) name = 'Fall';
  else name = 'Winter';
  return `${name} ${year}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const season = currentSeason();
  const { data: years = [] } = useYears();
  const [selectedYear, setSelectedYear] = useState(null);
  const year = selectedYear ?? years[0]; // default to most recent year with data
  const { data: totals = [] } = useHarvestTotals(year);
  const { data: monthly = [] } = useMonthly(year);
  const { data: recent = [] } = useRecentHarvests();
  const { data: beds = [] } = useBeds();

  // Group totals by plant, summing oz across unit types (all seeded data is oz)
  const byPlant = totals.reduce((acc, t) => {
    const key = String(t.plantId);
    if (!acc[key]) acc[key] = { ...t, totalOz: 0, entries: [] };
    acc[key].totalOz += t.total;
    acc[key].entries.push({ total: t.total, unit: t.unit });
    return acc;
  }, {});
  const plantCards = Object.values(byPlant).sort((a, b) => b.totalOz - a.totalOz);

  // Pie data — top 10 plants by oz, rest as "Other"
  const top10 = plantCards.slice(0, 10);
  const otherOz = plantCards.slice(10).reduce((s, p) => s + p.totalOz, 0);
  const pieData = [
    ...top10.map((p) => ({ name: `${p.plantEmoji} ${p.plantName}`, value: Math.round(p.totalOz) })),
    ...(otherOz > 0 ? [{ name: 'Other', value: Math.round(otherOz) }] : []),
  ];

  // Total oz this year
  const totalOzYear = plantCards.reduce((s, p) => s + p.totalOz, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-garden-900">
            Good {greeting()}, {user?.name?.split(' ')[0]} 🌱
          </h1>
          <p className="text-garden-600 text-sm mt-1">{year} garden · your harvest at a glance</p>
        </div>
        {years.length > 1 && (
          <select
            className="input w-28 text-sm"
            value={year ?? ''}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Rows3}     label="Garden beds"          value={beds.length}                              link="/map" />
        <StatCard icon={Leaf}      label="Plant types harvested" value={plantCards.length}                      link="/harvests" sublabel={String(year)} />
        <StatCard icon={TrendingUp} label="Total harvested"      value={`${Math.round(totalOzYear / 16)} lbs`}  link="/harvests" sublabel={String(year)} />
      </div>

      {/* Charts row */}
      {monthly.some((m) => m.totalOz > 0) && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8" key={year}>

          {/* Line chart — monthly oz */}
          <div className="card p-5">
            <h2 className="font-semibold text-garden-900 mb-1">Monthly harvest (oz)</h2>
            <p className="text-xs text-garden-500 mb-4">{year}</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4f0dd" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#3e7630' }} />
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

          {/* Pie chart — by plant */}
          <div className="card p-5">
            <h2 className="font-semibold text-garden-900 mb-1">Harvest by plant (oz)</h2>
            <p className="text-xs text-garden-500 mb-4">{year}</p>
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

      {/* Season totals cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-garden-900">{season} totals</h2>
          <Link to="/harvests" className="text-sm text-garden-600 hover:text-garden-800 flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        {plantCards.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-garden-500">No harvests this season yet.</p>
            <Link to="/harvests" className="btn-primary mt-4 inline-flex">Log your first harvest</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plantCards.map((p) => (
              <div key={p.plantId} className="card p-4 flex items-start gap-3">
                <span className="text-3xl">{p.plantEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-garden-900 truncate">{p.plantName}</p>
                  <div className="mt-1 space-y-0.5">
                    {p.entries.map((e) => (
                      <p key={e.unit} className="text-sm text-garden-600">
                        <span className="font-semibold text-garden-800">{formatQty(e.total)}</span> {e.unit}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-garden-400 mt-1">{p.count} log{p.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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
