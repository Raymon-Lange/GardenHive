import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Card 1 — Profile details
  const [name, setName] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);

  async function handleSaveName(e) {
    e.preventDefault();
    setNameError('');
    setNameSaved(false);
    if (!name.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }
    setNameLoading(true);
    try {
      const { data } = await api.put('/auth/me', { name: name.trim() });
      updateUser({ name: data.name });
      setNameSaved(true);
    } catch (err) {
      setNameError(err.response?.data?.error ?? 'Failed to update name.');
    } finally {
      setNameLoading(false);
    }
  }

  // Card 2 — Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwSuccess(true);
    } catch (err) {
      setPwError(err.response?.data?.error ?? 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  }

  // Card 3 — Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteError('');
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Password is required.');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete('/auth/me', { data: { password: deletePassword } });
      logout();
      navigate('/signup');
    } catch (err) {
      setDeleteError(err.response?.data?.error ?? 'Failed to delete account.');
      setDeleteLoading(false);
    }
  }

  const isOwner = user?.role === 'owner';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-garden-900">Profile</h1>

      {/* Card 1 — Profile details */}
      <div className="bg-white rounded-2xl shadow-sm border border-garden-100 p-6">
        <h2 className="text-lg font-semibold text-garden-800 mb-4">Profile details</h2>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-garden-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameSaved(false); }}
              className="input w-full"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-garden-700 mb-1">Email</label>
            <p className="text-garden-900 text-sm py-2">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-garden-700 mb-1">Role</label>
            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${isOwner ? 'bg-garden-100 text-garden-800' : 'bg-blue-100 text-blue-800'}`}>
              {isOwner ? 'Owner' : 'Helper'}
            </span>
          </div>
          {nameError && <p className="text-red-600 text-sm">{nameError}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={nameLoading}>
              {nameLoading ? 'Saving…' : 'Save changes'}
            </button>
            {nameSaved && <span className="text-sm text-garden-600">Saved</span>}
          </div>
        </form>
      </div>

      {/* Card 2 — Change password */}
      <div className="bg-white rounded-2xl shadow-sm border border-garden-100 p-6">
        <h2 className="text-lg font-semibold text-garden-800 mb-4">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-garden-700 mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPwSuccess(false); }}
              className="input w-full"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-garden-700 mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwSuccess(false); }}
              className="input w-full"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-garden-700 mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPwSuccess(false); }}
              className="input w-full"
              autoComplete="new-password"
            />
          </div>
          {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={pwLoading}>
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
            {pwSuccess && <span className="text-sm text-garden-600">Password updated</span>}
          </div>
        </form>
      </div>

      {/* Card 3 — Danger zone */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-3">Danger zone</h2>
        <p className="text-sm text-garden-700 mb-4">
          {isOwner
            ? 'This will permanently delete your account and all associated garden data — beds, harvests, and shared access. This cannot be undone.'
            : 'This will deactivate your account and remove your access to shared gardens.'}
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger"
          >
            Delete account
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-garden-700 mb-1">
                Your password
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
                className="input w-full"
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-garden-700 mb-1">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError(''); }}
                className="input w-full"
                placeholder="DELETE"
              />
            </div>
            {deleteError && <p className="text-red-600 text-sm">{deleteError}</p>}
            <div className="flex gap-3">
              <button type="submit" className="btn-danger" disabled={deleteLoading}>
                {deleteLoading ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteConfirmText(''); setDeleteError(''); }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
