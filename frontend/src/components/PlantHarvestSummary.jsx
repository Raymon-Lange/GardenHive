function ozToLbs(oz) {
  return Math.round((oz / 16) * 10) / 10;
}

export default function PlantHarvestSummary({ data = [], year, hoveredPlant = null }) {
  if (data.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-garden-100">
        <h2 className="font-semibold text-garden-900">Harvest summary by plant</h2>
        {year && <p className="text-xs text-garden-500 mt-0.5">{year}</p>}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-garden-50 border-b border-garden-100">
            <th className="text-left px-5 py-3 font-medium text-garden-600">Plant</th>
            <th className="text-right px-5 py-3 font-medium text-garden-600">Total weight</th>
            <th className="text-right px-5 py-3 font-medium text-garden-600">Harvests</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => {
            const highlighted = hoveredPlant === p.name;
            return (
              <tr key={p.name} className={`border-b border-garden-50 transition-colors ${highlighted ? 'bg-garden-100' : 'hover:bg-garden-50'}`}>
                <td className={`px-5 py-3 font-medium ${highlighted ? 'text-garden-900' : 'text-garden-900'}`}>{p.name}</td>
                <td className={`px-5 py-3 text-right ${highlighted ? 'font-semibold text-garden-900' : 'text-garden-700'}`}>{ozToLbs(p.oz)} lbs</td>
                <td className={`px-5 py-3 text-right ${highlighted ? 'font-semibold text-garden-900' : 'text-garden-500'}`}>{p.count}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-garden-50 border-t border-garden-100">
            <td className="px-5 py-3 font-semibold text-garden-900">Total</td>
            <td className="px-5 py-3 text-right font-semibold text-garden-900">
              {ozToLbs(data.reduce((s, p) => s + p.oz, 0))} lbs
            </td>
            <td className="px-5 py-3 text-right font-semibold text-garden-900">
              {data.reduce((s, p) => s + p.count, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
