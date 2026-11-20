import { Link } from "react-router-dom";
import { dashboardPathForRole } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function NotFoundPage() {
  const { currentUser } = useAuth();
  const destination = currentUser
    ? { to: dashboardPathForRole(currentUser.role), label: "Back to dashboard" }
    : { to: "/", label: "Back to home" };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-shuleni-navy">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link
        to={destination.to}
        className="mt-6 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
      >
        {destination.label}
      </Link>
    </div>
  );
}
