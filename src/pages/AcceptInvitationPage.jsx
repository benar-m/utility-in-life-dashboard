import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import ShuleniLogo from "../components/common/ShuleniLogo.jsx";
import { API_BASE_URL, acceptInvitation } from "../api/client.js";
import FormField, { inputClassName } from "../components/common/FormField.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";

export default function AcceptInvitationPage() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [linkState, setLinkState] = useState("checking");

  // Ask the server first, so a used or expired link says so instead of showing the form.
  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/invitations/${encodeURIComponent(token)}/accept/`, { credentials: "include" })
      .then((response) => response.json().then((body) => setLinkState(response.ok ? "pending" : body.status || "invalid")))
      .catch(() => setLinkState("pending"));
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await acceptInvitation(token, password, confirmation);
      setIsAccepted(true);
    } catch (requestError) {
      setError(requestError.message || "Could not accept this invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-shuleni-turquoise via-[#7FE8E0] to-shuleni-aqua px-4 py-10">
      <ShuleniLogo className="mb-6" tone="navy" />
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-shuleni-navy/10">

        {!isAccepted && linkState !== "pending" && linkState !== "checking" ? (
          <div className="text-center">
            <h1 className="font-display text-xl font-extrabold text-shuleni-navy">
              {linkState === "accepted" ? "This invitation was already used" : linkState === "expired" ? "This invitation link has expired" : "This invitation link isn't valid"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {linkState === "accepted"
                ? "Your account is already set up. Sign in with your email and password."
                : "It may have been replaced by a newer invitation. Ask the school office to send you a new one."}
            </p>
            <Link to="/login" className="mt-6 inline-flex w-full justify-center rounded-full bg-shuleni-red px-4 py-2.5 text-sm font-bold text-white hover:bg-[#cf3330]">
              Go to sign in
            </Link>
          </div>
        ) : isAccepted ? (
          <div className="text-center">
            <CheckCircle2 size={44} className="mx-auto text-brand-500" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Your account is ready</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your password has been set. Sign in with the email address that received the invitation.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Continue to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-900">Set your password</h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose a secure password to activate your account. This link can only be used once.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && <InlineAlert>{error}</InlineAlert>}
              <FormField
                label="Password"
                htmlFor="invitation-password"
                required
                hint="Use at least 8 characters and avoid common passwords."
              >
                <input
                  id="invitation-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Confirm password" htmlFor="invitation-password-confirm" required>
                <input
                  id="invitation-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmation}
                  onChange={(event) => {
                    setConfirmation(event.target.value);
                    setError("");
                  }}
                  className={inputClassName}
                />
              </FormField>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? "Activating account…" : "Activate account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
