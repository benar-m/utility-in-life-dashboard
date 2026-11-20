import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import ShuleniLogo from "../common/ShuleniLogo.jsx";
import { dashboardPathForRole } from "../../config/navigation.js";
import { useAuth } from "../../context/AuthContext.jsx";

const NAV_LINKS = [
  ["#classes", "Classes"],
  ["#ways-to-learn", "One-on-one"],
  ["#how-it-works", "How it works"],
  ["#resources", "Resources"],
];

export default function Header() {
  const { currentUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const account = currentUser
    ? { to: dashboardPathForRole(currentUser.role), label: "My dashboard" }
    : { to: "/login", label: "Sign in" };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-8 px-4 py-3 sm:px-6 lg:px-10">
        <Link to="/" aria-label="Shuleni Online home">
          <ShuleniLogo />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-10 text-[15px] font-semibold text-shuleni-ink lg:flex" aria-label="Main">
          {NAV_LINKS.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-shuleni-teal">
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-5 lg:ml-0 lg:flex">
          <Link to={account.to} className="text-sm font-semibold text-shuleni-navy hover:text-shuleni-teal">
            {account.label}
          </Link>
          <Link to="/register" className="rounded-full bg-shuleni-red px-5 py-2.5 text-sm font-bold text-white hover:bg-[#cf3330]">
            Enroll today
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="ml-auto rounded-lg p-2 text-shuleni-navy lg:hidden"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <nav className="border-t border-slate-100 px-4 pb-4 sm:px-6 lg:hidden" aria-label="Mobile">
          {NAV_LINKS.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setIsMenuOpen(false)} className="block py-3 text-sm font-semibold text-shuleni-ink">
              {label}
            </a>
          ))}
          <div className="mt-2 flex gap-3">
            <Link to={account.to} className="flex-1 rounded-full border-2 border-shuleni-navy py-2.5 text-center text-sm font-bold text-shuleni-navy">
              {account.label}
            </Link>
            <Link to="/register" className="flex-1 rounded-full bg-shuleni-red py-2.5 text-center text-sm font-bold text-white">
              Enroll today
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
