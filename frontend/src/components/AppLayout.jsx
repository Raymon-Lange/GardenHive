import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGarden } from '../context/GardenContext';
import { uploadUrl } from '../lib/api';
import {
  LayoutDashboard, Leaf, LogOut, Map, BarChart2,
  Menu, X, ChevronLeft, ChevronRight, ShieldCheck, UserCircle,
} from 'lucide-react';
import clsx from 'clsx';

const ALL_NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, minPermission: 'full' },
  { to: '/map',       label: 'Garden Map', icon: Map,             minPermission: 'full' },
  { to: '/harvests',  label: 'Harvests',   icon: Leaf,            minPermission: 'harvests_analytics' },
  { to: '/analytics', label: 'Analytics',  icon: BarChart2,       minPermission: 'analytics' },
];

const LEVELS = { analytics: 1, harvests_analytics: 2, full: 3, owner: 4 };

function allowedNavItems(permission) {
  const level = LEVELS[permission] ?? 4;
  return ALL_NAV_ITEMS.filter((item) => (LEVELS[item.minPermission] ?? 1) <= level);
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const { permission, isOwnGarden, sharedGardens, activeGarden, setActiveGarden, isAwaitingInvite } = useGarden();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  function handleGardenSwitch(e) {
    const val = e.target.value;
    if (val === 'own') {
      setActiveGarden(null);
      navigate('/dashboard');
    } else {
      const garden = sharedGardens.find((g) => g.ownerId.toString() === val);
      if (garden) {
        setActiveGarden(garden);
        // Navigate to first accessible page
        const level = LEVELS[garden.permission] ?? 1;
        if (level >= LEVELS['full']) navigate('/dashboard');
        else if (level >= LEVELS['harvests_analytics']) navigate('/harvests');
        else navigate('/analytics');
      }
    }
    setMobileOpen(false);
  }

  const navItems = allowedNavItems(permission);
  const showSwitcher = user?.role === 'helper' || sharedGardens.length > 0;
  const switcherValue = activeGarden ? activeGarden.ownerId.toString() : 'own';

  // Current garden display
  const currentGardenName  = activeGarden
    ? (activeGarden.gardenName  || `${activeGarden.ownerName}'s Garden`)
    : (user?.gardenName || 'My Garden');
  const currentGardenImage = activeGarden ? activeGarden.gardenImage : user?.gardenImage;

  // Waiting for invite screen (helper with no access yet)
  if (isAwaitingInvite) {
    return (
      <div className="min-h-screen bg-garden-50 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-5xl mb-4">🌿</span>
        <h1 className="text-xl font-bold text-garden-900 mb-2">Waiting for an invite</h1>
        <p className="text-garden-600 text-sm max-w-sm">
          Ask a garden owner to invite your email address. Once they do, you'll see their garden here.
        </p>
        <button
          onClick={handleLogout}
          className="mt-6 flex items-center gap-2 text-sm text-garden-500 hover:text-garden-800"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    );
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
          'fixed inset-y-0 left-0 z-50 w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:static md:inset-auto md:z-auto md:translate-x-0 md:shrink-0',
          collapsed ? 'md:w-16' : 'md:w-56'
        )}
      >
        {/* Sidebar header */}
        <div className="px-4 py-5 border-b border-garden-700 flex items-center justify-between min-h-[72px]">
          <div className={clsx('flex items-center gap-2.5 overflow-hidden', collapsed && 'md:hidden')}>
            {currentGardenImage ? (
              <img
                src={uploadUrl(currentGardenImage)}
                alt="Garden"
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-garden-600"
              />
            ) : (
              <span className="text-xl shrink-0">🌿</span>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-bold tracking-tight whitespace-nowrap truncate leading-tight">
                {currentGardenName}
              </p>
              <p className="text-garden-300 text-xs mt-0.5 truncate">{user?.name}</p>
            </div>
          </div>
          {collapsed && (
            <div className="hidden md:flex items-center justify-center w-full">
              {currentGardenImage ? (
                <img
                  src={uploadUrl(currentGardenImage)}
                  alt="Garden"
                  className="w-8 h-8 rounded-full object-cover border border-garden-600"
                />
              ) : (
                <span className="text-xl">🌿</span>
              )}
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded hover:bg-garden-700 ml-auto"
          >
            <X size={20} />
          </button>
        </div>

        {/* Garden switcher */}
        {showSwitcher && !collapsed && (
          <div className="px-3 pt-3">
            <select
              value={switcherValue}
              onChange={handleGardenSwitch}
              className="w-full bg-garden-700 text-white text-xs rounded-lg px-3 py-2 border border-garden-600 focus:outline-none focus:border-garden-400"
            >
              {user?.role === 'owner' && (
                <option value="own">
                  {user.gardenName || 'My Garden'}
                </option>
              )}
              {sharedGardens.map((g) => (
                <option key={g.ownerId} value={g.ownerId.toString()}>
                  {g.gardenName || `${g.ownerName}'s Garden`}
                </option>
              ))}
            </select>
          </div>
        )}

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

          {/* Profile link — always visible */}
          <NavLink
            to="/profile"
            title={collapsed ? 'Profile' : undefined}
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
            <UserCircle size={18} />
            <span className={clsx(collapsed && 'md:hidden')}>Profile</span>
          </NavLink>

          {/* Admin link — owner viewing own garden only */}
          {user?.role === 'owner' && isOwnGarden && (
            <NavLink
              to="/admin"
              title={collapsed ? 'Admin' : undefined}
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
              <ShieldCheck size={18} />
              <span className={clsx(collapsed && 'md:hidden')}>Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-garden-700 space-y-1">
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
