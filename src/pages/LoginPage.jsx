import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

/**
  for demo
  no password verification
  on for a dashboard has  to route something around during development.
  will replace (handleSubmit) with a real call to your authentication API.

 */
export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from?.pathname ?? "/";

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("admin");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!fullName.trim()) return;
    signIn({ fullName: fullName.trim(), role });
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
            <p className="text-sm font-semibold text-slate-900">Utility in Life</p>
            <p className="text-xs text-slate-500">Empowerment · Ops Platform</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="e.g. Edwin sifuna the 6th"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400"
            />
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
              <option value="admin">Administrator</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent/Student</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Continue
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          for demonstration only password not yet.
        </p>
      </div>
    </div>
  );
}
