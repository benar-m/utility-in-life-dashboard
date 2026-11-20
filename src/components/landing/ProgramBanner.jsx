import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import useSiteInfo, { formatProgramDates, formatProgramEnd } from "../../hooks/useSiteInfo.js";

// Shows the current program from the backend; hidden when there is none.
export default function ProgramBanner() {
  const { program } = useSiteInfo();
  if (!program) return null;

  return (
    <div className="flex items-center justify-center gap-x-2 bg-shuleni-navy px-4 py-2.5 text-xs text-white sm:text-sm">
      <span className="min-w-0 truncate font-semibold text-shuleni-yellow">{program.title}</span>
      <span className="shrink-0 text-white/40">|</span>
      {/* Short on phones so the banner stays one line; the date never truncates. */}
      <span className="shrink-0 sm:hidden">Until {formatProgramEnd(program).replace(/^\w+,\s*/, "")}</span>
      <span className="hidden shrink-0 sm:inline">
        {program.status === "running" ? `Now running until ${formatProgramEnd(program)}. Join anytime.` : formatProgramDates(program)}
      </span>
      <Link to="/register" className="ml-1 inline-flex shrink-0 items-center gap-1 font-semibold underline underline-offset-2 hover:text-shuleni-yellow">
        <span className="sm:hidden">Register</span>
        <span className="hidden sm:inline">Register now</span>
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
