import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function RecordPaymentModal({ invoice, onClose, onCompleted }) {
  const [form, setForm] = useState({ method: "CASH", amount: "", reference: "", note: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({ method: "CASH", amount: invoice?.amount_due || "", reference: "", note: "" });
    setError("");
  }, [invoice]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest(`payments/invoices/${invoice.id}/record/`, { method: "POST", body: form });
      await onCompleted();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not record this payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(invoice)}
      onClose={onClose}
      title="Record received payment"
      description={invoice ? `${invoice.number} · ${invoice.currency} ${Number(invoice.amount_due).toLocaleString("en-KE", { minimumFractionDigits: 2 })} due` : ""}
    >
      <form onSubmit={submit}>
        <div className="space-y-4 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <InlineAlert>
            Use this for money already received by cash or bank transfer. It records the ledger entry and receipt; it does not send an M-Pesa prompt.
          </InlineAlert>
          <FormField label="Payment method" htmlFor="record-payment-method" required>
            <select id="record-payment-method" value={form.method} onChange={update("method")} className={inputClassName}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank transfer</option>
            </select>
          </FormField>
          <FormField label="Amount received (KES)" htmlFor="record-payment-amount" required>
            <input
              id="record-payment-amount"
              type="number"
              min="0.01"
              max={invoice?.amount_due}
              step="0.01"
              required
              value={form.amount}
              onChange={update("amount")}
              className={inputClassName}
            />
          </FormField>
          <FormField
            label={form.method === "BANK" ? "Bank transaction reference" : "Reference (optional)"}
            htmlFor="record-payment-reference"
            required={form.method === "BANK"}
          >
            <input
              id="record-payment-reference"
              required={form.method === "BANK"}
              maxLength={64}
              value={form.reference}
              onChange={update("reference")}
              className={inputClassName}
              placeholder={form.method === "BANK" ? "e.g. bank transaction code" : "Optional receipt or note number"}
            />
          </FormField>
          <FormField label="Internal note (optional)" htmlFor="record-payment-note">
            <textarea id="record-payment-note" rows={3} maxLength={500} value={form.note} onChange={update("note")} className={inputClassName} />
          </FormField>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {isSubmitting && <Loader2 size={16} className="animate-spin" />} Record payment
          </button>
        </footer>
      </form>
    </Modal>
  );
}
