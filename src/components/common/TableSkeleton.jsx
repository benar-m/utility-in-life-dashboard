/**
 * Static skeleton rows for table-shaped placeholders. Purely decorative —
 * swap this out for real rows once a module's data source is connected.
 */
export default function TableSkeleton({ columnLabels, rowCount = 5 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columnLabels.map((columnLabel) => (
              <th key={columnLabel} className="px-4 py-3 font-medium">
                {columnLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {columnLabels.map((columnLabel) => (
                <td key={columnLabel} className="px-4 py-3">
                  <div className="h-3 w-full max-w-[10rem] animate-pulse rounded bg-slate-100" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
