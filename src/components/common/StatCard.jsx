/**
 * Small metric card: label, headline value, and an optional trend note.
 * `tone` maps to a subtle icon background so each stat can be scanned
 * at a glance without competing colors across the row.
 */
const toneStyles = {
  brand: "bg-brand-50 text-brand-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
};

export default function StatCard({ label, value, helperText, icon: Icon, tone = "brand" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
