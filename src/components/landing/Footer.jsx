import { Phone } from "lucide-react";
import { Link } from "react-router-dom";
import ShuleniLogo from "../common/ShuleniLogo.jsx";
import useSiteInfo from "../../hooks/useSiteInfo.js";
import { container } from "./format.js";

const COLUMNS = [
  {
    title: "Learn",
    links: [
      { href: "#classes", label: "Group classes" },
      { to: "/register?mode=ONLINE_INDIVIDUAL", label: "One-on-one online" },
      { to: "/register?mode=FACE_TO_FACE_INDIVIDUAL", label: "Home tuition" },
      { href: "#resources", label: "Past papers & notes" },
    ],
  },
  {
    title: "Get started",
    links: [
      { to: "/register", label: "Register for tuition" },
      { to: "/signup", label: "Create a student account" },
      { to: "/login", label: "Sign in" },
    ],
  },
];

const linkClass = "text-white/70 transition hover:text-white";

export default function Footer() {
  const { contactPhone, contactPhoneIntl } = useSiteInfo();

  return (
    <footer className="bg-shuleni-ink text-white">
      <div className={`${container} grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]`}>
        <div>
          <ShuleniLogo tone="light" />
          <p className="mt-5 max-w-xs leading-relaxed text-white/70">
            Home-based and online tuition for CBC, 8-4-4 and IGCSE students across Kenya.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-turquoise">{column.title}</h2>
            <ul className="mt-5 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to} className={linkClass}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {contactPhone && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-turquoise">Talk to us</h2>
            <a
              href={`tel:${contactPhoneIntl}`}
              className="mt-5 inline-flex items-center gap-3 font-display text-2xl font-extrabold text-white hover:text-shuleni-yellow"
            >
              <Phone size={22} aria-hidden="true" /> {contactPhone}
            </a>
            <p className="mt-3 text-white/70">Call us for help choosing a class or tutor.</p>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className={`${container} flex flex-col gap-2 py-6 text-sm text-white/50 sm:flex-row sm:justify-between`}>
          <p>© {new Date().getFullYear()} Shuleni Online</p>
          <p className="font-semibold uppercase tracking-wider">Online &amp; in-person programs</p>
        </div>
      </div>
    </footer>
  );
}
