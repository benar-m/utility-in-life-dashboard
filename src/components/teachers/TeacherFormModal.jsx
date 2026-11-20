import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";
import SubjectPicker from "../common/SubjectPicker.jsx";

const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  subjects: [],
};

export default function TeacherFormModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setForm(initialForm);
    setError("");
    setInvitationUrl("");
    setIsCopied(false);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const subjectNames = form.subjects;
    if (subjectNames.length === 0) {
      setError("Add at least one subject.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const invitation = await apiRequest("users/invitations/", {
        method: "POST",
        body: {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          role: "TEACHER",
          subject_names: subjectNames,
        },
      });
      setInvitationUrl(invitation.acceptance_url);
      onCreated();
    } catch (requestError) {
      setError(requestError.message || "Could not invite the teacher.");
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
      isOpen={isOpen}
      onClose={handleClose}
      title={invitationUrl ? "Teacher invited" : "Invite a teacher"}
      description={
        invitationUrl
          ? "Share the link securely. It is shown once and expires after 48 hours."
          : "Record their details and subjects. The teacher will choose their own password."
      }
      size="lg"
    >
      {invitationUrl ? (
        <div>
          <div className="space-y-4 px-6 py-5">
            {error && <InlineAlert>{error}</InlineAlert>}
            <InlineAlert tone="success">
              The invitation was created and the teacher now appears as invited.
            </InlineAlert>
            <FormField
              label="Invitation link"
              htmlFor="teacher-invitation-link"
              hint="For local development, this link is also written to the Django console email output."
            >
              <div className="flex gap-2">
                <input
                  id="teacher-invitation-link"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="teacher-name" required>
              <input
                id="teacher-name"
                required
                value={form.full_name}
                onChange={update("full_name")}
                className={inputClassName}
              />
            </FormField>
            <FormField label="Email" htmlFor="teacher-email" required>
              <input
                id="teacher-email"
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                className={inputClassName}
              />
            </FormField>
            <FormField label="Phone" htmlFor="teacher-phone">
              <input
                id="teacher-phone"
                type="tel"
                value={form.phone}
                onChange={update("phone")}
                placeholder="+254…"
                className={inputClassName}
              />
            </FormField>
          </div>
          <FormField label="Subjects" htmlFor="teacher-subjects" required hint="Pick every subject they teach.">
            <SubjectPicker
              id="teacher-subjects"
              multiple
              value={form.subjects}
              onChange={(subjects) => setForm((current) => ({ ...current, subjects }))}
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
            Send invitation
          </button>
        </footer>
        </form>
      )}
    </Modal>
  );
}
