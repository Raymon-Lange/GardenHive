import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, UserPlus, Trash2, Leaf, Pencil, Eye, EyeOff, ImagePlus } from 'lucide-react';
import api, { uploadUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useGarden } from '../context/GardenContext';

const PERMISSION_LABELS = {
  analytics:           'Analytics only',
  harvests_analytics:  'Harvests & Analytics',
  full:                'Full access',
};

const CATEGORY_LABELS = {
  vegetable: 'Vegetable',
  fruit:     'Fruit',
  herb:      'Herb',
  flower:    'Flower',
};

const EMOJI_OPTIONS = [
  '🌱','🌿','🍅','🥕','🥦','🌽','🥒','🫑','🧅','🧄',
  '🍆','🌶️','🥬','🫛','🍓','🍇','🍉','🍊','🍋','🍌',
  '🍍','🎃','🍎','🍐','🍑','🍒','🫐','🥝','🌸','🌺',
  '🌻','🌹','🌼','🌾','🍄','🪴','🌵','🫘','🌰','🥜',
];

const BLANK_FORM = {
  name: '', category: 'vegetable', emoji: '🌱', description: '',
  perSqFt: 1, daysToHarvest: '', daysToGermination: '', spacingIn: '', depthIn: '',
};

function PlantForm({ initial, onSave, onCancel, isPending, error }) {
  const [form, setForm] = useState(initial ?? BLANK_FORM);

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const body = {
      name:              form.name.trim(),
      category:          form.category,
      emoji:             form.emoji,
      description:       form.description || undefined,
      perSqFt:           Number(form.perSqFt) || 1,
      daysToHarvest:     form.daysToHarvest !== '' ? Number(form.daysToHarvest) : undefined,
      daysToGermination: form.daysToGermination !== '' ? Number(form.daysToGermination) : undefined,
      spacingIn:         form.spacingIn !== '' ? Number(form.spacingIn) : undefined,
      depthIn:           form.depthIn !== '' ? Number(form.depthIn) : undefined,
    };
    onSave(body);
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mt-4 space-y-4">
      <h3 className="font-semibold text-garden-900">
        {initial ? 'Edit plant' : 'New plant'}
      </h3>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="label">Name *</label>
          <input
            className="input w-full"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Cherry Tomato"
            required
          />
        </div>

        {/* Type */}
        <div>
          <label className="label">Type</label>
          <select className="input w-full" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Per sq ft */}
        <div>
          <label className="label">Plants per sq ft</label>
          <input
            type="number" min={0.1} step="any"
            className="input w-full"
            value={form.perSqFt}
            onChange={(e) => set('perSqFt', e.target.value)}
          />
        </div>

        {/* Days to harvest */}
        <div>
          <label className="label">Days to harvest</label>
          <input
            type="number" min={1}
            className="input w-full"
            placeholder="Optional"
            value={form.daysToHarvest}
            onChange={(e) => set('daysToHarvest', e.target.value)}
          />
        </div>

        {/* Days to germination */}
        <div>
          <label className="label">Days to germination</label>
          <input
            type="number" min={1}
            className="input w-full"
            placeholder="Optional"
            value={form.daysToGermination}
            onChange={(e) => set('daysToGermination', e.target.value)}
          />
        </div>

        {/* Spacing */}
        <div>
          <label className="label">Spacing (inches)</label>
          <input
            type="number" min={0.1} step="any"
            className="input w-full"
            placeholder="Optional"
            value={form.spacingIn}
            onChange={(e) => set('spacingIn', e.target.value)}
          />
        </div>

        {/* Depth */}
        <div>
          <label className="label">Planting depth (inches)</label>
          <input
            type="number" min={0.1} step="any"
            className="input w-full"
            placeholder="Optional"
            value={form.depthIn}
            onChange={(e) => set('depthIn', e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea
            className="input w-full resize-none"
            rows={2}
            placeholder="Optional notes about this plant"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Icon picker */}
        <div className="sm:col-span-2">
          <label className="label">Icon</label>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl">{form.emoji}</span>
            <div className="flex flex-wrap gap-1">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => set('emoji', em)}
                  className={`text-lg rounded p-0.5 transition-colors ${
                    form.emoji === em
                      ? 'bg-garden-200 ring-2 ring-garden-500'
                      : 'hover:bg-garden-100'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save plant'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Admin() {
  const { user, updateUser } = useAuth();
  const { isOwnGarden } = useGarden();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('access');

  // Garden Settings tab state
  const [gardenNameInput, setGardenNameInput] = useState(user?.gardenName ?? '');
  const [gardenNameSaved, setGardenNameSaved] = useState(false);
  const [gardenNameError, setGardenNameError] = useState('');
  const [gardenNameLoading, setGardenNameLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageLoading, setImageLoading] = useState(false);

  // Access tab state
  const [inviteForm, setInviteForm] = useState({ email: '', permission: 'analytics' });
  const [inviteError, setInviteError] = useState('');

  // Plants tab state
  const [editingPlant, setEditingPlant] = useState(null); // null=hidden, {}=new, plant=edit
  const [plantError, setPlantError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Redirect if not owner viewing own garden
  if (user?.role !== 'owner' || !isOwnGarden) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Access queries / mutations ──────────────────────────────────────────────
  const { data: grants = [], isLoading: accessLoading } = useQuery({
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

  // ── Plants queries / mutations ──────────────────────────────────────────────
  const { data: myPlants = [], isLoading: plantsLoading } = useQuery({
    queryKey: ['plants', 'mine'],
    queryFn: () => api.get('/plants', { params: { showAll: true } }).then((r) => r.data),
  });

  const toggleVisibility = useMutation({
    mutationFn: (plantId) => api.post('/auth/me/hidden-plants', { plantId }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
  });

  function invalidatePlants() {
    queryClient.invalidateQueries({ queryKey: ['plants', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['plants'] });
  }

  const createPlant = useMutation({
    mutationFn: (body) => api.post('/plants', body).then((r) => r.data),
    onSuccess: () => { invalidatePlants(); setEditingPlant(null); setPlantError(''); },
    onError: (err) => setPlantError(err.response?.data?.error || 'Failed to create plant'),
  });

  const updatePlant = useMutation({
    mutationFn: ({ id, body }) => api.put(`/plants/${id}`, body).then((r) => r.data),
    onSuccess: () => { invalidatePlants(); setEditingPlant(null); setPlantError(''); },
    onError: (err) => setPlantError(err.response?.data?.error || 'Failed to update plant'),
  });

  const deletePlant = useMutation({
    mutationFn: (id) => api.delete(`/plants/${id}`).then((r) => r.data),
    onSuccess: () => { invalidatePlants(); setDeleteError(''); },
    onError: (err) => setDeleteError(err.response?.data?.error || 'Failed to delete plant'),
  });

  function handlePlantSave(body) {
    if (editingPlant?._id) {
      updatePlant.mutate({ id: editingPlant._id, body });
    } else {
      createPlant.mutate(body);
    }
  }

  function startEdit(plant) {
    setPlantError('');
    setDeleteError('');
    setEditingPlant({
      ...plant,
      daysToHarvest:     plant.daysToHarvest     ?? '',
      daysToGermination: plant.daysToGermination ?? '',
      spacingIn:         plant.spacingIn         ?? '',
      depthIn:           plant.depthIn           ?? '',
    });
  }

  function startAdd() {
    setPlantError('');
    setDeleteError('');
    setEditingPlant({});
  }

  // ── Garden Settings handlers ─────────────────────────────────────────────
  async function handleSaveGardenName(e) {
    e.preventDefault();
    setGardenNameError('');
    setGardenNameSaved(false);
    setGardenNameLoading(true);
    try {
      const { data } = await api.put('/auth/me/garden', { gardenName: gardenNameInput });
      updateUser({ gardenName: data.gardenName });
      setGardenNameSaved(true);
    } catch (err) {
      setGardenNameError(err.response?.data?.error ?? 'Failed to save');
    } finally {
      setGardenNameLoading(false);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setImageError('Image must be under 5 MB'); return; }
    setImageError('');
    setImageLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/auth/me/garden-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ gardenImage: data.gardenImage });
    } catch (err) {
      setImageError(err.response?.data?.error ?? 'Upload failed');
    } finally {
      setImageLoading(false);
      e.target.value = '';
    }
  }

  async function handleRemoveImage() {
    setImageError('');
    setImageLoading(true);
    try {
      const { data } = await api.delete('/auth/me/garden-image');
      updateUser({ gardenImage: data.gardenImage });
    } catch (err) {
      setImageError(err.response?.data?.error ?? 'Failed to remove image');
    } finally {
      setImageLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck size={24} className="text-garden-600" />
        <div>
          <h1 className="text-2xl font-bold text-garden-900">Admin</h1>
          <p className="text-garden-600 text-sm mt-0.5">Manage your garden access and custom plants.</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'access',   label: 'Garden Access' },
          { key: 'plants',   label: 'My Plants' },
          { key: 'settings', label: 'Garden Settings' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-garden-600 text-white'
                : 'bg-garden-100 text-garden-700 hover:bg-garden-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Garden Access tab ── */}
      {activeTab === 'access' && (
        <div>
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
            {accessLoading ? (
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
      )}

      {/* ── My Plants tab ── */}
      {activeTab === 'plants' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-garden-900 flex items-center gap-2">
              <Leaf size={16} className="text-garden-600" /> Custom plants
            </h2>
            {!editingPlant && (
              <button onClick={startAdd} className="btn-primary text-sm">
                + Add plant
              </button>
            )}
          </div>

          {deleteError && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {deleteError}
            </div>
          )}

          {/* Plant list */}
          {plantsLoading ? (
            <div className="card p-6 text-center text-garden-400 text-sm">Loading…</div>
          ) : myPlants.length === 0 && !editingPlant ? (
            <div className="card p-8 text-center">
              <p className="text-garden-500 text-sm">No custom plants yet.</p>
              <button onClick={startAdd} className="btn-primary mt-4">Add your first plant</button>
            </div>
          ) : (
            myPlants.length > 0 && (
              <div className="card divide-y divide-garden-50">
                {myPlants.map((plant) => (
                  <div
                    key={plant._id}
                    className={`flex items-center gap-3 px-4 py-3 transition-opacity ${plant.hidden ? 'opacity-40' : ''}`}
                  >
                    <span className="text-2xl">{plant.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-garden-900 truncate">{plant.name}</p>
                      <p className="text-xs text-garden-500">
                        {CATEGORY_LABELS[plant.category]}
                        {plant.daysToHarvest ? ` · ${plant.daysToHarvest}d to harvest` : ''}
                        {plant.daysToGermination ? ` · ${plant.daysToGermination}d germ.` : ''}
                        {plant.spacingIn ? ` · ${plant.spacingIn}" spacing` : ''}
                        {plant.depthIn ? ` · ${plant.depthIn}" depth` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {/* Visibility toggle — available for all plants */}
                      <button
                        onClick={() => toggleVisibility.mutate(plant._id)}
                        className="p-2 text-garden-400 hover:text-garden-700 hover:bg-garden-100 rounded-lg transition-colors"
                        title={plant.hidden ? 'Show in plant lists' : 'Hide from plant lists'}
                        disabled={toggleVisibility.isPending}
                      >
                        {plant.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      {/* Edit / Delete — custom plants only */}
                      {plant.ownerId && (
                        <>
                          <button
                            onClick={() => startEdit(plant)}
                            className="p-2 text-garden-400 hover:text-garden-700 hover:bg-garden-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError('');
                              deletePlant.mutate(plant._id);
                            }}
                            className="p-2 text-garden-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                            disabled={deletePlant.isPending}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Add / Edit form */}
          {editingPlant !== null && (
            <PlantForm
              initial={editingPlant?._id ? editingPlant : null}
              onSave={handlePlantSave}
              onCancel={() => { setEditingPlant(null); setPlantError(''); }}
              isPending={createPlant.isPending || updatePlant.isPending}
              error={plantError}
            />
          )}
        </div>
      )}

      {/* ── Garden Settings tab ── */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-lg">

          {/* Garden name */}
          <div className="card p-5">
            <h2 className="font-semibold text-garden-900 mb-4">Garden name</h2>
            <form onSubmit={handleSaveGardenName} className="space-y-3">
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. The Back Garden"
                value={gardenNameInput}
                onChange={(e) => { setGardenNameInput(e.target.value); setGardenNameSaved(false); }}
              />
              {gardenNameError && <p className="text-red-600 text-sm">{gardenNameError}</p>}
              <div className="flex items-center gap-3">
                <button type="submit" className="btn-primary" disabled={gardenNameLoading}>
                  {gardenNameLoading ? 'Saving…' : 'Save name'}
                </button>
                {gardenNameSaved && <span className="text-sm text-garden-600">Saved</span>}
              </div>
            </form>
          </div>

          {/* Garden image */}
          <div className="card p-5">
            <h2 className="font-semibold text-garden-900 mb-4">Garden image</h2>

            {user?.gardenImage ? (
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={uploadUrl(user.gardenImage)}
                  alt="Garden"
                  className="w-20 h-20 rounded-full object-cover border-2 border-garden-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={imageLoading}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  {imageLoading ? 'Removing…' : 'Remove image'}
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-garden-100 flex items-center justify-center mb-4 text-3xl">
                🌿
              </div>
            )}

            {imageError && <p className="text-red-600 text-sm mb-3">{imageError}</p>}

            <label className="btn-secondary cursor-pointer inline-flex items-center gap-2">
              <ImagePlus size={16} />
              {imageLoading ? 'Uploading…' : user?.gardenImage ? 'Change image' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={imageLoading}
                onChange={handleImageUpload}
              />
            </label>
            <p className="text-xs text-garden-500 mt-2">JPG, PNG, GIF or WebP · max 5 MB</p>
          </div>

        </div>
      )}
    </div>
  );
}
