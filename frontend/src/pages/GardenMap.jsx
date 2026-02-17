import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const CELL_PX = 28; // pixels per sq ft

// Earthy colours per bed (cycles if more than 10)
const BED_COLORS = [
  { bg: 'bg-garden-200', border: 'border-garden-400', text: 'text-garden-800', hover: 'hover:bg-garden-300' },
  { bg: 'bg-harvest-200', border: 'border-harvest-400', text: 'text-harvest-800', hover: 'hover:bg-harvest-300' },
  { bg: 'bg-soil-200',    border: 'border-soil-400',    text: 'text-soil-800',   hover: 'hover:bg-soil-300'    },
  { bg: 'bg-green-200',   border: 'border-green-400',   text: 'text-green-800',  hover: 'hover:bg-green-300'   },
  { bg: 'bg-lime-200',    border: 'border-lime-400',    text: 'text-lime-800',   hover: 'hover:bg-lime-300'    },
  { bg: 'bg-amber-200',   border: 'border-amber-400',   text: 'text-amber-800',  hover: 'hover:bg-amber-300'   },
  { bg: 'bg-teal-200',    border: 'border-teal-400',    text: 'text-teal-800',   hover: 'hover:bg-teal-300'    },
  { bg: 'bg-emerald-200', border: 'border-emerald-400', text: 'text-emerald-800',hover: 'hover:bg-emerald-300' },
  { bg: 'bg-yellow-200',  border: 'border-yellow-400',  text: 'text-yellow-800', hover: 'hover:bg-yellow-300'  },
  { bg: 'bg-orange-200',  border: 'border-orange-400',  text: 'text-orange-800', hover: 'hover:bg-orange-300'  },
];

function useBeds() {
  return useQuery({
    queryKey: ['beds'],
    queryFn: () => api.get('/beds').then((r) => r.data),
  });
}

export default function GardenMap() {
  const { data: beds = [], isLoading } = useBeds();
  const navigate = useNavigate();

  const mappedBeds = beds.filter(
    (b) => b.mapRow != null && b.mapCol != null
  );

  if (isLoading) return <p className="text-garden-500">Loading…</p>;

  if (mappedBeds.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-garden-900 mb-2">Garden Map</h1>
        <p className="text-garden-500">No beds with map positions found.</p>
      </div>
    );
  }

  // Compute overall grid dimensions from bed positions
  const totalRows = Math.max(...mappedBeds.map((b) => b.mapRow + b.rows));
  const totalCols = Math.max(...mappedBeds.map((b) => b.mapCol + b.cols));

  const gridWidth  = totalCols * CELL_PX;
  const gridHeight = totalRows * CELL_PX;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-garden-900">Garden Map</h1>
        <p className="text-garden-600 text-sm mt-0.5">
          {totalCols} × {totalRows} ft · {mappedBeds.length} beds · click a bed to open it
        </p>
      </div>

      {/* Scale ruler hint */}
      <div className="flex items-center gap-2 mb-4 text-xs text-garden-500">
        <span
          className="inline-block bg-garden-300 rounded"
          style={{ width: CELL_PX, height: 6 }}
        />
        <span>= 1 sq ft</span>
      </div>

      {/* Map */}
      <div className="card p-4 overflow-auto">
        <div
          className="relative"
          style={{ width: gridWidth, height: gridHeight }}
        >
          {/* Background grid dots */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={gridWidth}
            height={gridHeight}
          >
            {Array.from({ length: totalRows + 1 }, (_, r) =>
              Array.from({ length: totalCols + 1 }, (_, c) => (
                <circle
                  key={`${r}-${c}`}
                  cx={c * CELL_PX}
                  cy={r * CELL_PX}
                  r={1.5}
                  fill="#d1c4b0"
                  opacity={0.5}
                />
              ))
            )}
          </svg>

          {/* Beds */}
          {mappedBeds.map((bed, idx) => {
            const colors = BED_COLORS[idx % BED_COLORS.length];
            const plantedCount = bed.cells?.filter((c) => c.plantId).length ?? 0;
            const totalCells = bed.rows * bed.cols;

            return (
              <button
                key={bed._id}
                onClick={() => navigate(`/beds/${bed._id}`)}
                className={`absolute rounded border-2 flex flex-col items-center justify-center
                  transition-all ${colors.bg} ${colors.border} ${colors.hover} shadow-sm
                  group overflow-hidden`}
                style={{
                  left:   bed.mapCol * CELL_PX,
                  top:    bed.mapRow * CELL_PX,
                  width:  bed.cols   * CELL_PX,
                  height: bed.rows   * CELL_PX,
                }}
                title={`${bed.name} — ${bed.rows}×${bed.cols} ft`}
              >
                {/* Plant emoji grid (small preview) */}
                {bed.rows >= 2 && bed.cols >= 2 && (
                  <div
                    className="absolute inset-0 grid opacity-40"
                    style={{
                      gridTemplateColumns: `repeat(${bed.cols}, ${CELL_PX}px)`,
                      gridTemplateRows: `repeat(${bed.rows}, ${CELL_PX}px)`,
                    }}
                  >
                    {Array.from({ length: bed.rows * bed.cols }, (_, i) => {
                      const row = Math.floor(i / bed.cols);
                      const col = i % bed.cols;
                      const cell = bed.cells?.find((c) => c.row === row && c.col === col);
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-center text-[10px] leading-none"
                        >
                          {cell?.plantId?.emoji || ''}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Label */}
                <div className={`relative z-10 text-center px-1 ${colors.text}`}>
                  <p className="font-semibold leading-tight text-[11px]">
                    {bed.name.split(' — ')[1] || bed.name}
                  </p>
                  <p className="text-[10px] opacity-70 mt-0.5">
                    {bed.rows}×{bed.cols} ft
                  </p>
                  {plantedCount > 0 && (
                    <p className="text-[10px] opacity-70">
                      {plantedCount}/{totalCells} planted
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6">
        <h2 className="font-semibold text-garden-900 mb-3 text-sm">Beds</h2>
        <div className="flex flex-wrap gap-2">
          {mappedBeds.map((bed, idx) => {
            const colors = BED_COLORS[idx % BED_COLORS.length];
            return (
              <button
                key={bed._id}
                onClick={() => navigate(`/beds/${bed._id}`)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium
                  ${colors.bg} ${colors.border} ${colors.text} ${colors.hover} transition-colors`}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-60" />
                {bed.name.split(' — ')[1] || bed.name}
                <span className="opacity-60">
                  {bed.rows * bed.cols} sq ft
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
