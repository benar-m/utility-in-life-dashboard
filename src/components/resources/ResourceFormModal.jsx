import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

const emptyForm = {
  title: "",
  description: "",
  subject_id: "",
  grade_level: "",
  resource_type: "NOTES",
  price_amount: "",
  currency: "KES",
  download_url: "",
  is_published: true,
};

export default function ResourceFormModal({ isOpen, subjects, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setError("");
    }
  }, [isOpen]);

  const update = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest("resources/", {
        method: "POST",
        body: {
          ...form,
          subject_id: form.subject_id ? Number(form.subject_id) : null,
          price_amount: form.price_amount === "" ? null : Number(form.price_amount),
          currency: form.currency.trim().toUpperCase(),
          title: form.title.trim(),
          description: form.description.trim(),
          download_url: form.download_url.trim(),
        },
      });
      onCreated();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not save the resource.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add learning resource"
      description="Publish a paper, set of notes, or study guide for students to discover."
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <FormField label="Title" htmlFor="resource-title" required>
            <input id="resource-title" required value={form.title} onChange={update("title")} placeholder="2026 Form 3 Mathematics revision pack" className={inputClassName} />
          </FormField>
          <FormField label="Short description" htmlFor="resource-description">
            <textarea id="resource-description" rows={3} value={form.description} onChange={update("description")} placeholder="What will the learner find inside?" className={inputClassName} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Subject" htmlFor="resource-subject">
              <select id="resource-subject" value={form.subject_id} onChange={update("subject_id")} className={inputClassName}>
                <option value="">General resource</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </FormField>
            <FormField label="Grade or level" htmlFor="resource-grade">
              <input id="resource-grade" value={form.grade_level} onChange={update("grade_level")} placeholder="Form 3" className={inputClassName} />
            </FormField>
            <FormField label="Resource type" htmlFor="resource-type" required>
              <select id="resource-type" required value={form.resource_type} onChange={update("resource_type")} className={inputClassName}>
                <option value="EXAM_PAPER">Exam paper</option>
                <option value="NOTES">Notes</option>
                <option value="BOOK">Book</option>
                <option value="STUDY_GUIDE">Study guide</option>
                <option value="OTHER">Other</option>
              </select>
            </FormField>
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <FormField label="Price" htmlFor="resource-price" hint="Leave blank for free.">
                <input id="resource-price" type="number" min="0" step="0.01" value={form.price_amount} onChange={update("price_amount")} placeholder="0" className={inputClassName} />
              </FormField>
              <FormField label="Currency" htmlFor="resource-currency">
                <input id="resource-currency" maxLength={3} value={form.currency} onChange={update("currency")} className={inputClassName} />
              </FormField>
            </div>
          </div>
          <FormField label="Resource link" htmlFor="resource-url" hint="Use a secure file or checkout link for this local prototype.">
            <input id="resource-url" type="url" value={form.download_url} onChange={update("download_url")} placeholder="https://..." className={inputClassName} />
          </FormField>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_published} onChange={update("is_published")} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" />
            <span><span className="block font-medium text-slate-900">Show in the student marketplace</span><span className="mt-0.5 block text-xs text-slate-500">Students can discover it from the public learning hub.</span></span>
          </label>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Publish resource
          </button>
        </footer>
      </form>
    </Modal>
  );
}
