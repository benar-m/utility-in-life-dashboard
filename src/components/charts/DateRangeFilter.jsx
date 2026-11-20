export const isoDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function rangeForDays(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { start: isoDate(start), end: isoDate(end), preset: days };
}

export const shortDate = (value, long = false) =>
  new Intl.DateTimeFormat("en-KE", long ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" }).format(
    new Date(`${value}T00:00:00`)
  );

// Date range first, presets before a custom range; scopes everything below it.
export default function DateRangeFilter({ value, onChange, presets = [7, 30, 90, 365], children }) {
  const labels = { 7: "7 days", 14: "14 days", 30: "30 days", 90: "90 days", 365: "12 months" };
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Date range">
        {presets.map((days) => (
          <button
            key={days}
            type="button"
            aria-pressed={value.preset === days}
            onClick={() => onChange(rangeForDays(days))}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              value.preset === days ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {labels[days] || `${days} days`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <input
          type="date"
          aria-label="From"
          value={value.start}
          max={value.end}
          onChange={(event) => event.target.value && onChange({ ...value, start: event.target.value, preset: null })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
        />
        <span>to</span>
        <input
          type="date"
          aria-label="To"
          value={value.end}
          min={value.start}
          onChange={(event) => event.target.value && onChange({ ...value, end: event.target.value, preset: null })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
        />
      </div>
      {children}
    </div>
  );
}
