import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, resultList } from "../api/client.js";
import FormField, { inputClassName } from "../components/common/FormField.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";

const money = (value, currency = "KES") =>
  value === null || value === undefined
    ? "—"
    : `${currency} ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

const dateText = (value) => new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value));

function Section({ title, children, action }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <h2 className="font-display text-base font-bold text-shuleni-navy">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [studentData, enrollmentData, invoiceData] = await Promise.all([
        apiRequest(`students/${studentId}/`),
        apiRequest(`students/${studentId}/enrollments/`),
        apiRequest(`payments/invoices/?student=${studentId}&page_size=100`),
      ]);
      setStudent(studentData);
      setForm({
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        grade_level: studentData.grade_level,
        guardian_name: studentData.primary_guardian?.name || "",
        guardian_phone: studentData.primary_guardian?.phone || "",
      });
      setEnrollments(enrollmentData);
      setInvoices(resultList(invoiceData));
    } catch (requestError) {
      setError(requestError.message || "Could not load this student.");
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (request, successMessage) => {
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      await request();
      setNotice(successMessage);
      await load();
    } catch (requestError) {
      setError(requestError.message || "That didn't work. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  if (!student && !error) {
    return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading student…</p>;
  }

  const isArchived = student?.status !== "ACTIVE";

  return (
    <div className="space-y-6">
      <Link to="/students" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Students
      </Link>
      {error && <InlineAlert>{error}</InlineAlert>}
      {notice && <InlineAlert tone="success">{notice}</InlineAlert>}

      {student && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-shuleni-navy sm:text-3xl">{student.full_name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <StatusBadge status={student.status} /> {student.grade_level} · joined {dateText(student.joined_at)}
                {student.account_email && <span>· portal: {student.account_email}</span>}
              </p>
            </div>
            {isArchived && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => run(() => apiRequest(`students/${student.id}/restore/`, { method: "POST", body: {} }), "Student restored. Reassign their classes if needed.")}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                <RotateCcw size={16} /> Restore student
              </button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Details">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  run(() => apiRequest(`students/${student.id}/`, { method: "PATCH", body: form }), "Details saved.");
                }}
                className="grid gap-4 sm:grid-cols-2"
              >
                <FormField label="First name" htmlFor="detail-first" required>
                  <input id="detail-first" required value={form.first_name} onChange={update("first_name")} className={inputClassName} />
                </FormField>
                <FormField label="Last name" htmlFor="detail-last" required>
                  <input id="detail-last" required value={form.last_name} onChange={update("last_name")} className={inputClassName} />
                </FormField>
                <FormField label="Grade level" htmlFor="detail-grade" required>
                  <input id="detail-grade" required value={form.grade_level} onChange={update("grade_level")} className={inputClassName} />
                </FormField>
                <div />
                <FormField label="Guardian name" htmlFor="detail-guardian">
                  <input id="detail-guardian" value={form.guardian_name} onChange={update("guardian_name")} className={inputClassName} />
                </FormField>
                <FormField label="Guardian phone" htmlFor="detail-phone">
                  <input id="detail-phone" type="tel" value={form.guardian_phone} onChange={update("guardian_phone")} className={inputClassName} />
                </FormField>
                <p className="text-xs text-slate-500 sm:col-span-2">
                  Guardian email: {student.primary_guardian?.email || "—"} (sign-in emails can't be changed here).
                </p>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                    {isSaving && <Loader2 size={16} className="animate-spin" />} Save changes
                  </button>
                </div>
              </form>
            </Section>

            <Section title="Classes">
              {enrollments.length === 0 ? (
                <p className="text-sm text-slate-500">Not enrolled in any class.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {enrollments.map((enrollment) => (
                    <li key={enrollment.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <Link to={`/classes/${enrollment.class_group}`} className="font-medium text-slate-900 hover:underline">
                          {enrollment.class_name}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <StatusBadge status={enrollment.status} /> balance {money(enrollment.balance_due)}
                        </p>
                      </div>
                      {enrollment.status === "ACTIVE" && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            window.confirm(`Withdraw ${student.full_name} from ${enrollment.class_name}?`) &&
                            run(
                              () => apiRequest(`classes/${enrollment.class_group}/withdraw/`, { method: "POST", body: { enrollment_id: enrollment.id } }),
                              `Withdrawn from ${enrollment.class_name}.`
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Withdraw
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <Section title="Invoices">
            {invoices.length === 0 ? (
              <p className="text-sm text-slate-500">No invoices.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="py-2 pr-4 font-medium">Invoice</th><th className="py-2 pr-4 font-medium">For</th><th className="py-2 pr-4 font-medium">Due</th><th className="py-2 pr-4 font-medium">Balance</th><th className="py-2 font-medium">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="py-2 pr-4 font-medium text-slate-900">{invoice.number}</td>
                        <td className="py-2 pr-4 text-slate-600">{invoice.description}</td>
                        <td className="whitespace-nowrap py-2 pr-4 text-slate-600">{dateText(`${invoice.due_date}T00:00:00`)}</td>
                        <td className="whitespace-nowrap py-2 pr-4 text-slate-700">{money(invoice.amount_due, invoice.currency)}</td>
                        <td className="py-2"><StatusBadge status={invoice.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
