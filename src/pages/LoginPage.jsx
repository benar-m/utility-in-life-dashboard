import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import ShuleniLogo from "../components/common/ShuleniLogo.jsx";
import { dashboardPathForRole } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = location.state?.from?.pathname;
  const requestedSearch = location.state?.from?.search || "";
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
      navigate(requestedPath ? `${requestedPath}${requestedSearch}` : dashboardPathForRole(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-shuleni-turquoise via-[#7FE8E0] to-shuleni-aqua px-4 py-10">
      <Link to="/" aria-label="Shuleni Online home" className="mb-6">
        <ShuleniLogo tone="navy" />
      </Link>
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-xl shadow-shuleni-navy/10">
        <h1 className="font-display text-2xl font-extrabold text-shuleni-navy">Welcome back</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Sign in to your Shuleni Online account.</p>

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
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-400"
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-400"
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
            className="flex w-full items-center justify-center gap-2 rounded-full bg-shuleni-red px-4 py-3 text-sm font-bold text-white hover:bg-[#cf3330] disabled:opacity-60"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Need a student account? <Link to="/signup" state={location.state} className="font-semibold text-brand-700 hover:text-brand-800">Create one</Link>
        </p>
        <Link to="/" className="mt-4 block text-center text-xs font-semibold text-slate-400 hover:text-slate-600">Back to home</Link>
      </div>
    </div>
  );
}
