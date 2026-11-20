import { BookOpenCheck, ClipboardCheck, ClipboardList, FileText, UserRoundCheck, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

const TYPES = {
  registration: { icon: ClipboardList, tone: "bg-amber-50 text-amber-700" },
  application: { icon: UserRoundCheck, tone: "bg-blue-50 text-blue-700" },
  payment: { icon: Wallet, tone: "bg-emerald-50 text-emerald-700" },
  enrollment: { icon: BookOpenCheck, tone: "bg-shuleni-aqua text-shuleni-teal" },
  resource_request: { icon: FileText, tone: "bg-violet-50 text-violet-700" },
  attendance: { icon: ClipboardCheck, tone: "bg-slate-100 text-slate-600" },
};

export function timeAgo(value) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} d ago`;
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" }).format(new Date(value));
}

export default function ActivityList({ events, highlightAfter, onNavigate, compact = false }) {
  if (!events.length) return <p className="py-6 text-center text-sm text-slate-400">Nothing has happened yet.</p>;
  return (
    <ol className="relative">
      {events.map((event, index) => {
        const { icon: Icon, tone } = TYPES[event.type] || TYPES.attendance;
        const isNew = highlightAfter !== undefined && (!highlightAfter || event.at > highlightAfter);
        return (
          <li key={`${event.type}-${event.at}-${index}`} className="relative flex gap-3 py-2.5">
            {!compact && index < events.length - 1 && <span aria-hidden="true" className="absolute left-4 top-11 h-[calc(100%-2rem)] w-px bg-slate-200" />}
            <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={15} /></span>
            <Link to={event.link} onClick={onNavigate} className="group min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-900 group-hover:underline">
                <span className="truncate">{event.title}</span>
                {isNew && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-shuleni-red" aria-label="new" />}
              </p>
              <p className="truncate text-xs text-slate-500">{event.detail}</p>
            </Link>
            <time dateTime={event.at} className="shrink-0 pt-0.5 text-xs text-slate-400">{timeAgo(event.at)}</time>
          </li>
        );
      })}
    </ol>
  );
}
