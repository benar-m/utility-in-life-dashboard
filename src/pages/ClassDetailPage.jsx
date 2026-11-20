import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Video } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, resultList } from "../api/client.js";
import FormField, { inputClassName } from "../components/common/FormField.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
import MeetingLinkModal from "../components/teachers/MeetingLinkModal.jsx";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUSES = [
  ["ACTIVE", "Active"],
  ["PAUSED", "Paused"],
  ["ARCHIVED", "Ended / archived"],
];

const money = (value, currency = "KES") =>
  value === null || value === undefined ? "—" : `${currency} ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

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

function formFrom(classGroup) {
  const rules = classGroup.schedule_rules;
  return {
    name: classGroup.name,
    grade_level: classGroup.grade_level,
    capacity: classGroup.capacity ?? "",
    status: classGroup.status,
    teacher_id: String(classGroup.teacher.id),
    schedule_days: rules.map((rule) => rule.weekday),
    schedule_start_time: rules[0]?.start_time.slice(0, 5) || "16:00",
    schedule_end_time: rules[0]?.end_time.slice(0, 5) || "17:00",
  };
}

export default function ClassDetailPage() {
  const { classId } = useParams();
  const [classGroup, setClassGroup] = useState(null);
  const [form, setForm] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [roster, setRoster] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [classData, rosterData, teacherData] = await Promise.all([
        apiRequest(`classes/${classId}/`),
        apiRequest(`classes/${classId}/roster/`),
        apiRequest("teachers/?status=ACTIVE&page_size=200"),
      ]);
      setClassGroup(classData);
      setForm(formFrom(classData));
      setRoster(rosterData);
      setTeachers(resultList(teacherData).filter((teacher) => teacher.subjects.includes(classData.subject.name)));
    } catch (requestError) {
      setError(requestError.message || "Could not load this class.");
    }
  }, [classId]);

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
  const toggleDay = (day) =>
    setForm((current) => ({
      ...current,
      schedule_days: current.schedule_days.includes(day)
        ? current.schedule_days.filter((item) => item !== day)
        : [...current.schedule_days, day].sort(),
    }));

  const save = (event) => {
    event.preventDefault();
    if (form.schedule_days.length === 0) return setError("Pick at least one teaching day.");
    if (form.schedule_end_time <= form.schedule_start_time) return setError("The class must end after it starts.");
    return run(
      () =>
        apiRequest(`classes/${classId}/`, {
          method: "PATCH",
          body: {
            ...form,
            teacher_id: Number(form.teacher_id),
            capacity: form.capacity === "" ? null : Number(form.capacity),
          },
        }),
      "Class saved."
    );
  };

  if (!classGroup && !error) {
    return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading class…</p>;
  }

  return (
    <div className="space-y-6">
      <Link to="/classes" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Classes
      </Link>
      {error && <InlineAlert>{error}</InlineAlert>}
      {notice && <InlineAlert tone="success">{notice}</InlineAlert>}

      {classGroup && form && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-shuleni-navy sm:text-3xl">{classGroup.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <StatusBadge status={classGroup.status} /> {classGroup.subject.name} · {classGroup.term.name} · fee {money(classGroup.cost_amount, classGroup.currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLinkOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Video size={16} /> {classGroup.default_meeting_url ? "Change meeting link" : "Set meeting link"}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Section title="Class details">
              <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                <FormField label="Class name" htmlFor="class-detail-name" required>
                  <input id="class-detail-name" required value={form.name} onChange={update("name")} className={inputClassName} />
                </FormField>
                <FormField label="Grade level" htmlFor="class-detail-grade" required>
                  <input id="class-detail-grade" required value={form.grade_level} onChange={update("grade_level")} className={inputClassName} />
                </FormField>
                <FormField label="Teacher" htmlFor="class-detail-teacher" required hint={`Teachers of ${classGroup.subject.name}.`}>
                  <select id="class-detail-teacher" value={form.teacher_id} onChange={update("teacher_id")} className={inputClassName}>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.display_name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Capacity" htmlFor="class-detail-capacity" hint="Blank for no limit.">
                  <input id="class-detail-capacity" type="number" min={roster.length || 1} value={form.capacity} onChange={update("capacity")} className={inputClassName} />
                </FormField>
                <FormField label="Status" htmlFor="class-detail-status" hint="Paused or ended classes leave the public catalogue.">
                  <select id="class-detail-status" value={form.status} onChange={update("status")} className={inputClassName}>
                    {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </FormField>
                <div />
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-medium text-slate-700">Timetable</legend>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((label, day) => (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={form.schedule_days.includes(day)}
                        onClick={() => toggleDay(day)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${form.schedule_days.includes(day) ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <FormField label="Starts at" htmlFor="class-detail-start" required>
                      <input id="class-detail-start" type="time" value={form.schedule_start_time} onChange={update("schedule_start_time")} className={inputClassName} />
                    </FormField>
                    <FormField label="Ends at" htmlFor="class-detail-end" required>
                      <input id="class-detail-end" type="time" value={form.schedule_end_time} onChange={update("schedule_end_time")} className={inputClassName} />
                    </FormField>
                  </div>
                </fieldset>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                    {isSaving && <Loader2 size={16} className="animate-spin" />} Save class
                  </button>
                </div>
              </form>
            </Section>

            <Section title={`Roster (${roster.length}${classGroup.capacity ? `/${classGroup.capacity}` : ""})`}>
              {roster.length === 0 ? (
                <p className="text-sm text-slate-500">No students enrolled. Assign them from the Students page.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {roster.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <Link to={`/students/${entry.student.id}`} className="font-medium text-slate-900 hover:underline">{entry.student.name}</Link>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          {entry.student.grade_level} · <StatusBadge status={entry.financial_status} /> {money(entry.balance_due, classGroup.currency)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          window.confirm(`Withdraw ${entry.student.name} from ${classGroup.name}?`) &&
                          run(() => apiRequest(`classes/${classId}/withdraw/`, { method: "POST", body: { enrollment_id: entry.id } }), `${entry.student.name} withdrawn.`)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Withdraw
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}

      <MeetingLinkModal
        classGroup={isLinkOpen ? classGroup : null}
        endpoint="admin"
        onClose={() => setIsLinkOpen(false)}
        onUpdated={() => {
          setNotice("Meeting link saved.");
          load();
        }}
      />
    </div>
  );
}
