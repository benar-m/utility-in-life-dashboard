import { useState } from "react";
import { Check, Loader2, UserRoundCheck, X } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import useApiCollection from "../../hooks/useApiCollection.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function EnrollmentApplicationsPanel({ onAccepted }) {
  const { items: applications, isLoading, error, reload } = useApiCollection(
    "applications/?status=PENDING&page_size=100"
  );
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [applicationToReject, setApplicationToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const acceptApplication = async (application) => {
    setActionError("");
    setBusyId(application.id);
    try {
      await apiRequest(`applications/${application.id}/accept/`, {
        method: "POST",
        body: {},
      });
      await Promise.all([reload(), onAccepted()]);
    } catch (requestError) {
      setActionError(requestError.message || "Could not accept the application.");
    } finally {
      setBusyId(null);
    }
  };

  const rejectApplication = async (event) => {
    event.preventDefault();
    setActionError("");
    setBusyId(applicationToReject.id);
    try {
      await apiRequest(`applications/${applicationToReject.id}/reject/`, {
        method: "POST",
        body: { reason: rejectionReason.trim() },
      });
      await reload();
      setApplicationToReject(null);
      setRejectionReason("");
    } catch (requestError) {
      setActionError(requestError.message || "Could not reject the application.");
    } finally {
      setBusyId(null);
    }
  };

  if (!isLoading && applications.length === 0 && !error && !actionError) return null;

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <UserRoundCheck size={18} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Enrollment applications</h2>
          <p className="text-xs text-slate-500">Review public form submissions before creating student records.</p>
        </div>
        {!isLoading && <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{applications.length} pending</span>}
      </header>
      <div className="space-y-3 p-4">
        {(error || actionError) && <InlineAlert>{error || actionError}</InlineAlert>}
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Loading applications…</div>
        ) : (
          applications.map((application) => (
            <article key={application.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{application.student_name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {application.grade_level} · Guardian: {application.guardian_name} ({application.guardian_email})
                </p>
                <p className="mt-1 text-xs font-medium text-blue-700">
                  {application.requested_class
                    ? `Requested class: ${application.requested_class.name}`
                    : `General campaign: ${application.campaign.title}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setApplicationToReject(application);
                    setRejectionReason("");
                  }}
                  disabled={busyId === application.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X size={14} /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => acceptApplication(application)}
                  disabled={busyId === application.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {busyId === application.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Accept
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      <Modal
        isOpen={Boolean(applicationToReject)}
        onClose={() => setApplicationToReject(null)}
        title="Reject application"
        description={applicationToReject ? `Reject ${applicationToReject.student_name}'s application.` : ""}
      >
        <form onSubmit={rejectApplication}>
          <div className="px-6 py-5">
            <FormField label="Reason" htmlFor="rejection-reason" hint="Optional internal review note.">
              <textarea id="rejection-reason" rows={4} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className={inputClassName} />
            </FormField>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={() => setApplicationToReject(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={Boolean(busyId)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Reject application</button>
          </footer>
        </form>
      </Modal>
    </section>
  );
}
