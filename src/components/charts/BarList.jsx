import useChartFrame from "./useChartFrame.js";
import { PRIMARY } from "./palette.js";

/**
 * Ranked horizontal bars: name on the left, bar, value at the tip.
 * rows: [{ label, value, href? }]; max defaults to the largest value (100 for percentages).
 */
export default function BarList({ rows, color = PRIMARY, format = String, max, emptyLabel = "Nothing to show yet", renderLabel }) {
  const { ref, isRevealed, reduceMotion } = useChartFrame();
  const top = max ?? Math.max(...rows.map((row) => row.value || 0), 0);

  if (rows.length === 0) return <p className="py-8 text-center text-sm text-slate-400">{emptyLabel}</p>;

  return (
    <ul ref={ref} className="space-y-3">
      {rows.map((row, index) => {
        const share = top ? Math.max(((row.value || 0) / top) * 100, row.value ? 1.5 : 0) : 0;
        return (
          <li key={row.label} className="group">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{renderLabel ? renderLabel(row) : row.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">{row.value === null ? "—" : format(row.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full group-hover:brightness-110"
                style={{
                  width: isRevealed ? `${share}%` : "0%",
                  background: row.color || color,
                  transition: reduceMotion ? "none" : `width .8s cubic-bezier(.22,1,.36,1) ${index * 60}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
