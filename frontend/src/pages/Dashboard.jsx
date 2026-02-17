import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Rows3, Leaf, ChevronRight, TrendingUp } from 'lucide-react';

function useHarvestTotals(season) {
  return useQuery({
    queryKey: ['harvests', 'totals', season],
    queryFn: () =>
      api.get('/harvests/totals', { params: season ? { season } : {} }).then((r) => r.data),
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
  const d = new Date();
  const month = d.getMonth();
  const year = d.getFullYear();
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
  const { data: totals = [], isLoading: totalsLoading } = useHarvestTotals(season);
  const { data: recent = [] } = useRecentHarvests();
  const { data: beds = [] } = useBeds();

  // Group totals by plant (some plants may have multiple unit entries)
  const byPlant = totals.reduce((acc, t) => {
    const key = String(t.plantId);
    if (!acc[key]) {
      acc[key] = { ...t, entries: [] };
    }
    acc[key].entries.push({ total: t.total, unit: t.unit });
    return acc;
  }, {});

  const plantCards = Object.values(byPlant);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-garden-900">
          Good {greeting()}, {user?.name?.split(' ')[0]} 🌱
        </h1>
        <p className="text-garden-600 text-sm mt-1">{season} · your garden at a glance</p>
      </div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Rows3}
          label="Garden beds"
          value={beds.length}
          link="/beds"
        />
        <StatCard
          icon={Leaf}
          label="Plant types harvested"
          value={plantCards.length}
          link="/harvests"
          sublabel={season}
        />
        <StatCard
          icon={TrendingUp}
          label="Harvest entries"
          value={recent.length === 8 ? '8+' : recent.length}
          link="/harvests"
          sublabel="recent"
        />
      </div>

      {/* Season totals */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-garden-900">{season} totals</h2>
          <Link to="/harvests" className="text-sm text-garden-600 hover:text-garden-800 flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {totalsLoading ? (
          <p className="text-garden-500 text-sm">Loading…</p>
        ) : plantCards.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-garden-500">No harvests this season yet.</p>
            <Link to="/harvests" className="btn-primary mt-4 inline-flex">
              Log your first harvest
            </Link>
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
                        <span className="font-semibold text-garden-800">{formatQty(e.total)}</span>{' '}
                        {e.unit}
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
                      {h.quantity} {h.unit}
                      {h.bedId ? ` · ${h.bedId.name}` : ''}
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
