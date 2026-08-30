import { NavLink } from "react-router-dom";
import { LogOut, Sprout } from "lucide-react";
import {
  getModulesForRole,
  getLabelForRole,
  roleDisplayNames,
} from "../../config/navigation.js";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * Classic collapsible left sidebar: brand mark, primary navigation
 * (filtered to the current user's role), and a signed-in-user footer.
 */
export default function Sidebar({ isOpen, onNavigate }) {
  const { currentUser, signOut } = useAuth();
  const visibleModules = currentUser ? getModulesForRole(currentUser.role) : [];

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200
        bg-white transition-transform duration-200 lg:static lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
          <Sprout size={20} aria-hidden="true" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">Utility in Life</p>
          <p className="text-xs text-slate-500">Empowerment · Ops Platform</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleModules.map((module) => {
            const ModuleIcon = module.icon;
            return (
              <li key={module.id}>
                <NavLink
                  to={module.path}
                  onClick={onNavigate}
                  end={module.path === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  <ModuleIcon size={18} aria-hidden="true" />
                  {getLabelForRole(module, currentUser?.role)}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {getInitials(currentUser?.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {currentUser?.fullName ?? "Guest user"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {currentUser ? roleDisplayNames[currentUser.role] : "Not signed in"}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function getInitials(fullName) {
  if (!fullName) return "?";
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0]?.toUpperCase())
    .join("");
}
