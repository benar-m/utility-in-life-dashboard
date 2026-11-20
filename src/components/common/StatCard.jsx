/**
 * Small metric card: label, headline value, and an optional trend note.
 * `tone` maps to a subtle icon background so each stat can be scanned
 * at a glance without competing colors across the row.
 */
const toneStyles = {
  brand: "bg-shuleni-aqua text-shuleni-teal",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
};

export default function StatCard({ label, value, helperText, icon: Icon, tone = "brand" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[tone]}`}>
            <Icon size={19} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold text-shuleni-navy">{value}</p>
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
