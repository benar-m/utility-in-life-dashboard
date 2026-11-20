import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import useSiteInfo, { formatProgramDates, formatProgramEnd } from "../../hooks/useSiteInfo.js";

// Shows the current program from the backend; hidden when there is none.
export default function ProgramBanner() {
  const { program } = useSiteInfo();
  if (!program) return null;

  return (
    <div className="bg-shuleni-navy px-4 py-2.5 text-center text-sm text-white">
      <span className="font-semibold text-shuleni-yellow">{program.title}</span>
      <span className="mx-2 hidden text-white/40 sm:inline">|</span>
      <span className="block sm:inline">
        {program.status === "running" ? `Now running until ${formatProgramEnd(program)}. Join anytime.` : formatProgramDates(program)}
      </span>
      <Link to="/register" className="ml-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-shuleni-yellow">
        Register now <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
