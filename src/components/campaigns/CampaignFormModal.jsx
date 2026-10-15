import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function CampaignFormModal({ isOpen, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const resetAndClose = () => {
    if (isSubmitting) return;
    setTitle("");
    setDescription("");
    setClosesAt("");
    setPublicUrl("");
    setError("");
    setIsCopied(false);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const campaign = await apiRequest("campaigns/", {
        method: "POST",
        body: {
          title: title.trim(),
          description: description.trim(),
          status: "OPEN",
          closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        },
      });
      setPublicUrl(campaign.public_url);
    } catch (requestError) {
      setError(requestError.message || "Could not create the campaign.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setError("");
      setIsCopied(true);
    } catch {
      setError("Could not copy automatically. Select the link and copy it manually.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={publicUrl ? "Campaign created" : "Create enrollment campaign"}
      description={publicUrl ? "Share this form to collect general student applications." : "General campaigns create pending student applications without assigning a class."}
      size="lg"
    >
      {publicUrl ? (
        <div>
          <div className="space-y-4 px-6 py-5">
            {error && <InlineAlert>{error}</InlineAlert>}
            <InlineAlert tone="success">The campaign is open and ready to receive applications.</InlineAlert>
            <FormField label="Public campaign link" htmlFor="campaign-public-link">
              <div className="flex gap-2">
                <input id="campaign-public-link" readOnly value={publicUrl} onFocus={(event) => event.target.select()} className={inputClassName} />
                <button type="button" onClick={copyLink} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  {isCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </FormField>
          </div>
          <footer className="flex justify-end border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={resetAndClose} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Done</button>
          </footer>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            {error && <InlineAlert>{error}</InlineAlert>}
            <FormField label="Campaign title" htmlFor="campaign-title" required>
              <input id="campaign-title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="September student intake" className={inputClassName} />
            </FormField>
            <FormField label="Description" htmlFor="campaign-description">
              <textarea id="campaign-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell families who should apply and what happens next." className={inputClassName} />
            </FormField>
            <FormField label="Close applications at" htmlFor="campaign-closes" hint="Optional; uses your browser's local timezone.">
              <input id="campaign-closes" type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className={inputClassName} />
            </FormField>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={resetAndClose} disabled={isSubmitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Create campaign
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
