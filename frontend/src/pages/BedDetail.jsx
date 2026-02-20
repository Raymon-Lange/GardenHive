import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useGarden } from '../context/GardenContext';
import { ArrowLeft, X, Search } from 'lucide-react';
import clsx from 'clsx';

function useBed(id) {
  return useQuery({
    queryKey: ['beds', id],
    queryFn: () => api.get(`/beds/${id}`).then((r) => r.data),
  });
}

function usePlants(ownerId) {
  return useQuery({
    queryKey: ['plants', ownerId],
    queryFn: () => api.get('/plants', { params: ownerId ? { ownerId } : undefined }).then((r) => r.data),
  });
}

function PlantPicker({ ownerId, onSelect, onClear, onClose }) {
  const { data: plants = [] } = usePlants(ownerId);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const filtered = plants.filter((p) => {
    if (category && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-garden-100">
          <h2 className="font-semibold text-garden-900">Choose a plant</h2>
          <button onClick={onClose} className="text-garden-400 hover:text-garden-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-garden-400" />
            <input
              className="input pl-8 text-sm"
              placeholder="Search plants…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['', 'vegetable', 'fruit', 'herb'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  category === cat
                    ? 'bg-garden-600 text-white'
                    : 'bg-garden-100 text-garden-700 hover:bg-garden-200'
                )}
              >
                {cat || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {filtered.length === 0 ? (
            <p className="text-center text-garden-500 text-sm py-6">No plants found</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((plant) => (
                <button
                  key={plant._id}
                  onClick={() => onSelect(plant)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-garden-50 transition-colors"
                >
                  <span className="text-xl">{plant.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-garden-900 truncate">{plant.name}</p>
                    <p className="text-xs text-garden-500">
                      {plant.perSqFt}/sq ft · {plant.daysToHarvest}d to harvest
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClear}
            className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear cell
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BedDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { activeGarden } = useGarden();
  const { data: bed, isLoading } = useBed(id);
  const [selectedCell, setSelectedCell] = useState(null); // {row, col}
  const gardenOwnerId = activeGarden?.ownerId?.toString();

  const updateCell = useMutation({
    mutationFn: ({ row, col, plantId }) =>
      api.put(`/beds/${id}/cells`, { row, col, plantId }).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['beds', id], updated);
      setSelectedCell(null);
    },
  });

  if (isLoading) return <p className="text-garden-500">Loading…</p>;
  if (!bed) return <p className="text-red-500">Bed not found.</p>;

  function getCell(row, col) {
    return bed.cells?.find((c) => c.row === row && c.col === col);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/beds" className="text-garden-500 hover:text-garden-700 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-garden-900">{bed.name}</h1>
          <p className="text-garden-600 text-sm">
            {bed.rows} × {bed.cols} ft grid · Click a cell to assign a plant
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-garden-600">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-garden-100 rounded border border-garden-200 inline-block" />
          Empty
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-garden-200 rounded border border-garden-300 inline-block" />
          Planted
        </span>
      </div>

      {/* Grid */}
      <div className="card p-4 inline-block">
        {/* Column headers */}
        <div
          className="grid gap-1 mb-1"
          style={{ gridTemplateColumns: `2rem repeat(${bed.cols}, minmax(0, 1fr))` }}
        >
          <div />
          {Array.from({ length: bed.cols }, (_, i) => (
            <div key={i} className="text-center text-xs text-garden-400 font-medium">
              {i + 1}
            </div>
          ))}
        </div>

        {Array.from({ length: bed.rows }, (_, row) => (
          <div
            key={row}
            className="grid gap-1 mb-1"
            style={{ gridTemplateColumns: `2rem repeat(${bed.cols}, minmax(0, 1fr))` }}
          >
            {/* Row header */}
            <div className="flex items-center justify-center text-xs text-garden-400 font-medium">
              {row + 1}
            </div>
            {Array.from({ length: bed.cols }, (_, col) => {
              const cell = getCell(row, col);
              const plant = cell?.plantId;
              return (
                <button
                  key={col}
                  onClick={() => setSelectedCell({ row, col })}
                  className={clsx(
                    'w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:scale-105',
                    plant
                      ? 'bg-garden-100 border-garden-300 hover:border-garden-400'
                      : 'bg-white border-garden-200 hover:border-garden-400 hover:bg-garden-50'
                  )}
                  title={plant ? `${plant.emoji} ${plant.name}` : 'Empty — click to plant'}
                >
                  {plant ? (
                    <>
                      <span className="text-lg leading-none">{plant.emoji}</span>
                      <span className="text-[9px] text-garden-600 leading-tight text-center mt-0.5 px-0.5 truncate w-full text-center">
                        {plant.name.split(' ')[0]}
                      </span>
                    </>
                  ) : (
                    <span className="text-garden-300 text-lg">+</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Plant count summary */}
      {bed.cells && bed.cells.filter((c) => c.plantId).length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-garden-900 mb-3">What's planted</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(
              bed.cells
                .filter((c) => c.plantId)
                .reduce((acc, c) => {
                  const key = c.plantId._id;
                  acc[key] = acc[key] || { ...c.plantId, count: 0 };
                  acc[key].count++;
                  return acc;
                }, {})
            ).map(([, p]) => (
              <span
                key={p._id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-garden-100 text-garden-800 rounded-full text-sm"
              >
                {p.emoji} {p.name}
                <span className="text-garden-500">×{p.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Plant picker modal */}
      {selectedCell && (
        <PlantPicker
          ownerId={gardenOwnerId}
          onSelect={(plant) =>
            updateCell.mutate({ row: selectedCell.row, col: selectedCell.col, plantId: plant._id })
          }
          onClear={() =>
            updateCell.mutate({ row: selectedCell.row, col: selectedCell.col, plantId: null })
          }
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
}
