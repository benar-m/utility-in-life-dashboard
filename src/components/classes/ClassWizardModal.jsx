import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { apiRequest, resultList } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

const weekdays = [
  [0, "Mon"],
  [1, "Tue"],
  [2, "Wed"],
  [3, "Thu"],
  [4, "Fri"],
  [5, "Sat"],
  [6, "Sun"],
];

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialForm() {
  const startsOn = new Date();
  const endsOn = new Date();
  endsOn.setDate(endsOn.getDate() + 90);
  return {
    name: "",
    subject_name: "",
    grade_level: "",
    capacity: "",
    teacher_id: "",
    term_name: "",
    term_starts_on: isoDate(startsOn),
    term_ends_on: isoDate(endsOn),
    default_meeting_url: "",
    schedule_days: [],
    schedule_start_time: "16:00",
    schedule_end_time: "17:00",
    student_ids: [],
  };
}

const steps = ["Class details", "Teacher & term", "Timetable & students"];

export default function ClassWizardModal({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingOptions(true);
    setError("");
    Promise.all([
      apiRequest("teachers/?page_size=200"),
      apiRequest("students/?status=ACTIVE&page_size=200"),
      apiRequest("subjects/"),
    ])
      .then(([teacherPayload, studentPayload, subjectPayload]) => {
        setTeachers(resultList(teacherPayload));
        setStudents(resultList(studentPayload));
        setSubjects(resultList(subjectPayload));
      })
      .catch((requestError) => setError(requestError.message || "Could not load class options."))
      .finally(() => setIsLoadingOptions(false));
  }, [isOpen]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setStep(0);
    setForm(initialForm());
    setError("");
    onClose();
  };

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      schedule_days: current.schedule_days.includes(day)
        ? current.schedule_days.filter((item) => item !== day)
        : [...current.schedule_days, day],
    }));
  };

  const toggleStudent = (studentId) => {
    setForm((current) => ({
      ...current,
      student_ids: current.student_ids.includes(studentId)
        ? current.student_ids.filter((item) => item !== studentId)
        : [...current.student_ids, studentId],
    }));
  };

  const nextStep = () => {
    setError("");
    if (step === 0 && (!form.name || !form.subject_name || !form.grade_level)) {
      setError("Complete the class name, subject, and grade level.");
      return;
    }
    if (
      step === 1 &&
      (!form.teacher_id || !form.term_name || !form.term_starts_on || !form.term_ends_on)
    ) {
      setError("Select a teacher and complete the academic term.");
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.schedule_days.length === 0) {
      setError("Select at least one teaching day.");
      return;
    }
    if (form.schedule_end_time <= form.schedule_start_time) {
      setError("The class end time must be after its start time.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest("classes/", {
        method: "POST",
        body: {
          ...form,
          capacity: form.capacity ? Number(form.capacity) : null,
        },
      });
      setForm(initialForm());
      setStep(0);
      onCreated();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not create the class.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create a class"
      description="Set up the class, assign a teacher, choose the timetable, and enroll students."
      size="xl"
    >
      <div className="border-b border-slate-100 px-6 py-4">
        <ol className="grid grid-cols-3 gap-2" aria-label="Class creation progress">
          {steps.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  index <= step ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {index < step ? <Check size={14} /> : index + 1}
              </span>
              <span className={`hidden text-xs font-medium sm:block ${index <= step ? "text-slate-800" : "text-slate-400"}`}>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="min-h-[22rem] space-y-5 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          {isLoadingOptions ? (
            <div className="flex h-56 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading class options…
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Class name" htmlFor="class-name" required>
                    <input
                      id="class-name"
                      required
                      value={form.name}
                      onChange={update("name")}
                      placeholder="Grade 6 Mathematics"
                      className={inputClassName}
                    />
                  </FormField>
                  <FormField label="Subject" htmlFor="class-subject" required>
                    <input
                      id="class-subject"
                      list="subject-options"
                      required
                      value={form.subject_name}
                      onChange={update("subject_name")}
                      placeholder="Mathematics"
                      className={inputClassName}
                    />
                    <datalist id="subject-options">
                      {subjects.map((subject) => <option key={subject.id} value={subject.name} />)}
                    </datalist>
                  </FormField>
                  <FormField label="Grade level" htmlFor="class-grade" required>
                    <input
                      id="class-grade"
                      required
                      value={form.grade_level}
                      onChange={update("grade_level")}
                      placeholder="Grade 6"
                      className={inputClassName}
                    />
                  </FormField>
                  <FormField label="Capacity" htmlFor="class-capacity" hint="Leave blank for no limit.">
                    <input
                      id="class-capacity"
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={update("capacity")}
                      className={inputClassName}
                    />
                  </FormField>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Teacher" htmlFor="class-teacher" required>
                    <select
                      id="class-teacher"
                      required
                      value={form.teacher_id}
                      onChange={update("teacher_id")}
                      className={inputClassName}
                    >
                      <option value="">Select teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.display_name} · {teacher.subjects.join(", ")}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Term name" htmlFor="class-term" required>
                    <input
                      id="class-term"
                      required
                      value={form.term_name}
                      onChange={update("term_name")}
                      placeholder="Term 3 2026"
                      className={inputClassName}
                    />
                  </FormField>
                  <FormField label="Term starts" htmlFor="term-start" required>
                    <input
                      id="term-start"
                      type="date"
                      required
                      value={form.term_starts_on}
                      onChange={update("term_starts_on")}
                      className={inputClassName}
                    />
                  </FormField>
                  <FormField label="Term ends" htmlFor="term-end" required>
                    <input
                      id="term-end"
                      type="date"
                      min={form.term_starts_on}
                      required
                      value={form.term_ends_on}
                      onChange={update("term_ends_on")}
                      className={inputClassName}
                    />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label="Meeting link" htmlFor="meeting-url" hint="Optional now; HTTPS links only.">
                      <input
                        id="meeting-url"
                        type="url"
                        pattern="https://.*"
                        value={form.default_meeting_url}
                        onChange={update("default_meeting_url")}
                        placeholder="https://meet.google.com/..."
                        className={inputClassName}
                      />
                    </FormField>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-slate-700">Teaching days</legend>
                    <div className="flex flex-wrap gap-2">
                      {weekdays.map(([day, label]) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                            form.schedule_days.includes(day)
                              ? "border-brand-500 bg-brand-50 text-brand-700"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Starts at" htmlFor="schedule-start" required>
                      <input
                        id="schedule-start"
                        type="time"
                        required
                        value={form.schedule_start_time}
                        onChange={update("schedule_start_time")}
                        className={inputClassName}
                      />
                    </FormField>
                    <FormField label="Ends at" htmlFor="schedule-end" required>
                      <input
                        id="schedule-end"
                        type="time"
                        required
                        value={form.schedule_end_time}
                        onChange={update("schedule_end_time")}
                        className={inputClassName}
                      />
                    </FormField>
                  </div>
                  <fieldset>
                    <legend className="text-sm font-medium text-slate-700">Enroll students</legend>
                    <p className="mb-2 mt-1 text-xs text-slate-500">Optional; students can be assigned later.</p>
                    {students.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        No active students are available yet.
                      </p>
                    ) : (
                      <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                        {students.map((student) => (
                          <label key={student.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={form.student_ids.includes(student.id)}
                              onChange={() => toggleStudent(student.id)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-600"
                            />
                            <span className="text-slate-700">{student.full_name}</span>
                            <span className="ml-auto text-xs text-slate-400">{student.grade_level}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={step === 0 ? handleClose : () => setStep((current) => current - 1)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {step > 0 && <ChevronLeft size={16} />}
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={isLoadingOptions}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || isLoadingOptions}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Create class
            </button>
          )}
        </footer>
      </form>
    </Modal>
  );
}
