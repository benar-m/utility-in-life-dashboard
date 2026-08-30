import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Grid tile linking to one dashboard module. Kept data-driven (see
 * config/navigation.js) so the dashboard home and the sidebar can
 * never list different modules.
 */
export default function ModuleCard({ path, label, description, icon: Icon }) {
  return (
    <Link
      to={path}
      className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <ChevronRight
        size={18}
        className="mt-1 shrink-0 text-slate-300 transition group-hover:text-brand-500"
        aria-hidden="true"
      />
    </Link>
  );
}
