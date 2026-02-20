import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Leaf, LogOut, Map, BarChart2, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/map',       label: 'Garden Map', icon: Map },
  { to: '/harvests',  label: 'Harvests',   icon: Leaf },
  { to: '/analytics', label: 'Analytics',  icon: BarChart2 },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 z-30 bg-garden-800 text-white flex items-center px-4 gap-3">
        <button onClick={() => setMobileOpen(true)} className="p-1 rounded hover:bg-garden-700">
          <Menu size={22} />
        </button>
        <span className="text-lg font-bold tracking-tight">🌿 GardenHive</span>
      </header>

      {/* Mobile overlay */}
      <div
        className={clsx(
          'md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={clsx(
          'bg-garden-800 text-white flex flex-col',
          'transition-all duration-300 ease-in-out',
          // Mobile: fixed drawer sliding in from left
          'fixed inset-y-0 left-0 z-50 w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static, no translate, width based on collapsed state
          'md:static md:inset-auto md:z-auto md:translate-x-0 md:shrink-0',
          collapsed ? 'md:w-16' : 'md:w-56'
        )}
      >
        {/* Sidebar header */}
        <div className="px-4 py-5 border-b border-garden-700 flex items-center justify-between min-h-[72px]">
          <div className={clsx('overflow-hidden', collapsed && 'md:hidden')}>
            <span className="text-xl font-bold tracking-tight whitespace-nowrap">🌿 GardenHive</span>
            <p className="text-garden-300 text-xs mt-1 truncate">{user?.name}</p>
          </div>
          {collapsed && (
            <span className="hidden md:block text-xl">🌿</span>
          )}
          {/* Close button — mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded hover:bg-garden-700 ml-auto"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-garden-600 text-white'
                    : 'text-garden-200 hover:bg-garden-700 hover:text-white',
                  collapsed && 'md:justify-center md:px-0'
                )
              }
            >
              <Icon size={18} />
              <span className={clsx(collapsed && 'md:hidden')}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-garden-700 space-y-1">
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
            className={clsx(
              'hidden md:flex items-center gap-3 px-3 py-2.5 w-full text-left text-garden-300 hover:text-white hover:bg-garden-700 rounded-lg text-sm transition-colors',
              collapsed && 'md:justify-center md:px-0'
            )}
          >
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}
          </button>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 w-full text-left text-garden-300 hover:text-white hover:bg-garden-700 rounded-lg text-sm transition-colors',
              collapsed && 'md:justify-center md:px-0'
            )}
          >
            <LogOut size={18} />
            <span className={clsx(collapsed && 'md:hidden')}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-garden-50 pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
