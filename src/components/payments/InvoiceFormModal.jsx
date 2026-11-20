import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export default function InvoiceFormModal({ isOpen, students, onClose, onCreated }) {
  const [form, setForm] = useState({ student_id: "", description: "", total_amount: "", due_date: defaultDueDate() });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ student_id: "", description: "", total_amount: "", due_date: defaultDueDate() });
      setError("");
    }
  }, [isOpen]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await apiRequest("payments/invoices/", { method: "POST", body: form });
      await onCreated();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not issue the invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create invoice" description="Issue a one-off charge. Class fees can be generated in bulk from configured class costs.">
      <form onSubmit={submit}>
        <div className="space-y-4 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <FormField label="Student" htmlFor="invoice-student" required>
            <select id="invoice-student" required value={form.student_id} onChange={update("student_id")} className={inputClassName}>
              <option value="">Select a student</option>
              {students.filter((student) => student.status === "ACTIVE").map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} · {student.grade_level}{student.primary_guardian ? ` · ${student.primary_guardian.name}` : ""}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Description" htmlFor="invoice-description" required>
            <input id="invoice-description" required maxLength={255} value={form.description} onChange={update("description")} className={inputClassName} placeholder="e.g. September tuition" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Amount (KES)" htmlFor="invoice-amount" required>
              <input id="invoice-amount" type="number" min="0.01" step="0.01" required value={form.total_amount} onChange={update("total_amount")} className={inputClassName} />
            </FormField>
            <FormField label="Due date" htmlFor="invoice-due" required>
              <input id="invoice-due" type="date" required value={form.due_date} onChange={update("due_date")} className={inputClassName} />
            </FormField>
          </div>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {isSubmitting && <Loader2 size={16} className="animate-spin" />} Issue invoice
          </button>
        </footer>
      </form>
    </Modal>
  );
}
