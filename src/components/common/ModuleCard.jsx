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
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-shuleni-turquoise hover:shadow-lg hover:shadow-shuleni-navy/10"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-shuleni-aqua text-shuleni-teal">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block font-display text-[15px] font-bold text-shuleni-navy">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <ChevronRight
        size={18}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-shuleni-red"
        aria-hidden="true"
      />
    </Link>
  );
}
