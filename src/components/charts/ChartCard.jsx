import { useState } from "react";

// Frame for every chart: title, optional legend, and a Chart / Table switch so no value
// is ever reachable only by hovering.
export function Legend({ items, shape = "line" }) {
  if (!items || items.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={shape === "line" ? "h-0.5 w-3.5 rounded-full" : "h-2.5 w-2.5 rounded-sm"}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export default function ChartCard({ title, subtitle, legend, legendShape, table, children, action, className = "" }) {
  const [view, setView] = useState("chart");
  return (
    <section className={`flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-shuleni-navy">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {table && (
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={`${title} view`}>
              {["chart", "table"].map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${
                    view === option ? "bg-white text-shuleni-navy shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      {legend && view === "chart" && (
        <div className="mt-3">
          <Legend items={legend} shape={legendShape} />
        </div>
      )}
      <div className="mt-4 flex-1">{view === "chart" || !table ? children : <DataTable {...table} />}</div>
    </section>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-slate-100">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.label} className={`px-3 py-2 font-medium ${column.align === "right" ? "text-right" : ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column.label}
                  className={`px-3 py-1.5 text-slate-700 ${column.align === "right" ? "text-right tabular-nums" : ""}`}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
