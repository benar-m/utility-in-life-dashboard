import { Menu, Search, Bell } from "lucide-react";

/**
 * Top bar shown above the page content. Owns the mobile sidebar toggle
 * so Sidebar itself stays presentation-only.
 */
export default function Topbar({ onToggleSidebar }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Toggle navigation menu"
      >
        <Menu size={20} />
      </button>

      <label className="relative hidden flex-1 max-w-md sm:block">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <span className="sr-only">Search</span>
        <input
          type="search"
          placeholder="Search students, teachers, classes…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white"
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100"
          aria-label="View notifications"
        >
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
        </button>
      </div>
    </header>
  );
}
