import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Rows3, Leaf, LogOut, Map } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/map',       label: 'Garden Map',  icon: Map },
  { to: '/beds',      label: 'Garden Beds', icon: Rows3 },
  { to: '/harvests',  label: 'Harvests',    icon: Leaf },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-garden-800 text-white flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-garden-700">
          <span className="text-xl font-bold tracking-tight">🌿 GardenHive</span>
          <p className="text-garden-300 text-xs mt-1 truncate">{user?.name}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-garden-600 text-white'
                    : 'text-garden-200 hover:bg-garden-700 hover:text-white'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-garden-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-left text-garden-300 hover:text-white hover:bg-garden-700 rounded-lg text-sm transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-garden-50">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
