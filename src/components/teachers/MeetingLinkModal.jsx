import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

// Teachers save through their portal; admins pass endpoint="admin" to use the classes API.
export default function MeetingLinkModal({ classGroup, onClose, onUpdated, endpoint = "teacher" }) {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMeetingUrl(classGroup?.default_meeting_url || "");
    setError("");
  }, [classGroup]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const isAdmin = endpoint === "admin";
      await apiRequest(isAdmin ? `classes/${classGroup.id}/meeting-link/` : `portal/teacher/classes/${classGroup.id}/meeting-link/`, {
        method: isAdmin ? "POST" : "PATCH",
        body: { default_meeting_url: meetingUrl.trim() },
      });
      onUpdated();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not update the meeting link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(classGroup)}
      onClose={onClose}
      title="Update meeting link"
      description={classGroup ? `Set the link for ${classGroup.name}.` : ""}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <FormField
            label="HTTPS meeting URL"
            htmlFor="meeting-url"
            hint="Enrolled students get a Join lesson button in their portal; the link stays hidden from the public."
          >
            <input
              id="meeting-url"
              type="url"
              pattern="https://.*"
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="https://meet.google.com/..."
              className={inputClassName}
            />
          </FormField>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
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
            Save link
          </button>
        </footer>
      </form>
    </Modal>
  );
}
