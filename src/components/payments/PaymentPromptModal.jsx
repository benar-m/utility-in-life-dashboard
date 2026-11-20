import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function PaymentPromptModal({ invoice, onClose, onCompleted }) {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPhone("");
    setAmount(invoice?.amount_due || "");
    setAttempt(null);
    setError("");
  }, [invoice]);

  useEffect(() => {
    if (!attempt || attempt.mock_mode || attempt.status !== "PENDING") return undefined;
    let isActive = true;
    const refreshAttempt = async () => {
      try {
        const current = await apiRequest(`payments/attempts/${attempt.id}/`);
        if (!isActive) return;
        setAttempt((previous) => ({ ...current, mock_mode: previous?.mock_mode }));
        if (current.status !== "PENDING") await onCompleted();
      } catch {
        // Keep polling while the provider callback is still pending.
      }
    };
    const intervalId = window.setInterval(refreshAttempt, 3000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [attempt?.id, attempt?.mock_mode, attempt?.status, onCompleted]);

  const sendPrompt = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const created = await apiRequest(`payments/invoices/${invoice.id}/pay/`, {
        method: "POST",
        body: { phone_number: phone, amount },
      });
      setAttempt(created);
    } catch (requestError) {
      setError(requestError.message || "Could not send the M-Pesa prompt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const decide = async (outcome) => {
    setIsSubmitting(true);
    setError("");
    try {
      const completed = await apiRequest(`payments/attempts/${attempt.id}/simulate/`, {
        method: "POST",
        body: { outcome },
      });
      setAttempt(completed);
      await onCompleted();
    } catch (requestError) {
      setError(requestError.message || "Could not complete the mock prompt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={Boolean(invoice)} onClose={onClose} title="Pay with M-Pesa" description={invoice ? `${invoice.number} · ${invoice.currency} ${Number(invoice.amount_due).toLocaleString("en-KE", { minimumFractionDigits: 2 })}` : ""}>
      {!attempt ? (
        <form onSubmit={sendPrompt}>
          <div className="space-y-4 px-6 py-5">
            {error && <InlineAlert>{error}</InlineAlert>}
            <InlineAlert>Submitting sends a prompt through the configured gateway. In production this is PayHero; money is collected only if the prompt is approved on the phone.</InlineAlert>
            <FormField label="M-Pesa phone" htmlFor="mpesa-phone" required hint="Kenyan format, for example 0712345678.">
              <input id="mpesa-phone" inputMode="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClassName} />
            </FormField>
            <FormField label="Amount" htmlFor="mpesa-amount" required>
              <input id="mpesa-amount" type="number" min="0.01" max={invoice?.amount_due} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClassName} />
            </FormField>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />} Send M-Pesa prompt
            </button>
          </footer>
        </form>
      ) : (
        <div>
          <div className="space-y-4 px-6 py-5">
            {error && <InlineAlert>{error}</InlineAlert>}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <Smartphone className="mx-auto text-brand-600" size={30} />
              <p className="mt-2 font-medium text-slate-900">{attempt.status !== "PENDING" ? "M-Pesa prompt finished" : attempt.mock_mode ? "Local test prompt created" : "M-Pesa prompt sent"}</p>
              {attempt.status === "PENDING" && <p className="mt-1 text-sm text-slate-500">{attempt.customer_message || (attempt.mock_mode ? "Use the local test controls below to simulate a response." : "Approve the prompt on your phone. This status will update automatically.")}</p>}
              <p className="mt-2 break-all text-xs text-slate-400">{attempt.checkout_request_id}</p>
            </div>
            {attempt.status !== "PENDING" && <InlineAlert tone={attempt.status === "SUCCEEDED" ? "success" : "error"}>Payment {attempt.status.toLowerCase()}.{attempt.result_description ? ` ${attempt.result_description}` : ""}</InlineAlert>}
          </div>
          <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4">
            {attempt.status === "PENDING" && attempt.mock_mode ? (
              <>
                <button type="button" disabled={isSubmitting} onClick={() => decide("CANCELLED")} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"><XCircle size={16} /> Simulate cancel</button>
                <button type="button" disabled={isSubmitting} onClick={() => decide("SUCCESS")} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Simulate approval</button>
              </>
            ) : <button type="button" onClick={onClose} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">{attempt.status === "PENDING" ? "Close" : "Done"}</button>}
          </footer>
        </div>
      )}
    </Modal>
  );
}
