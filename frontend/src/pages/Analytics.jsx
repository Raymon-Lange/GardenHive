import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import PlantHarvestSummary from '../components/PlantHarvestSummary';
import {
  LineChart, Line,
  PieChart, Pie,
  AreaChart, Area,
  ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Earthy palette ───────────────────────────────────────────────────────────
const YEAR_COLORS = ['#529440','#a97849','#fbbf24','#74b060','#d97706','#3e7630','#be9268'];
const BAR_COLORS  = [
  '#529440','#a97849','#fbbf24','#74b060','#d97706',
  '#3e7630','#be9268','#f59e0b','#325e27','#8d613b',
  '#a0cc8e','#fcd34d','#2a4c22','#e5d3be','#fde68a',
];

const CHART_STYLE = { borderRadius: 8, border: '1px solid #c8e2bb', fontSize: 12 };
const GRID_COLOR  = '#e4f0dd';
const TICK_STYLE  = { fontSize: 11, fill: '#3e7630' };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ozToLbs(oz) { return Math.round((oz / 16) * 10) / 10; }
function fmt(val, unit) {
  if (unit === 'lbs') return `${ozToLbs(val)} lbs`;
  return `${val} logs`;
}

// ─── Data hooks ──────────────────────────────────────────────────────────────
function useYears() {
  return useQuery({
    queryKey: ['harvests', 'years'],
    queryFn: () => api.get('/harvests/years').then((r) => r.data),
  });
}

function useHarvestedPlants() {
  return useQuery({
    queryKey: ['harvests', 'totals', 'harvested-plants'],
    queryFn: () =>
      api.get('/harvests/totals').then((r) => {
        const seen = new Set();
        return r.data
          .filter((t) => { if (seen.has(t.plantId)) return false; seen.add(t.plantId); return true; })
          .map((t) => ({ _id: t.plantId, name: t.plantName, emoji: t.plantEmoji }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }),
  });
}

function useYoY(plantId) {
  return useQuery({
    queryKey: ['harvests', 'yoy', plantId],
    queryFn: () =>
      api.get('/harvests/yoy', { params: plantId ? { plantId } : {} }).then((r) => r.data),
  });
}

function useByPlant(year, plantId) {
  return useQuery({
    queryKey: ['harvests', 'totals', year, plantId],
    queryFn: () => {
      const params = {
        ...(year !== 'all' ? { from: `${year}-01-01`, to: `${year}-12-31T23:59:59` } : {}),
        ...(plantId ? { plantId } : {}),
      };
      return api.get('/harvests/totals', { params }).then((r) => r.data);
    },
    enabled: !!year,
  });
}

function useWeekly(year, plantId) {
  return useQuery({
    queryKey: ['harvests', 'weekly', year, plantId],
    queryFn: () =>
      api.get('/harvests/weekly', { params: { year, ...(plantId ? { plantId } : {}) } })
        .then((r) => r.data),
    enabled: !!year,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children }) {
  return (
    <div className="card p-5 mb-6">
      <h2 className="font-semibold text-garden-900 mb-0.5">{title}</h2>
      {subtitle && <p className="text-xs text-garden-500 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function UnitToggle({ value, onChange }) {
  return (
    <div className="flex bg-garden-100 rounded-lg p-0.5 text-sm">
      {['lbs', 'count'].map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${
            value === u
              ? 'bg-white text-garden-800 shadow-sm'
              : 'text-garden-600 hover:text-garden-800'
          }`}
        >
          {u === 'lbs' ? 'Weight (lbs)' : 'Count (logs)'}
        </button>
      ))}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-52 text-garden-400 text-sm">
      No data
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { data: years = [] }          = useYears();
  const { data: harvestedPlants = [] } = useHarvestedPlants();

  // Global filters
  const [selectedYear,    setSelectedYear]    = useState(null);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [unit,            setUnit]            = useState('lbs');

  const year = selectedYear ?? years[0];

  // Data
  const { data: yoy          = { years: [], data: [] } } = useYoY(selectedPlantId || undefined);
  const { data: byPlant      = [] } = useByPlant(year, selectedPlantId || undefined);
  const { data: byPlantPrev  = [] } = useByPlant(year !== 'all' ? year - 1 : null, selectedPlantId || undefined);
  const { data: weekly       = [] } = useWeekly(year !== 'all' ? year : null, selectedPlantId || undefined);

  // ── Chart 1: Year-over-year ──────────────────────────────────────────────
  const yoyDataKey = (yr) => unit === 'lbs' ? `${yr}_oz` : `${yr}_count`;
  const yoyFormatter = (val, yr) =>
    unit === 'lbs' ? `${ozToLbs(val)} lbs` : `${val} logs`;

  // ── Chart 2: By plant (bar) ──────────────────────────────────────────────
  const barData = useMemo(() => {
    const grouped = {};
    byPlant.forEach((t) => {
      const key = t.plantName;
      if (!grouped[key]) grouped[key] = { name: `${t.plantEmoji} ${t.plantName}`, oz: 0, count: 0 };
      grouped[key].oz    += t.total;
      grouped[key].count += t.count;
    });
    return Object.values(grouped)
      .map((d) => ({ ...d, value: unit === 'lbs' ? ozToLbs(d.oz) : d.count }))
      .sort((a, b) => b.value - a.value);
  }, [byPlant, unit]);

  const prevBarMap = useMemo(() => {
    const grouped = {};
    byPlantPrev.forEach((t) => {
      const key = `${t.plantEmoji} ${t.plantName}`;
      if (!grouped[key]) grouped[key] = { oz: 0, count: 0 };
      grouped[key].oz    += t.total;
      grouped[key].count += t.count;
    });
    return grouped;
  }, [byPlantPrev]);

  // ── Chart 3: Weekly area ─────────────────────────────────────────────────
  const areaData = weekly.map((w) => ({
    ...w,
    value: unit === 'lbs' ? ozToLbs(w.oz) : w.count,
  }));

  // ── Chart 4: Candlestick range (low / median / high across all years) ────
  const candleData = useMemo(() => {
    if (!yoy.data.length || !yoy.years.length) return [];
    const key      = (yr) => unit === 'lbs' ? `${yr}_oz` : `${yr}_count`;
    const toDisp   = (raw) => unit === 'lbs' ? ozToLbs(raw) : raw;
    return yoy.data.map((row) => {
      const vals = yoy.years.map((yr) => row[key(yr)] ?? 0).filter((v) => v > 0);
      if (!vals.length) return { month: row.month, low: 0, range: 0, median: null, high: 0, hasData: false };
      const sorted = [...vals].sort((a, b) => a - b);
      const low    = toDisp(sorted[0]);
      const high   = toDisp(sorted[sorted.length - 1]);
      const mid    = Math.floor(sorted.length / 2);
      const medRaw = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      return { month: row.month, low, range: high - low, median: toDisp(medRaw), high, hasData: true };
    });
  }, [yoy, unit]);

  const selectedPlant = harvestedPlants.find((p) => p._id === selectedPlantId);
  const yearLabel = year === 'all' ? 'All time' : year;

  const [hoveredPlant, setHoveredPlant] = useState(null);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garden-900">Analytics</h1>
          <p className="text-garden-600 text-sm mt-0.5">Harvest trends across your garden</p>
        </div>
        <UnitToggle value={unit} onChange={setUnit} />
      </div>

      {/* Global filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Year</label>
          <select
            className="input w-32"
            value={year ?? ''}
            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">All time</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Plant type</label>
          <select
            className="input w-52"
            value={selectedPlantId}
            onChange={(e) => setSelectedPlantId(e.target.value)}
          >
            <option value="">All plants</option>
            {harvestedPlants.map((p) => (
              <option key={p._id} value={p._id}>{p.emoji} {p.name}</option>
            ))}
          </select>
        </div>
        {selectedPlantId && (
          <button
            className="btn-secondary text-sm"
            onClick={() => setSelectedPlantId('')}
          >
            Clear filter
          </button>
        )}
      </div>


      {/* ── Chart 1: By plant pie + summary table ───────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <SectionCard
          title="Harvest by plant type"
          subtitle={`${yearLabel} · ${unit === 'lbs' ? 'total weight' : 'number of harvest logs'}${selectedPlant ? ` · filtered to ${selectedPlant.name}` : ''}`}
        >
          {barData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={barData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  onMouseEnter={(data) => setHoveredPlant(data.name)}
                  onMouseLeave={() => setHoveredPlant(null)}
                >
                  {barData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_STYLE}
                  formatter={(val, name) => [unit === 'lbs' ? `${val} lbs` : `${val} logs`, name]}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: '#3e7630' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <PlantHarvestSummary data={barData} year={yearLabel} hoveredPlant={hoveredPlant} prevBarMap={prevBarMap} />
      </div>

      {/* ── Chart 2: Year-over-year line ────────────────────────────────── */}
      <SectionCard
        title="Year-over-year comparison"
        subtitle={selectedPlant ? `${selectedPlant.emoji} ${selectedPlant.name} · all years` : 'All plants · monthly totals by year'}
      >
        {yoy.data.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={yoy.data} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="month" tick={TICK_STYLE} />
              <YAxis tick={TICK_STYLE} />
              <Tooltip
                contentStyle={CHART_STYLE}
                formatter={(val, name) => [fmt(val, unit), name.replace('_oz','').replace('_count','')]}
              />
              <Legend
                formatter={(v) => (
                  <span style={{ fontSize: 12, color: '#3e7630' }}>
                    {v.replace('_oz','').replace('_count','')}
                  </span>
                )}
              />
              {yoy.years.map((yr, i) => (
                <Line
                  key={yr}
                  type="monotone"
                  dataKey={yoyDataKey(yr)}
                  name={yr}
                  stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── Chart 3: Candlestick range ──────────────────────────────────── */}
      <SectionCard
        title="Year-over-year range"
        subtitle={`${selectedPlant ? `${selectedPlant.emoji} ${selectedPlant.name} · ` : ''}lowest and highest year per month, with median highlighted`}
      >
        {candleData.every((d) => !d.hasData) ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={candleData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="month" tick={TICK_STYLE} />
              <YAxis tick={TICK_STYLE} />
              <Tooltip
                contentStyle={CHART_STYLE}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = candleData.find((r) => r.month === label);
                  if (!d?.hasData) return null;
                  const u = unit === 'lbs' ? 'lbs' : 'logs';
                  return (
                    <div style={{ ...CHART_STYLE, padding: '8px 12px', background: '#fff' }}>
                      <p style={{ fontWeight: 600, color: '#3e7630', marginBottom: 6 }}>{label}</p>
                      <p style={{ color: '#d97706', marginBottom: 2 }}>High: {d.high} {u}</p>
                      <p style={{ color: '#fbbf24', marginBottom: 2 }}>Median: {d.median} {u}</p>
                      <p style={{ color: '#a97849' }}>Low: {d.low} {u}</p>
                    </div>
                  );
                }}
              />
              {/* Transparent spacer lifts the range bar up to start at `low` */}
              <Bar dataKey="low"   stackId="candle" fill="transparent" legendType="none" isAnimationActive={false} />
              <Bar dataKey="range" stackId="candle" name="Low → High range" fill="#74b060" fillOpacity={0.45}
                   radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Line type="monotone" dataKey="median" name="Median" connectNulls={false}
                    stroke="#fbbf24" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#fbbf24', stroke: '#d97706', strokeWidth: 1 }}
                    activeDot={{ r: 5 }} />
              <Legend formatter={(v) => <span style={{ fontSize: 12, color: '#3e7630' }}>{v}</span>} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── Chart 5: Weekly area ────────────────────────────────────────── */}
      <SectionCard
        title="Weekly harvest volume"
        subtitle={`${yearLabel} · week by week${selectedPlant ? ` · ${selectedPlant.emoji} ${selectedPlant.name}` : ' · all plants'}`}
      >
        {areaData.every((w) => w.value === 0) ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={areaData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#529440" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#529440" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 9, fill: '#3e7630' }}
                interval={3}
              />
              <YAxis tick={TICK_STYLE} />
              <Tooltip
                contentStyle={CHART_STYLE}
                formatter={(val) => [unit === 'lbs' ? `${val} lbs` : `${val} logs`, 'Harvested']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#529440"
                strokeWidth={2}
                fill="url(#areaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  );
}
