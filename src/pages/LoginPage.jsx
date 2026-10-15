import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, Sprout } from "lucide-react";
import { dashboardPathForRole } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = location.state?.from?.pathname;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const user = await signIn({ email: email.trim(), password });
      navigate(requestedPath || dashboardPathForRole(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Sprout size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Utility in Life</p>
            <p className="text-xs text-slate-500">Empowerment · Ops Platform</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@example.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400"
            />
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Use the owner account created from the backend.
        </p>
      </div>
    </div>
  );
}
