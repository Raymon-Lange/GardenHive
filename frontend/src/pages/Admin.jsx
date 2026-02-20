import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, UserPlus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useGarden } from '../context/GardenContext';

const PERMISSION_LABELS = {
  analytics:           'Analytics only',
  harvests_analytics:  'Harvests & Analytics',
  full:                'Full access',
};

export default function Admin() {
  const { user } = useAuth();
  const { isOwnGarden } = useGarden();
  const queryClient = useQueryClient();

  const [inviteForm, setInviteForm] = useState({ email: '', permission: 'analytics' });
  const [inviteError, setInviteError] = useState('');

  // Redirect if not owner viewing own garden
  if (user?.role !== 'owner' || !isOwnGarden) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ['access'],
    queryFn: () => api.get('/access').then((r) => r.data),
  });

  const invite = useMutation({
    mutationFn: (body) => api.post('/access', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access'] });
      setInviteForm({ email: '', permission: 'analytics' });
      setInviteError('');
    },
    onError: (err) => setInviteError(err.response?.data?.error || 'Failed to invite'),
  });

  const updatePermission = useMutation({
    mutationFn: ({ id, permission }) => api.put(`/access/${id}`, { permission }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access'] }),
  });

  const revoke = useMutation({
    mutationFn: (id) => api.delete(`/access/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access'] }),
  });

  function handleInvite(e) {
    e.preventDefault();
    setInviteError('');
    invite.mutate(inviteForm);
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <ShieldCheck size={24} className="text-garden-600" />
        <div>
          <h1 className="text-2xl font-bold text-garden-900">Garden Access</h1>
          <p className="text-garden-600 text-sm mt-0.5">
            Invite others to view or help with your garden.
          </p>
        </div>
      </div>

      {/* Invite form */}
      <div className="card p-5 mb-8">
        <h2 className="font-semibold text-garden-900 mb-4 flex items-center gap-2">
          <UserPlus size={16} /> Invite someone
        </h2>
        {inviteError && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {inviteError}
          </div>
        )}
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            className="input flex-1"
            placeholder="their@email.com"
            value={inviteForm.email}
            onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <select
            className="input sm:w-52"
            value={inviteForm.permission}
            onChange={(e) => setInviteForm((f) => ({ ...f, permission: e.target.value }))}
          >
            {Object.entries(PERMISSION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary shrink-0" disabled={invite.isPending}>
            {invite.isPending ? 'Inviting…' : 'Invite'}
          </button>
        </form>
      </div>

      {/* Access list */}
      <div>
        <h2 className="font-semibold text-garden-900 mb-3">People with access</h2>
        {isLoading ? (
          <div className="card p-6 text-center text-garden-400 text-sm">Loading…</div>
        ) : grants.length === 0 ? (
          <div className="card p-6 text-center text-garden-400 text-sm">
            No one has access yet. Invite someone above.
          </div>
        ) : (
          <div className="card divide-y divide-garden-50">
            {grants.map((g) => (
              <div key={g._id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-garden-900 truncate">{g.granteeEmail}</p>
                  <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                    g.status === 'active'
                      ? 'bg-garden-100 text-garden-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {g.status === 'active' ? 'Active' : 'Pending'}
                  </span>
                </div>
                <select
                  className="input w-44 text-sm"
                  value={g.permission}
                  onChange={(e) => updatePermission.mutate({ id: g._id, permission: e.target.value })}
                >
                  {Object.entries(PERMISSION_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={() => revoke.mutate(g._id)}
                  className="p-2 text-garden-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Revoke access"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
