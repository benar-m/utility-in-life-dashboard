import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import FormField, { inputClassName } from "../components/common/FormField.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import ShuleniLogo from "../components/common/ShuleniLogo.jsx";

const initialForm = {
  first_name: "",
  last_name: "",
  grade_level: "",
  student_email: "",
  guardian_name: "",
  guardian_email: "",
  guardian_phone: "",
  notes: "",
};

export default function PublicEnrollmentPage() {
  const { publicId } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    apiRequest(`public/enrollment/${publicId}/`)
      .then(setCampaign)
      .catch((requestError) => setError(requestError.message || "This enrollment form is unavailable."))
      .finally(() => setIsLoading(false));
  }, [publicId]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest(`public/enrollment/${publicId}/applications/`, {
        method: "POST",
        body: form,
      });
      setIsSubmitted(true);
    } catch (requestError) {
      setError(requestError.message || "Could not submit the application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <Link to="/" aria-label="Shuleni Online home">
            <ShuleniLogo />
          </Link>
        </header>

        <div className="px-6 py-6 sm:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" /> Loading enrollment form…
            </div>
          ) : error && !campaign ? (
            <InlineAlert>{error}</InlineAlert>
          ) : isSubmitted ? (
            <div className="py-10 text-center">
              <CheckCircle2 size={46} className="mx-auto text-brand-500" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">Application received</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                An administrator will review the information. Submitting this form does not automatically create a login or confirm a class place.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">{campaign.title}</h1>
              {campaign.description && <p className="mt-2 text-sm text-slate-600">{campaign.description}</p>}
              {campaign.target_class && (
                <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-800">{campaign.target_class.name}</p>
                  <p className="mt-1 text-xs text-brand-700">
                    {campaign.target_class.subject} · {campaign.target_class.grade_level}
                  </p>
                  {campaign.target_class.teacher && (
                    <p className="mt-1 text-xs text-brand-700">Teacher: {campaign.target_class.teacher}</p>
                  )}
                  {campaign.target_class.schedule?.map((slot) => (
                    <p key={`${slot.weekday}-${slot.start_time}`} className="mt-1 flex items-center gap-1 text-xs text-brand-700">
                      <Clock3 size={12} aria-hidden="true" /> {slot.weekday} {slot.start_time}–{slot.end_time}
                    </p>
                  ))}
                  <p className="mt-2 text-sm text-brand-800">
                    {campaign.target_class.cost_amount === null
                      ? "Cost will be confirmed by the administrator."
                      : `Class cost: ${campaign.target_class.currency} ${Number(campaign.target_class.cost_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {error && <InlineAlert>{error}</InlineAlert>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Student first name" htmlFor="public-first-name" required>
                    <input id="public-first-name" required value={form.first_name} onChange={update("first_name")} className={inputClassName} />
                  </FormField>
                  <FormField label="Student last name" htmlFor="public-last-name" required>
                    <input id="public-last-name" required value={form.last_name} onChange={update("last_name")} className={inputClassName} />
                  </FormField>
                  <FormField label="Grade level" htmlFor="public-grade" required>
                    <input id="public-grade" required value={form.grade_level} onChange={update("grade_level")} placeholder="Grade 6" className={inputClassName} />
                  </FormField>
                  <FormField label="Student email" htmlFor="public-student-email" hint="Optional; portal access is issued separately after review.">
                    <input id="public-student-email" type="email" value={form.student_email} onChange={update("student_email")} className={inputClassName} />
                  </FormField>
                </div>
                <div className="border-t border-slate-100 pt-5">
                  <h2 className="mb-4 text-sm font-semibold text-slate-800">Parent or guardian</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Guardian name" htmlFor="public-guardian-name" required>
                      <input id="public-guardian-name" required value={form.guardian_name} onChange={update("guardian_name")} className={inputClassName} />
                    </FormField>
                    <FormField label="Guardian email" htmlFor="public-guardian-email" required>
                      <input id="public-guardian-email" type="email" required value={form.guardian_email} onChange={update("guardian_email")} className={inputClassName} />
                    </FormField>
                    <FormField label="Guardian phone" htmlFor="public-guardian-phone">
                      <input id="public-guardian-phone" type="tel" value={form.guardian_phone} onChange={update("guardian_phone")} className={inputClassName} />
                    </FormField>
                  </div>
                </div>
                <FormField label="Anything else we should know?" htmlFor="public-notes">
                  <textarea id="public-notes" rows={4} value={form.notes} onChange={update("notes")} className={inputClassName} />
                </FormField>
                <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {isSubmitting ? "Submitting…" : "Submit enrollment application"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
