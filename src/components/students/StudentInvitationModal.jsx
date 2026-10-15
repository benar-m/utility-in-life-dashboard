import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function StudentInvitationModal({ student, onClose, onCreated }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setEmail(student?.account_email || "");
    setPhone("");
    setInvitationUrl("");
    setError("");
    setIsCopied(false);
  }, [student]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const invitation = await apiRequest("users/invitations/", {
        method: "POST",
        body: {
          full_name: student.full_name,
          email: email.trim(),
          phone: phone.trim(),
          role: "STUDENT",
          student_id: student.id,
        },
      });
      setInvitationUrl(invitation.acceptance_url);
      onCreated();
    } catch (requestError) {
      setError(requestError.message || "Could not create the student invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInvitation = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setError("");
      setIsCopied(true);
    } catch {
      setError("Could not copy the link. Select it below and copy it manually.");
    }
  };

  return (
    <Modal
      isOpen={Boolean(student)}
      onClose={handleClose}
      title={invitationUrl ? "Student invited" : "Invite student to the portal"}
      description={
        invitationUrl
          ? "Share this one-time link securely. It expires after 48 hours."
          : `Create a login tied specifically to ${student?.full_name || "this student"}.`
      }
    >
      {invitationUrl ? (
        <div>
          <div className="space-y-4 px-6 py-5">
            {error && <InlineAlert>{error}</InlineAlert>}
            <InlineAlert tone="success">
              The inactive login is linked to this student record and is ready for activation.
            </InlineAlert>
            <FormField label="Invitation link" htmlFor="student-invitation-link">
              <div className="flex gap-2">
                <input
                  id="student-invitation-link"
                  readOnly
                  value={invitationUrl}
                  onFocus={(event) => event.target.select()}
                  className={inputClassName}
                />
                <button
                  type="button"
                  onClick={copyInvitation}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  {isCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </FormField>
          </div>
          <footer className="flex justify-end border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Done
            </button>
          </footer>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            {error && <InlineAlert>{error}</InlineAlert>}
            <InlineAlert tone="success">
              Campaign enrollment or an admin-created student record does not automatically create login access. This invitation does.
            </InlineAlert>
            <FormField
              label="Student login email"
              htmlFor="student-login-email"
              required
              hint="This must be unique and cannot be the email of an existing guardian account."
            >
              <input
                id="student-login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
              />
            </FormField>
            <FormField label="Student phone" htmlFor="student-login-phone">
              <input
                id="student-login-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={inputClassName}
              />
            </FormField>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Create invitation
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
