import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function RestrictionModal({ student, onClose, onUpdated }) {
  const [scope, setScope] = useState("CLASS_ACCESS");
  const [reason, setReason] = useState("OVERDUE_PAYMENT");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setScope("CLASS_ACCESS");
    setReason("OVERDUE_PAYMENT");
    setNote("");
    setError("");
  }, [student]);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await apiRequest("payments/restrictions/", { method: "POST", body: { student_id: student.id, scope, reason, note } });
      await onUpdated();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not restrict this student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={Boolean(student)} onClose={onClose} title="Restrict access" description={student ? `Apply a reversible restriction to ${student.full_name}. Payment access remains available.` : ""}>
      <form onSubmit={submit}>
        <div className="space-y-4 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <FormField label="Restriction" htmlFor="restriction-scope" required>
            <select id="restriction-scope" value={scope} onChange={(event) => setScope(event.target.value)} className={inputClassName}>
              <option value="CLASS_ACCESS">Block class attendance</option>
              <option value="FULL_PORTAL">Block learning portal actions</option>
            </select>
          </FormField>
          <FormField label="Reason" htmlFor="restriction-reason" required>
            <select id="restriction-reason" value={reason} onChange={(event) => setReason(event.target.value)} className={inputClassName}>
              <option value="OVERDUE_PAYMENT">Overdue payment</option>
              <option value="MANUAL">Manual restriction</option>
            </select>
          </FormField>
          <FormField label="Internal note" htmlFor="restriction-note">
            <textarea id="restriction-note" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className={inputClassName} />
          </FormField>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">{isSubmitting && <Loader2 size={16} className="animate-spin" />} Restrict access</button>
        </footer>
      </form>
    </Modal>
  );
}
