import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ruler } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function GardenDimensionsModal({ onSave }) {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  const [form, setForm] = useState({ width: '', height: '' });
  const [errors, setErrors] = useState({});

  const saveDimensions = useMutation({
    mutationFn: ({ gardenWidth, gardenHeight }) =>
      api.put('/auth/me/garden', { gardenWidth, gardenHeight }).then((r) => r.data),
    onSuccess: (updatedUser) => {
      updateUser({ gardenWidth: updatedUser.gardenWidth, gardenHeight: updatedUser.gardenHeight });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      onSave(updatedUser.gardenWidth, updatedUser.gardenHeight);
    },
  });

  function validate() {
    const errs = {};
    const w = Number(form.width);
    const h = Number(form.height);
    if (!form.width || !Number.isInteger(w) || w < 1) errs.width = 'Enter a whole number greater than 0';
    if (!form.height || !Number.isInteger(h) || h < 1) errs.height = 'Enter a whole number greater than 0';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    saveDimensions.mutate({ gardenWidth: Number(form.width), gardenHeight: Number(form.height) });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-2">
          <Ruler size={22} className="text-garden-600" />
          <h2 className="text-xl font-bold text-garden-900">Set your garden size</h2>
        </div>
        <p className="text-garden-600 text-sm mb-6">
          Enter the total size of your garden in feet — including beds, paths, and walkways.
          You only need to do this once.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Width (ft)</label>
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 20"
              value={form.width}
              onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))}
            />
            {errors.width && <p className="text-red-500 text-xs mt-1">{errors.width}</p>}
          </div>

          <div>
            <label className="label">Height (ft)</label>
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 12"
              value={form.height}
              onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
            />
            {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
          </div>

          {saveDimensions.error && (
            <p className="text-red-500 text-sm">{saveDimensions.error.response?.data?.error || 'Failed to save'}</p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={saveDimensions.isPending}
          >
            {saveDimensions.isPending ? 'Saving…' : 'Set garden size'}
          </button>
        </form>
      </div>
    </div>
  );
}
