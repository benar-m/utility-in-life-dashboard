import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import ShuleniLogo from "../components/common/ShuleniLogo.jsx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const initialForm = {
  first_name: "",
  last_name: "",
  grade_level: "",
  email: "",
  phone: "",
  password: "",
  password_confirmation: "",
};

export default function StudentRegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestedPath = location.state?.from?.pathname;
  const requestedSearch = location.state?.from?.search || "";

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await signUp({ ...form, email: form.email.trim(), phone: form.phone.trim() });
      navigate(requestedPath ? `${requestedPath}${requestedSearch}` : "/student", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Could not create your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-shuleni-turquoise via-[#7FE8E0] to-shuleni-aqua px-4 py-10">
      <Link to="/" aria-label="Shuleni Online home" className="mb-6">
        <ShuleniLogo tone="navy" />
      </Link>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl shadow-shuleni-navy/10 sm:p-8">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-shuleni-teal">Start learning</p><h1 className="mt-2 font-display text-2xl font-extrabold text-shuleni-navy">Create your account</h1><p className="mt-2 text-sm leading-6 text-slate-500">Save your learning options and view resources from one student profile.</p></div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="First name" id="first_name"><input id="first_name" required value={form.first_name} onChange={update("first_name")} className={inputClass} /></Field><Field label="Last name" id="last_name"><input id="last_name" required value={form.last_name} onChange={update("last_name")} className={inputClass} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Grade or level" id="grade_level"><input id="grade_level" required placeholder="Form 3" value={form.grade_level} onChange={update("grade_level")} className={inputClass} /></Field><Field label="Phone (optional)" id="phone"><input id="phone" type="tel" value={form.phone} onChange={update("phone")} className={inputClass} /></Field></div>
          <Field label="Email address" id="email"><input id="email" type="email" autoComplete="email" required value={form.email} onChange={update("email")} className={inputClass} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Password" id="password"><input id="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={update("password")} className={inputClass} /></Field><Field label="Confirm password" id="password_confirmation"><input id="password_confirmation" type="password" autoComplete="new-password" minLength={8} required value={form.password_confirmation} onChange={update("password_confirmation")} className={inputClass} /></Field></div>
          {error && <div className="flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-full bg-shuleni-red px-4 py-3 text-sm font-bold text-white hover:bg-[#cf3330] disabled:opacity-60">{isSubmitting && <Loader2 size={16} className="animate-spin" />}{isSubmitting ? "Creating account…" : "Create student account"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link to="/login" state={location.state} className="font-bold text-brand-700 hover:text-brand-800">Sign in</Link></p>
        <Link to="/" className="mt-4 block text-center text-xs font-semibold text-slate-400 hover:text-slate-600">Back to home</Link>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-400";

function Field({ label, id, children }) {
  return <label htmlFor={id} className="block text-sm font-medium text-slate-700"><span className="mb-1 block">{label}</span>{children}</label>;
}
