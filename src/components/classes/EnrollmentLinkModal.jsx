import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function EnrollmentLinkModal({ classGroup, onClose }) {
  const [publicUrl, setPublicUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!classGroup) return;
    setPublicUrl("");
    setError("");
    setIsCopied(false);
    setIsLoading(true);
    apiRequest(`classes/${classGroup.id}/enrollment-link/`, {
      method: "POST",
      body: {},
    })
      .then((payload) => setPublicUrl(payload.public_url))
      .catch((requestError) => setError(requestError.message || "Could not create the link."))
      .finally(() => setIsLoading(false));
  }, [classGroup]);

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
      isOpen={Boolean(classGroup)}
      onClose={onClose}
      title="Class enrollment link"
      description={classGroup ? `Share this form to collect applications for ${classGroup.name}.` : ""}
    >
      <div className="space-y-4 px-6 py-5">
        {error && <InlineAlert>{error}</InlineAlert>}
        <InlineAlert tone="success">
          Submissions remain pending until an administrator accepts them. Acceptance assigns the student to this class.
        </InlineAlert>
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Preparing link…
          </div>
        ) : (
          <FormField label="Public enrollment form" htmlFor="class-public-link">
            <div className="flex gap-2">
              <input
                id="class-public-link"
                readOnly
                value={publicUrl}
                onFocus={(event) => event.target.select()}
                className={inputClassName}
              />
              <button
                type="button"
                onClick={copyLink}
                disabled={!publicUrl}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                {isCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </FormField>
        )}
      </div>
      <footer className="flex justify-end border-t border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Done
        </button>
      </footer>
    </Modal>
  );
}
