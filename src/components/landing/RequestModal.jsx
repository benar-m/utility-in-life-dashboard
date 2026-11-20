import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const COPY = {
  CLASS: { title: "Request a place", success: "We'll confirm the place and schedule with you." },
  EVENT: { title: "Trips & excursions", success: "We'll share upcoming trips and how to join." },
  RESOURCE: { title: "Request access", success: "We'll get back to you about access to this resource." },
};

const emptyForm = {
  first_name: "",
  last_name: "",
  guardian_name: "",
  grade_level: "",
  contact_email: "",
  contact_phone: "",
  preferred_times: "",
  notes: "",
};

// Class place, trip enquiry or resource access. No account needed; staff follow up.
export default function RequestModal({ request, onClose }) {
  const { service, item, notice } = request;
  const { currentUser } = useAuth();
  // Signed-in users shouldn't have to retype who they are.
  const [form, setForm] = useState(() => {
    const [firstName = "", ...rest] = (currentUser?.full_name || "").split(" ");
    const isNamed = currentUser?.full_name && currentUser.full_name !== currentUser.email;
    return {
      ...emptyForm,
      first_name: isNamed ? firstName : "",
      last_name: isNamed ? rest.join(" ") : "",
      contact_email: currentUser?.email || "",
      grade_level: item?.grade_level || "",
    };
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const copy = COPY[service];
  const asksForLevel = service !== "RESOURCE";
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const details = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    try {
      if (service === "RESOURCE") {
        await apiRequest("public/resource-interests/", {
          method: "POST",
          body: {
            resource_id: item.id,
            student_name: `${details.first_name} ${details.last_name}`.trim(),
            email: details.contact_email,
            phone: details.contact_phone,
            notes: details.notes,
          },
        });
      } else {
        await apiRequest("public/self-enroll/", {
          method: "POST",
          body: { service, ...(item && { class_id: item.id }), ...details },
        });
      }
      setIsSubmitted(true);
    } catch (requestError) {
      setError(requestError.message || "Your request could not be sent. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={copy.title} description={item?.name || item?.title} size="lg">
      {isSubmitted ? (
        <div className="px-6 py-10 text-center">
          <CheckCircle2 size={44} className="mx-auto text-shuleni-teal" aria-hidden="true" />
          <p className="mt-4 text-lg font-bold text-shuleni-navy">Request received</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">{copy.success}</p>
          <button type="button" onClick={onClose} className="mt-6 rounded-full bg-shuleni-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-shuleni-ink">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {notice && <p className="rounded-lg bg-shuleni-aqua px-3 py-2 text-sm text-shuleni-ink">{notice}</p>}
          {error && <InlineAlert>{error}</InlineAlert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Student's first name" htmlFor="request-first" required>
              <input id="request-first" required value={form.first_name} onChange={update("first_name")} className={inputClassName} />
            </FormField>
            <FormField label="Student's last name" htmlFor="request-last" required>
              <input id="request-last" required value={form.last_name} onChange={update("last_name")} className={inputClassName} />
            </FormField>
            {asksForLevel && (
              <FormField label="Parent's name" htmlFor="request-parent" required>
                <input id="request-parent" required value={form.guardian_name} onChange={update("guardian_name")} className={inputClassName} />
              </FormField>
            )}
            {asksForLevel && (
              <FormField label="Grade or level" htmlFor="request-grade" required>
                <input id="request-grade" required value={form.grade_level} onChange={update("grade_level")} placeholder="Form 3" className={inputClassName} />
              </FormField>
            )}
            <FormField label="Parent or student email" htmlFor="request-email" required>
              <input id="request-email" type="email" required value={form.contact_email} onChange={update("contact_email")} className={inputClassName} />
            </FormField>
            <FormField label="Phone" htmlFor="request-phone">
              <input id="request-phone" type="tel" value={form.contact_phone} onChange={update("contact_phone")} placeholder="0712 345 678" className={inputClassName} />
            </FormField>
            {asksForLevel && (
              <FormField label="Preferred times" htmlFor="request-times" hint="Optional">
                <input id="request-times" value={form.preferred_times} onChange={update("preferred_times")} placeholder="Weekdays after 4pm" className={inputClassName} />
              </FormField>
            )}
          </div>
          <FormField label="Anything else we should know?" htmlFor="request-notes">
            <textarea id="request-notes" rows={3} value={form.notes} onChange={update("notes")} className={inputClassName} />
          </FormField>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-shuleni-red px-5 py-3 text-sm font-bold text-white hover:bg-[#cf3330] disabled:opacity-60"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isSubmitting ? "Sending…" : "Send request"}
          </button>
          <p className="text-center text-xs text-slate-400">No account needed. Our team will contact you.</p>
        </form>
      )}
    </Modal>
  );
}
