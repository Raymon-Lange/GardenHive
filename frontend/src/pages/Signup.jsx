import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState('owner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-garden-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-garden-800">🌿 GardenHive</Link>
          <h1 className="text-xl font-semibold text-garden-900 mt-4">Create your account</h1>
          <p className="text-garden-600 text-sm mt-1">Free to get started</p>
        </div>

        <div className="card p-6">
          {/* Role toggle */}
          <div className="mb-5">
            <label className="label mb-2">I am a…</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'owner', label: '🌱 Garden Owner', desc: 'Plan & track my own garden' },
                { value: 'helper', label: '🤝 Garden Helper', desc: 'Help with someone else\'s garden' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={clsx(
                    'text-left p-3 rounded-lg border-2 transition-colors',
                    role === opt.value
                      ? 'border-garden-600 bg-garden-50'
                      : 'border-garden-200 hover:border-garden-400'
                  )}
                >
                  <div className="text-sm font-medium text-garden-900">{opt.label}</div>
                  <div className="text-xs text-garden-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-garden-600 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-garden-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
