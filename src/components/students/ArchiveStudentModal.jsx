import { useState } from "react";
import { Archive, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function ArchiveStudentModal({ student, onClose, onArchived }) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const archiveStudent = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest(`students/${student.id}/archive/`, {
        method: "POST",
        body: {},
      });
      await onArchived();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not archive the student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(student)}
      onClose={onClose}
      title="Archive student"
      description={student ? `Remove ${student.full_name} from active operations without deleting history.` : ""}
    >
      <div className="space-y-4 px-6 py-5">
        {error && <InlineAlert>{error}</InlineAlert>}
        <InlineAlert>
          This deactivates the student's portal login and withdraws active class enrollments. Historical records are preserved.
        </InlineAlert>
      </div>
      <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={archiveStudent} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
          Archive student
        </button>
      </footer>
    </Modal>
  );
}
