import { useEffect, useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { apiRequest, resultList } from "../../api/client.js";
import { isoDate, shortDate } from "../../components/charts/DateRangeFilter.jsx";
import { ATTENDANCE_COLORS } from "../../components/charts/palette.js";
import InlineAlert from "../../components/common/InlineAlert.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";

const STATUSES = [
  ["PRESENT", "Present", ATTENDANCE_COLORS.present],
  ["LATE", "Late", ATTENDANCE_COLORS.late],
  ["ABSENT", "Absent", ATTENDANCE_COLORS.absent],
  ["EXCUSED", "Excused", ATTENDANCE_COLORS.excused],
];

// Most recent date (today or earlier) on which the class meets.
function lastLessonDate(classGroup) {
  const days = classGroup.schedule_rules.map((rule) => rule.weekday);
  const date = new Date();
  for (let i = 0; i < 7 && days.length; i += 1) {
    if (days.includes((date.getDay() + 6) % 7)) break;
    date.setDate(date.getDate() - 1);
  }
  return isoDate(date);
}

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [lessonDate, setLessonDate] = useState(isoDate(new Date()));
  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiRequest("portal/teacher/classes/?status=ACTIVE&page_size=100")
      .then((data) => {
        const list = resultList(data);
        setClasses(list);
        if (list[0]) {
          setClassId(String(list[0].id));
          setLessonDate(lastLessonDate(list[0]));
        }
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    if (!classId) return;
    setNotice("");
    apiRequest(`portal/teacher/classes/${classId}/attendance/?date=${lessonDate}`)
      .then((data) => {
        setSheet(data);
        setMarks(Object.fromEntries(data.students.map((row) => [row.student_id, row.status])));
        setError("");
      })
      .catch((requestError) => setError(requestError.message));
  }, [classId, lessonDate]);

  const unmarked = sheet ? sheet.students.filter((row) => !marks[row.student_id]).length : 0;

  const save = async () => {
    setIsSaving(true);
    setError("");
    try {
      const data = await apiRequest(`portal/teacher/classes/${classId}/attendance/`, {
        method: "POST",
        body: {
          lesson_date: lessonDate,
          records: sheet.students.filter((row) => marks[row.student_id]).map((row) => ({ student_id: row.student_id, status: marks[row.student_id] })),
        },
      });
      setSheet(data);
      setNotice(`Attendance saved for ${shortDate(lessonDate, true)}.`);
    } catch (requestError) {
      setError(requestError.message || "Could not save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Take attendance" description="Mark each student for a lesson. You can come back and correct it later." />
      <div className="mb-5 flex flex-wrap gap-3">
        <select
          aria-label="Class"
          value={classId}
          onChange={(event) => {
            setClassId(event.target.value);
            const chosen = classes.find((item) => String(item.id) === event.target.value);
            if (chosen) setLessonDate(lastLessonDate(chosen));
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        >
          {classes.map((classGroup) => <option key={classGroup.id} value={classGroup.id}>{classGroup.name}</option>)}
        </select>
        <input
          type="date"
          aria-label="Lesson date"
          value={lessonDate}
          max={isoDate(new Date())}
          onChange={(event) => event.target.value && setLessonDate(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        />
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      {notice && <InlineAlert tone="success">{notice}</InlineAlert>}
      {classes.length === 0 && !error && <p className="text-sm text-slate-500">You don't have any active classes yet.</p>}

      {sheet && (
        <section className="rounded-2xl border border-slate-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div>
              <h2 className="font-display text-base font-bold text-shuleni-navy">{sheet.class_name}</h2>
              <p className="text-xs text-slate-500">
                {shortDate(lessonDate, true)}
                {!sheet.is_scheduled_day && " · not a usual lesson day"}
                {sheet.is_recorded && " · already recorded"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMarks(Object.fromEntries(sheet.students.map((row) => [row.student_id, "PRESENT"])))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <CheckCheck size={16} /> Mark everyone present
            </button>
          </header>
          {sheet.students.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">No students are enrolled in this class.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sheet.students.map((row) => (
                <li key={row.student_id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-slate-800">{row.name}</span>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Attendance for ${row.name}`}>
                    {STATUSES.map(([value, label, color]) => {
                      const isOn = marks[row.student_id] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={isOn}
                          onClick={() => setMarks((current) => ({ ...current, [row.student_id]: value }))}
                          className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                            isOn ? "border-transparent text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                          style={isOn ? { background: color, color: value === "LATE" || value === "EXCUSED" ? "#1e293b" : "#fff" } : undefined}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <span className="text-sm text-slate-500">{unmarked ? `${unmarked} not marked yet` : "Everyone marked"}</span>
            <button
              type="button"
              onClick={save}
              disabled={isSaving || sheet.students.length === unmarked}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />} Save attendance
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
