import { ArrowRight, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { dashboardPathForRole } from "../config/navigation.js";

export default function UnauthorizedPage() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <ShieldAlert className="mx-auto text-amber-500" size={36} />
        <h1 className="mt-4 text-xl font-semibold text-slate-900">You cannot access this area</h1>
        <p className="mt-2 text-sm text-slate-500">
          {currentUser?.full_name || "This account"} is signed in, but this page belongs to a different role.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(dashboardPathForRole(currentUser?.role), { replace: true })}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Go to my portal
            <ArrowRight size={15} />
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
