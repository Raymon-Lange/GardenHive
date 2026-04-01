import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useGarden } from '../context/GardenContext';
import { ArrowLeft, Search } from 'lucide-react';
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

export default function BedDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { activeGarden } = useGarden();
  const { data: bed, isLoading } = useBed(id);
  const gardenOwnerId = activeGarden?.ownerId?.toString();
  const { data: plants = [] } = usePlants(gardenOwnerId);

  const [selectedPlant, setSelectedPlant] = useState(null);
  const [search, setSearch] = useState('');

  const updateCell = useMutation({
    mutationFn: ({ row, col, plantId }) =>
      api.put(`/beds/${id}/cells`, { row, col, plantId }).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['beds', id], updated);
    },
  });

  const clearBed = useMutation({
    mutationFn: () => api.delete(`/beds/${id}/cells`).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['beds', id], updated);
    },
  });

  if (isLoading) return <p className="text-garden-500">Loading…</p>;
  if (!bed) return <p className="text-red-500">Bed not found.</p>;

  function getCell(row, col) {
    return bed.cells?.find((c) => c.row === row && c.col === col);
  }

  function handlePlantSelect(plant) {
    setSelectedPlant((prev) => (prev?._id === plant._id ? null : plant));
  }

  function handleCellClick(row, col) {
    const cell = getCell(row, col);
    if (!selectedPlant) {
      if (cell?.plantId) updateCell.mutate({ row, col, plantId: null });
      return;
    }
    if (cell?.plantId?._id === selectedPlant._id) {
      updateCell.mutate({ row, col, plantId: null });
    } else {
      updateCell.mutate({ row, col, plantId: selectedPlant._id, quantity: selectedPlant.perSqFt ?? 1 });
    }
  }

  const filteredPlants = plants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/beds" className="text-garden-500 hover:text-garden-700 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-garden-900">{bed.name}</h1>
          <p className="text-garden-600 text-sm">
            {bed.rows} × {bed.cols} ft grid · Select a plant, then click cells to plant
          </p>
        </div>
      </div>

      {selectedPlant && (
        <div className="mb-4 px-3 py-2 bg-garden-50 border border-garden-200 rounded-lg text-sm text-garden-700 inline-flex items-center gap-2">
          <span>Stamping: {selectedPlant.emoji} {selectedPlant.name}</span>
          <span className="text-garden-400">· click to change</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:gap-6">
        {/* Left column: grid */}
        <div>
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
                <div className="flex items-center justify-center text-xs text-garden-400 font-medium">
                  {row + 1}
                </div>
                {Array.from({ length: bed.cols }, (_, col) => {
                  const cell = getCell(row, col);
                  const plant = cell?.plantId;
                  return (
                    <button
                      key={col}
                      onClick={() => handleCellClick(row, col)}
                      className={clsx(
                        'w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:scale-105',
                        plant && !selectedPlant
                          ? 'bg-garden-100 border-garden-300 hover:bg-red-50 hover:border-red-300'
                          : plant
                          ? 'bg-garden-100 border-garden-300 hover:border-garden-400'
                          : 'bg-white border-garden-200 hover:border-garden-400 hover:bg-garden-50'
                      )}
                      title={
                        plant && !selectedPlant
                          ? 'Click to remove'
                          : plant
                          ? `${plant.emoji} ${plant.name}`
                          : selectedPlant
                          ? `Plant ${selectedPlant.name} here`
                          : 'Select a plant first'
                      }
                    >
                      {plant ? (
                        <>
                          <span className="text-lg leading-none">{plant.emoji}</span>
                          <span className="text-[9px] text-garden-600 leading-tight text-center mt-0.5 px-0.5 truncate w-full text-center">
                            {(cell.quantity ?? 1) > 1 ? `×${cell.quantity}` : plant.name.split(' ')[0]}
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
              <h2 className="font-semibold text-garden-900 mb-3">What&apos;s planted</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  bed.cells
                    .filter((c) => c.plantId)
                    .reduce((acc, c) => {
                      const key = c.plantId._id;
                      acc[key] = acc[key] || { ...c.plantId, count: 0 };
                      acc[key].count += (c.quantity ?? 1);
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

          {updateCell.isError && (
            <p className="mt-4 text-sm text-red-600">Failed to update cell. Please try again.</p>
          )}
        </div>

        {/* Right column: plant panel */}
        <aside className="mt-6 lg:mt-0 lg:w-72 flex-shrink-0">
          <div className="card p-4 flex flex-col lg:max-h-[calc(100vh-12rem)]">
            {/* Search */}
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-garden-400" />
              <input
                className="input pl-8 text-sm w-full"
                placeholder="Search plants…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Plant list */}
            <div className="overflow-y-auto flex-1">
              {filteredPlants.length === 0 ? (
                <p className="text-center text-garden-500 text-sm py-6">No plants found</p>
              ) : (
                <div className="space-y-1">
                  {filteredPlants.map((plant) => (
                    <button
                      key={plant._id}
                      onClick={() => handlePlantSelect(plant)}
                      className={clsx(
                        'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        plant._id === selectedPlant?._id
                          ? 'bg-garden-100 ring-2 ring-garden-400'
                          : 'hover:bg-garden-50'
                      )}
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

            {/* Clear bed */}
            <div className="mt-3 pt-3 border-t border-garden-100">
              <button
                onClick={() => clearBed.mutate()}
                disabled={clearBed.isPending}
                className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {clearBed.isPending ? 'Clearing…' : 'Clear bed'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
