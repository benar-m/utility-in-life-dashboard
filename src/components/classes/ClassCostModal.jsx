import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function ClassCostModal({ classGroup, onClose, onUpdated }) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [applyExisting, setApplyExisting] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAmount(classGroup?.cost_amount ?? "");
    setCurrency(classGroup?.currency || "KES");
    setApplyExisting(true);
    setError("");
  }, [classGroup]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest(`classes/${classGroup.id}/cost/`, {
        method: "POST",
        body: {
          cost_amount: amount === "" ? null : amount,
          currency: currency.trim().toUpperCase(),
          apply_to_active_enrollments: applyExisting,
        },
      });
      await onUpdated();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not save the class cost.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(classGroup)}
      onClose={onClose}
      title="Set class cost"
      description={classGroup ? `Internal fee configuration for ${classGroup.name}.` : ""}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <FormField label="Cost" htmlFor="class-cost" hint="Leave blank to remove the configured cost.">
              <input
                id="class-cost"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClassName}
              />
            </FormField>
            <FormField label="Currency" htmlFor="class-currency" required>
              <input
                id="class-currency"
                maxLength={3}
                required
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                className={inputClassName}
              />
            </FormField>
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={applyExisting}
              onChange={(event) => setApplyExisting(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            <span>
              Apply to active enrollments that are pending or not configured. Cleared and waived records are preserved.
            </span>
          </label>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Save cost
          </button>
        </footer>
      </form>
    </Modal>
  );
}
