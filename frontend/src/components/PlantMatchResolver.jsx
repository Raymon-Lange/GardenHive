import { useState } from 'react';
import { CheckCircle, SkipForward } from 'lucide-react';

export default function PlantMatchResolver({ rawName, suggestion, allPlants, resolved, onResolve, onSkip }) {
  const [showOverride, setShowOverride] = useState(false);

  // Already resolved — show status badge
  if (resolved) {
    if (resolved.skipped) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-garden-50 border border-garden-100 rounded-lg text-sm text-garden-500">
          <SkipForward size={14} />
          <span>Row skipped: <span className="font-medium">"{rawName}"</span></span>
        </div>
      );
    }
    const plant = allPlants.find((p) => p._id === resolved.plantId);
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
        <CheckCircle size={14} />
        <span>
          <span className="font-medium">"{rawName}"</span> → {plant?.emoji} {plant?.name}
        </span>
      </div>
    );
  }

  const sortedPlants = [...allPlants].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="px-3 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm space-y-2">
      <p className="text-yellow-800">
        <span className="font-medium">"{rawName}"</span>
        {suggestion
          ? <> — did you mean <span className="font-medium">{suggestion.plantEmoji} {suggestion.plantName}</span>?</>
          : <> — no match found</>}
      </p>

      <div className="flex flex-wrap gap-2">
        {suggestion && !showOverride && (
          <button
            className="btn-primary text-xs py-1 px-3"
            onClick={() => onResolve(suggestion.plantId)}
          >
            Yes, use {suggestion.plantName}
          </button>
        )}

        {!showOverride && (
          <button
            className="btn-secondary text-xs py-1 px-3"
            onClick={() => setShowOverride(true)}
          >
            Choose a different plant
          </button>
        )}

        {showOverride && (
          <select
            className="input text-xs py-1"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onResolve(e.target.value);
            }}
          >
            <option value="" disabled>Select a plant…</option>
            {sortedPlants.map((p) => (
              <option key={p._id} value={p._id}>{p.emoji} {p.name}</option>
            ))}
          </select>
        )}

        <button
          className="btn-secondary text-xs py-1 px-3 text-garden-500"
          onClick={onSkip}
        >
          Skip this row
        </button>
      </div>
    </div>
  );
}
