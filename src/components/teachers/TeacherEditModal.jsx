import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";
import SubjectPicker from "../common/SubjectPicker.jsx";

export default function TeacherEditModal({ teacher, onClose, onUpdated }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!teacher) {
      setForm(null);
      return;
    }
    setForm({ full_name: teacher.display_name, phone: teacher.account_phone || "", subject_names: teacher.subjects });
    setError("");
  }, [teacher]);

  const send = async (body) => {
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest(`teachers/${teacher.id}/`, { method: "PATCH", body });
      await onUpdated();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not update the teacher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (form.subject_names.length === 0) return setError("Pick at least one subject.");
    return send(form);
  };

  const isActive = teacher?.status === "ACTIVE";

  return (
    <Modal isOpen={Boolean(teacher)} onClose={onClose} title="Edit teacher" description={teacher?.account_email} size="lg">
      {teacher && form && (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            {error && <InlineAlert>{error}</InlineAlert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" htmlFor="teacher-edit-name" required>
                <input id="teacher-edit-name" required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className={inputClassName} />
              </FormField>
              <FormField label="Phone" htmlFor="teacher-edit-phone">
                <input id="teacher-edit-phone" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClassName} />
              </FormField>
            </div>
            <FormField label="Subjects" htmlFor="teacher-edit-subjects" required>
              <SubjectPicker id="teacher-edit-subjects" multiple value={form.subject_names} onChange={(subjectNames) => setForm({ ...form, subject_names: subjectNames })} />
            </FormField>
            {teacher.status !== "INVITED" && (
              <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  {isActive ? "Deactivating blocks their sign-in. Reassign their classes first." : "This teacher is deactivated and can't sign in."}
                </p>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => send({ status: isActive ? "INACTIVE" : "ACTIVE" })}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium ${isActive ? "border-red-200 text-red-700 hover:bg-red-50" : "border-slate-200 text-slate-700 hover:bg-white"}`}
                >
                  {isActive ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            )}
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />} Save changes
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
