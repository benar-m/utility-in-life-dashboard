import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

// Mock M-Pesa: refunds through the adapter. Cash/bank: records a reversal (money returned
// or a mistaken entry). PayHero: records a refund already sent from the PayHero portal.
function modeFor(payment) {
  if (!payment) return {};
  if (payment.method !== "MPESA") {
    return { title: "Reverse payment", button: "Record reversal", note: "Use this when the money was handed back, or the payment was recorded by mistake. The invoice balance goes back up; the original entry is kept for the audit trail.", recordOnly: false };
  }
  if (payment.provider === "payhero") {
    return { title: "Record PayHero refund", button: "Record refund", note: "Send the refund from the PayHero portal first. This only records it here so the invoice and totals stay correct.", recordOnly: true };
  }
  return { title: "Refund payment", button: "Process refund", note: "This uses the mock reversal adapter and updates the invoice immediately.", recordOnly: false };
}

export default function RefundModal({ payment, onClose, onCompleted }) {
  const mode = modeFor(payment);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAmount(payment?.refundable_amount || "");
    setReason("");
    setError("");
  }, [payment]);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await apiRequest(`payments/transactions/${payment.id}/refund/`, { method: "POST", body: { amount, reason, record_only: mode.recordOnly } });
      await onCompleted();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not record the refund.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={Boolean(payment)} onClose={onClose} title={mode.title} description={payment ? `Payment reference ${payment.provider_reference}` : ""}>
      <form onSubmit={submit}>
        <div className="space-y-4 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{mode.note}</p>
          <FormField label="Refund amount" htmlFor="refund-amount" required hint={`Available: KES ${payment?.refundable_amount || "0.00"}`}>
            <input id="refund-amount" type="number" min="0.01" max={payment?.refundable_amount} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClassName} />
          </FormField>
          <FormField label="Reason" htmlFor="refund-reason" required>
            <textarea id="refund-reason" required maxLength={500} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className={inputClassName} />
          </FormField>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">{isSubmitting && <Loader2 size={16} className="animate-spin" />} {mode.button}</button>
        </footer>
      </form>
    </Modal>
  );
}
