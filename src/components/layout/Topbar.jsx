import { useEffect, useRef, useState } from "react";
import { Bell, BookOpenCheck, ClipboardList, GraduationCap, Loader2, Menu, Search, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import ShuleniLogo from "../common/ShuleniLogo.jsx";
import ActivityList from "../dashboard/ActivityList.jsx";

const TYPE_ICONS = { student: User, teacher: GraduationCap, class: BookOpenCheck, registration: ClipboardList };
const LAST_SEEN_KEY = "shuleni:notifications-seen";

function readLastSeen() {
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY) || "";
  } catch {
    return "";
  }
}

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    const handle = (event) => {
      if (!ref.current?.contains(event.target)) onClose();
    };
    const escape = (event) => event.key === "Escape" && onClose();
    document.addEventListener("pointerdown", handle);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", handle);
      document.removeEventListener("keydown", escape);
    };
  }, [ref, onClose]);
}

function GlobalSearch() {
  const navigate = useNavigate();
  const box = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [active, setActive] = useState(0);
  useOutsideClose(box, () => setIsOpen(false));

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return undefined;
    }
    setIsLoading(true);
    const timer = window.setTimeout(() => {
      apiRequest(`search/?q=${encodeURIComponent(term)}`)
        .then((data) => {
          setResults(data);
          setActive(0);
        })
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const go = (result) => {
    setIsOpen(false);
    setQuery("");
    navigate(result.link);
  };

  return (
    <div ref={box} className="relative hidden max-w-md flex-1 sm:block">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") setActive((index) => Math.min(index + 1, results.length - 1));
          if (event.key === "ArrowUp") setActive((index) => Math.max(index - 1, 0));
          if (event.key === "Enter" && results[active]) go(results[active]);
        }}
        placeholder="Search students, teachers, classes…"
        aria-label="Search"
        aria-expanded={isOpen && query.trim().length >= 2}
        className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white"
      />
      {isLoading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
      {isOpen && query.trim().length >= 2 && !isLoading && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No matches for “{query.trim()}”.</p>
          ) : (
            <ul role="listbox" className="max-h-96 overflow-auto py-1">
              {results.map((result, index) => {
                const Icon = TYPE_ICONS[result.type] || User;
                return (
                  <li key={`${result.type}-${result.link}-${result.title}`} role="option" aria-selected={index === active}>
                    <button
                      type="button"
                      onPointerEnter={() => setActive(index)}
                      onClick={() => go(result)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${index === active ? "bg-shuleni-aqua/60" : ""}`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon size={16} /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{result.title}</span>
                        <span className="block truncate text-xs capitalize text-slate-500">{result.type} · {result.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const box = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [lastSeen, setLastSeen] = useState(readLastSeen);
  useOutsideClose(box, () => setIsOpen(false));

  useEffect(() => {
    const load = () => apiRequest("dashboard/activity/").then(setEvents).catch(() => {});
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, []);

  // Routine attendance shows in the list but doesn't ring the bell.
  const unread = events.filter((event) => event.type !== "attendance" && (!lastSeen || event.at > lastSeen)).length;

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && events[0]) {
      setLastSeen(events[0].at);
      try {
        window.localStorage.setItem(LAST_SEEN_KEY, events[0].at);
      } catch {
        // Private browsing: unread counts just won't persist.
      }
    }
  };

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} aria-expanded={isOpen}>
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-shuleni-red px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-shuleni-navy">Recent activity</p>
          <div className="max-h-[28rem] overflow-auto px-4 py-2">
            <ActivityList events={events.slice(0, 15)} highlightAfter={lastSeen} onNavigate={() => setIsOpen(false)} compact />
          </div>
        </div>
      )}
    </div>
  );
}

/** Top bar above the page content. Owns the mobile sidebar toggle. */
export default function Topbar({ onToggleSidebar }) {
  const { currentUser } = useAuth();
  const isStaff = ["OWNER", "ADMIN"].includes(currentUser?.role);
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <button type="button" onClick={onToggleSidebar} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Toggle navigation menu">
        <Menu size={20} />
      </button>
      {/* The sidebar (and its logo) is hidden on small screens, so show the brand here. */}
      <ShuleniLogo className="origin-left scale-90 sm:hidden" />
      {isStaff && <GlobalSearch />}
      <div className="ml-auto flex items-center gap-2">{isStaff && <Notifications />}</div>
    </header>
  );
}
