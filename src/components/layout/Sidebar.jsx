import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import ShuleniLogo from "../common/ShuleniLogo.jsx";
import { navigationForRole } from "../../config/navigation.js";
import { useAuth } from "../../context/AuthContext.jsx";

  //collapsible left sidebar: brand mark, primary navigation,and a signed-in-user footer with sign out.
 
export default function Sidebar({ isOpen, onNavigate }) {
  const { currentUser, signOut } = useAuth();
  const navigationItems = navigationForRole(currentUser?.role);

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-shuleni-ink
        transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      aria-label="Primary navigation"
    >
      <div className="border-b border-white/10 px-5 py-5">
        <ShuleniLogo tone="light" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  onClick={onNavigate}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-white/10 text-white shadow-[inset_3px_0_0_theme(colors.shuleni.turquoise)]"
                        : "text-white/65 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <ItemIcon size={18} className="text-shuleni-turquoise" aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-shuleni-turquoise text-sm font-bold text-shuleni-ink">
            {getInitials(currentUser?.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {currentUser?.full_name ?? "Guest user"}
            </p>
            <p className="truncate text-xs capitalize text-white/60">
              {formatRole(currentUser?.role)}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
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

function formatRole(role) {
  if (!role) return "Not signed in";
  return role.toLowerCase().replaceAll("_", " ");
}
