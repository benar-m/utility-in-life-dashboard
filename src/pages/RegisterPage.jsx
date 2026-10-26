import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLES, roleDisplayNames } from "../config/navigation.js";
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from "../utils/validators.js";

/*
  DEMO REGISTRATION ONLY
  This validates the form shape (required fields, email format, password
  length, password match) but does not create a real account anywhere 
  real POST /auth/register endpoint.
  in the real platform, self-service registration should
  likely be limited to the Parent/Student role (matching the design
  deck's workflow: "Parent registers Admin reviews"). Administrator and
  Teacher accounts are more safely created by an existing admin (an
  invite flow), not opened up to anyone landing on the page. The role
  picker below is left open for demo purposes should be restricted  before
  shipping.
 */
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [role, setRole] = useState(ROLES.PARENT_STUDENT);
  const [formErrors, setFormErrors] = useState({});

  const validate = () => {
    const nextErrors = {};
    if (!fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (!isValidPassword(password)) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    register({ fullName: fullName.trim(), email: email.trim(), role });
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
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

        <h1 className="mb-4 text-lg font-semibold text-slate-900">Create an account</h1>

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
              placeholder="e.g. Amani Otieno"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-400 ${
                formErrors.fullName ? "border-red-400" : "border-slate-200"
              }`}
              aria-invalid={Boolean(formErrors.fullName)}
            />
            {formErrors.fullName && <p className="mt-1 text-xs text-red-600">{formErrors.fullName}</p>}
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
            />
            {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:border-brand-400 ${
                  formErrors.password ? "border-red-400" : "border-slate-200"
                }`}
                aria-invalid={Boolean(formErrors.password)}
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
            {formErrors.password && <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-400 ${
                formErrors.confirmPassword ? "border-red-400" : "border-slate-200"
              }`}
              aria-invalid={Boolean(formErrors.confirmPassword)}
            />
            {formErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{formErrors.confirmPassword}</p>}
          </div>

          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
              I am registering as
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
            Create account
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
