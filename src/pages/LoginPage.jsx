import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sprout, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLES, roleDisplayNames } from "../config/navigation.js";
import { isValidEmail } from "../utils/validators.js";

/**
  DEMO LOGIN ONLY.
  Email and password are both required and validated in the UI, but
  there is no backend yet to actually verify the password against 
  see the comment on AuthContext.signIn for how to wire this up to a
  real POST /auth/login endpoint. The password itself is never stored
  anywhere, including in this component's own state, beyond the submit
  handler below.
 */
export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from?.pathname ?? "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [role, setRole] = useState(ROLES.ADMIN);
  const [formErrors, setFormErrors] = useState({});

  const validate = () => {
    const nextErrors = {};
    if (!fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!password) nextErrors.password = "Password is required.";
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    signIn({ fullName: fullName.trim(), email: email.trim(), role });
    navigate(redirectPath, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Sprout size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">UTILITY IN LIFE</p>
            <p className="text-xs text-slate-500">Empowerment  Ops Platform</p>
          </div>
        </div>

        <h1 className="mb-4 text-lg font-semibold text-slate-900">Sign in</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="e.g. Benard Mulwa"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-400 ${
                formErrors.fullName ? "border-red-400" : "border-slate-200"
              }`}
              aria-invalid={Boolean(formErrors.fullName)}
              aria-describedby={formErrors.fullName ? "fullName-error" : undefined}
            />
            {formErrors.fullName && (
              <p id="fullName-error" className="mt-1 text-xs text-red-600">
                {formErrors.fullName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-400 ${
                formErrors.email ? "border-red-400" : "border-slate-200"
              }`}
              aria-invalid={Boolean(formErrors.email)}
              aria-describedby={formErrors.email ? "email-error" : undefined}
            />
            {formErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-600">
                {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:border-brand-400 ${
                  formErrors.password ? "border-red-400" : "border-slate-200"
                }`}
                aria-invalid={Boolean(formErrors.password)}
                aria-describedby={formErrors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              >
                {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {formErrors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-600">
                {formErrors.password}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
              Sign in as
            </label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400"
            >
              {Object.values(ROLES).map((roleValue) => (
                <option key={roleValue} value={roleValue}>
                  {roleDisplayNames[roleValue]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
            Register
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-slate-400">
          Demo sign-in — no account database yet, so any email/password combination works.
        </p>
      </div>
    </div>
  );
}
