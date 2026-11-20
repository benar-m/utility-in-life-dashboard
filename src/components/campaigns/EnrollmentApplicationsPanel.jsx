import { useEffect, useState } from "react";
import { Check, Loader2, UserRoundCheck, X } from "lucide-react";
import { apiRequest, resultList } from "../../api/client.js";
import useApiCollection from "../../hooks/useApiCollection.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";
import StatusBadge from "../common/StatusBadge.jsx";

const NO_CLASS = "none";

const isEnquiry = (application) => application.campaign.kind === "ENQUIRY";

function AcceptModal({ application, onClose, onAccepted }) {
  const [classes, setClasses] = useState([]);
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!application) return;
    setError("");
    setChoice(application.requested_class ? String(application.requested_class.id) : NO_CLASS);
    apiRequest("classes/?status=ACTIVE&page_size=200")
      .then((payload) => setClasses(resultList(payload)))
      .catch(() => setError("Could not load classes."));
  }, [application]);

  const accept = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest(`applications/${application.id}/accept/`, {
        method: "POST",
        body: { class_id: choice === NO_CLASS ? null : Number(choice) },
      });
      await onAccepted();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not accept the application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={Boolean(application)} onClose={onClose} title="Accept application" description={application ? `Create a student record for ${application.student_name}.` : ""}>
      <form onSubmit={accept}>
        <div className="space-y-4 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <FormField label="Place in class" htmlFor="accept-class" hint="Full classes can't take more students.">
            <select id="accept-class" value={choice} onChange={(event) => setChoice(event.target.value)} className={inputClassName}>
              <option value={NO_CLASS}>No class yet (just create the student)</option>
              {classes.map((classGroup) => {
                const isFull = Boolean(classGroup.capacity) && classGroup.enrolled_count >= classGroup.capacity;
                const isRequested = application?.requested_class?.id === classGroup.id;
                return (
                  <option key={classGroup.id} value={classGroup.id} disabled={isFull}>
                    {classGroup.name} · {classGroup.enrolled_count}/{classGroup.capacity || "∞"}
                    {isRequested ? " (requested)" : ""}
                    {isFull ? " (full)" : ""}
                  </option>
                );
              })}
            </select>
          </FormField>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
            {isSubmitting && <Loader2 size={16} className="animate-spin" />} Accept
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export default function EnrollmentApplicationsPanel({ onAccepted }) {
  const [view, setView] = useState("PENDING");
  const query = view === "PENDING" ? "status=PENDING" : "";
  const { items, isLoading, error, reload } = useApiCollection(`applications/?${query}&page_size=100`);
  const applications = view === "PENDING" ? items : items.filter((item) => item.status !== "PENDING");
  const [actionError, setActionError] = useState("");
  const [applicationToAccept, setApplicationToAccept] = useState(null);
  const [applicationToReject, setApplicationToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const rejectApplication = async (event) => {
    event.preventDefault();
    setActionError("");
    setIsRejecting(true);
    try {
      await apiRequest(`applications/${applicationToReject.id}/reject/`, {
        method: "POST",
        body: { reason: rejectionReason.trim() || (isEnquiry(applicationToReject) ? "Enquiry followed up." : "") },
      });
      await reload();
      setApplicationToReject(null);
      setRejectionReason("");
    } catch (requestError) {
      setActionError(requestError.message || "Could not update the application.");
    } finally {
      setIsRejecting(false);
    }
  };

  // Stay out of the way when there's nothing pending, unless someone asked for history.
  if (view === "PENDING" && !isLoading && applications.length === 0 && !error && !actionError) {
    return (
      <p className="mb-4 text-right text-xs">
        <button type="button" onClick={() => setView("HISTORY")} className="font-medium text-slate-500 hover:text-slate-800 hover:underline">
          View past applications and enquiries
        </button>
      </p>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <UserRoundCheck size={18} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Applications & enquiries</h2>
          <p className="text-xs text-slate-500">From enrollment links and the public site. Accepting creates a student record.</p>
        </div>
        <div className="ml-auto inline-flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Show">
          {[["PENDING", "Pending"], ["HISTORY", "History"]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`rounded-md px-3 py-1 text-xs font-medium ${view === value ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="space-y-3 p-4">
        {(error || actionError) && <InlineAlert>{error || actionError}</InlineAlert>}
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Loading…</div>
        ) : applications.length === 0 ? (
          <p className="py-2 text-sm text-slate-500">Nothing here yet.</p>
        ) : (
          applications.map((application) => (
            <article key={application.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium text-slate-900">
                  {application.student_name}
                  {isEnquiry(application) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Enquiry</span>}
                  {view === "HISTORY" && <StatusBadge status={application.status} />}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {application.grade_level} · Parent: {application.guardian_name} ({application.guardian_email}
                  {application.guardian_phone ? ` · ${application.guardian_phone}` : ""})
                </p>
                <p className="mt-1 text-xs font-medium text-blue-700">
                  {application.requested_class ? `Requested class: ${application.requested_class.name}` : application.campaign.title}
                </p>
                {application.notes && <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{application.notes}</p>}
                {view === "HISTORY" && application.rejection_reason && <p className="mt-1 text-xs text-slate-500">Note: {application.rejection_reason}</p>}
              </div>
              {application.status === "PENDING" && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setApplicationToReject(application);
                      setRejectionReason("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <X size={14} /> {isEnquiry(application) ? "Close enquiry" : "Reject"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplicationToAccept(application)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
                  >
                    <Check size={14} /> {isEnquiry(application) ? "Enrol as student…" : "Accept…"}
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <AcceptModal
        application={applicationToAccept}
        onClose={() => setApplicationToAccept(null)}
        onAccepted={() => Promise.all([reload(), onAccepted()])}
      />
      <Modal
        isOpen={Boolean(applicationToReject)}
        onClose={() => setApplicationToReject(null)}
        title={applicationToReject && isEnquiry(applicationToReject) ? "Close enquiry" : "Reject application"}
        description={applicationToReject ? applicationToReject.student_name : ""}
      >
        <form onSubmit={rejectApplication}>
          <div className="px-6 py-5">
            <FormField label="Note" htmlFor="rejection-reason" hint="Optional internal note, e.g. what you told the parent.">
              <textarea id="rejection-reason" rows={4} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className={inputClassName} />
            </FormField>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={() => setApplicationToReject(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isRejecting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {applicationToReject && isEnquiry(applicationToReject) ? "Close enquiry" : "Reject application"}
            </button>
          </footer>
        </form>
      </Modal>
    </section>
  );
}
