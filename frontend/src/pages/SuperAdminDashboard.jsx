import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function SuperAdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
    staleTime: 30_000,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-garden-900 mb-6">Platform Stats</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statsLoading ? (
          <>
            <div className="card h-24 animate-pulse bg-garden-100" />
            <div className="card h-24 animate-pulse bg-garden-100" />
            <div className="card h-24 animate-pulse bg-garden-100" />
          </>
        ) : (
          <>
            <StatCard label="Total Users"    value={stats?.totalUsers    ?? '—'} />
            <StatCard label="Total Gardens"  value={stats?.totalGardens  ?? '—'} />
            <StatCard label="Total Harvests" value={stats?.totalHarvests ?? '—'} />
          </>
        )}
      </div>

      {/* User report table */}
      <h2 className="text-lg font-semibold text-garden-900 mb-3">User Report</h2>

      {usersLoading ? (
        <div className="card animate-pulse h-32 bg-garden-100" />
      ) : users.length === 0 ? (
        <div className="card text-center text-garden-500 py-8">No users yet</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-garden-200 bg-garden-50">
                <th className="text-left px-4 py-3 text-garden-700 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-garden-700 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-garden-700 font-medium">Registered</th>
                <th className="text-left px-4 py-3 text-garden-700 font-medium">Last Login</th>
                <th className="text-right px-4 py-3 text-garden-700 font-medium">Gardens</th>
                <th className="text-right px-4 py-3 text-garden-700 font-medium">Harvests</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-garden-100 last:border-0 hover:bg-garden-50">
                  <td className="px-4 py-3 text-garden-900">{u.name}</td>
                  <td className="px-4 py-3 text-garden-600">{u.email}</td>
                  <td className="px-4 py-3 text-garden-600">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {u.lastLoginAt ? (
                      <span className="text-garden-600">
                        {new Date(u.lastLoginAt).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-garden-400">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-garden-600">{u.bedCount}</td>
                  <td className="px-4 py-3 text-right text-garden-600">{u.harvestCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card flex flex-col items-center justify-center py-6 gap-1">
      <span className="text-3xl font-bold text-garden-900">{value}</span>
      <span className="text-sm text-garden-500">{label}</span>
    </div>
  );
}
