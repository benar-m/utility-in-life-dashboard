import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

const initialForm = {
  first_name: "",
  last_name: "",
  grade_level: "",
  guardian_name: "",
  guardian_email: "",
  guardian_phone: "",
};

// `initialValues` pre-fills the form (e.g. converting a public registration).
// onCreated receives the new student.
export default function StudentFormModal({ isOpen, onClose, onCreated, initialValues, title = "Add a student" }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [duplicateOf, setDuplicateOf] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...initialForm, ...initialValues });
      setError("");
      setDuplicateOf(null);
    }
  }, [isOpen, initialValues]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setForm(initialForm);
    setError("");
    onClose();
  };

  const submit = async (confirmDuplicate = false) => {
    setError("");
    setIsSubmitting(true);
    try {
      const student = await apiRequest("students/", {
        method: "POST",
        body: { ...form, confirm_duplicate: confirmDuplicate },
      });
      setForm(initialForm);
      setDuplicateOf(null);
      onCreated(student);
      onClose();
    } catch (requestError) {
      const duplicate = requestError.details?.duplicate_of;
      setDuplicateOf(duplicate ? [].concat(duplicate)[0] : null);
      setError(requestError.message || "Could not add the student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submit(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description="Create the student record and link their primary guardian."
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          {duplicateOf && (
            <div className="flex flex-wrap gap-2">
              <a href={`/students/${duplicateOf}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Open existing record
              </a>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={isSubmitting}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                Add anyway (a different student)
              </button>
            </div>
          )}

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-slate-900">Student details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name" htmlFor="student-first-name" required>
                <input
                  id="student-first-name"
                  required
                  value={form.first_name}
                  onChange={update("first_name")}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Last name" htmlFor="student-last-name" required>
                <input
                  id="student-last-name"
                  required
                  value={form.last_name}
                  onChange={update("last_name")}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Grade level" htmlFor="student-grade" required>
                <input
                  id="student-grade"
                  required
                  value={form.grade_level}
                  onChange={update("grade_level")}
                  placeholder="e.g. Grade 6"
                  className={inputClassName}
                />
              </FormField>
            </div>
          </fieldset>

          <fieldset className="border-t border-slate-100 pt-5">
            <legend className="mb-3 text-sm font-semibold text-slate-900">Primary guardian</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" htmlFor="guardian-name" required>
                <input
                  id="guardian-name"
                  required
                  value={form.guardian_name}
                  onChange={update("guardian_name")}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Email" htmlFor="guardian-email" required>
                <input
                  id="guardian-email"
                  type="email"
                  required
                  value={form.guardian_email}
                  onChange={update("guardian_email")}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Phone" htmlFor="guardian-phone">
                <input
                  id="guardian-phone"
                  type="tel"
                  value={form.guardian_phone}
                  onChange={update("guardian_phone")}
                  placeholder="+254…"
                  className={inputClassName}
                />
              </FormField>
            </div>
          </fieldset>
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
            Add student
          </button>
        </footer>
      </form>
    </Modal>
  );
}
