import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { Leaf, Grid3X3, BarChart3, ChevronRight, Map, TrendingUp, Activity } from 'lucide-react';

const features = [
  {
    icon: Grid3X3,
    title: 'Plan your beds',
    desc: 'Build square foot garden grids and assign plants to every cell from our built-in plant library.',
  },
  {
    icon: Leaf,
    title: 'Log harvests fast',
    desc: 'Record what you picked — by weight or count — in seconds. Never lose track of your yields.',
  },
  {
    icon: BarChart3,
    title: 'Season totals',
    desc: 'Cumulative totals by plant and season give you a clear picture of your garden\'s output.',
  },
  {
    icon: Map,
    title: 'Garden map',
    desc: 'See all your beds positioned to scale in a live bird\'s-eye map. Click any bed to jump straight to its planting grid.',
  },
  {
    icon: TrendingUp,
    title: 'Year-over-year trends',
    desc: 'Compare monthly harvests across every season with a multi-year line chart — spot your best years at a glance.',
  },
  {
    icon: Activity,
    title: 'Range & rhythm',
    desc: 'A candlestick range chart shows your lowest, median, and highest yield per month. Weekly volume reveals your harvest rhythm.',
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-garden-50 to-garden-100">
      <Helmet>
        <title>Square Foot Garden Planner &amp; Harvest Tracker | GardenHive</title>
        <meta name="description" content="Plan your square foot garden beds, log every harvest, and track your yields season after season. Free garden planner included — no account needed." />
        <meta property="og:title" content="Square Foot Garden Planner &amp; Harvest Tracker | GardenHive" />
        <meta property="og:description" content="Plan your square foot garden beds, log every harvest, and track your yields season after season. Free garden planner included — no account needed." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fire-hive.com/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Square Foot Garden Planner &amp; Harvest Tracker | GardenHive" />
        <meta name="twitter:description" content="Plan your square foot garden beds, log every harvest, and track your yields season after season. Free garden planner included — no account needed." />
        <link rel="canonical" href="https://fire-hive.com/" />
      </Helmet>
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 max-w-5xl mx-auto">
        <span className="text-2xl font-bold text-garden-800">🌿 GardenHive</span>
        <div className="flex gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">Sign in</Link>
              <Link to="/signup" className="btn-primary">Get started</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-20 pb-16 text-center">
        <h1 className="text-5xl font-bold text-garden-900 leading-tight mb-5">
          Your square foot garden,<br />
          <span className="text-garden-600">tracked and thriving</span>
        </h1>
        <p className="text-lg text-garden-700 max-w-xl mx-auto mb-10">
          Plan garden beds on an interactive grid, log every harvest, and watch your season totals grow.
          Calm, earthy, and built for serious home gardeners.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/signup" className="btn-primary text-base px-6 py-3">
            Start for free <ChevronRight size={18} />
          </Link>
          <Link to="/planner" className="btn-secondary text-base px-6 py-3">
            Try free planner
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-8 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6">
              <div className="w-10 h-10 bg-garden-100 rounded-lg flex items-center justify-center mb-4">
                <Icon size={20} className="text-garden-600" />
              </div>
              <h3 className="font-semibold text-garden-900 mb-2">{title}</h3>
              <p className="text-sm text-garden-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
