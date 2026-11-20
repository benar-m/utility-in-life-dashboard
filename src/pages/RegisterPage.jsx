import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Phone } from "lucide-react";
import { apiRequest } from "../api/client.js";
import ShuleniLogo from "../components/common/ShuleniLogo.jsx";
import useSiteInfo, { formatProgramDates } from "../hooks/useSiteInfo.js";

/*
  Public program registration (replaces the Shuleni Online Google Form).
  Options come from GET /public/registrations/options/; submissions go to
  POST /public/registrations/ and staff follow up on the Registrations page.
 */

const PHONE_PATTERN = /^(\+?254|0)[17]\d{8}$/;

const emptyForm = {
  student_name: "",
  parent_name: "",
  parent_phone: "",
  level: "",
  level_other: "",
  study_mode: "",
  subjects: [],
  subjects_other: "",
};

function validate(form) {
  const errors = {};
  if (!form.student_name.trim()) errors.student_name = "Student's name is required.";
  if (!form.parent_name.trim()) errors.parent_name = "Parent's name is required.";
  if (!form.parent_phone.trim()) {
    errors.parent_phone = "Parent's phone number is required.";
  } else if (!PHONE_PATTERN.test(form.parent_phone.replace(/[\s-]/g, ""))) {
    errors.parent_phone = "Enter a valid Kenyan phone number, e.g. 0712 345 678.";
  }
  if (!form.level) errors.level = "Select the student's level.";
  else if (form.level === "OTHER" && !form.level_other.trim()) errors.level_other = "Please specify the level.";
  if (!form.study_mode) errors.study_mode = "Select a mode of study.";
  if (form.subjects.length === 0 && !form.subjects_other.trim()) errors.subjects = "Select at least one subject.";
  return errors;
}

function FieldError({ message }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}

function Chip({ type, name, checked, onChange, children }) {
  return (
    <label
      className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-brand-300 ${
        checked
          ? "border-brand-500 bg-brand-50 font-medium text-brand-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

// Short explanations shown under each mode; the modes themselves come from the API.
const MODE_HINTS = {
  ONLINE_GROUP: "Small online classes",
  ONLINE_INDIVIDUAL: "One-on-one sessions from home",
  FACE_TO_FACE_INDIVIDUAL: "A tutor comes to you",
};

const isKnown = (options, value) => options.some((option) => option.value === value);

// Landing-page links pre-fill the form, e.g. /register?level=FORM_3&subject=CHEMISTRY&mode=ONLINE_GROUP
function prefillFrom(searchParams, options) {
  const level = searchParams.get("level");
  const subject = searchParams.get("subject");
  const mode = searchParams.get("mode");
  return {
    level: isKnown(options.levels, level) ? level : "",
    subjects: isKnown(options.subjects, subject) ? [subject] : [],
    study_mode: isKnown(options.study_modes, mode) ? mode : "",
  };
}

function useRegistrationOptions() {
  const [state, setState] = useState({ options: null, error: "" });
  useEffect(() => {
    let isMounted = true;
    apiRequest("public/registrations/options/")
      .then((options) => isMounted && setState({ options, error: "" }))
      .catch(() => isMounted && setState({ options: null, error: "The registration form could not load. Please refresh or call us." }));
    return () => {
      isMounted = false;
    };
  }, []);
  return state;
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const { contactPhone, contactPhoneIntl, program } = useSiteInfo();
  const { options, error: optionsError } = useRegistrationOptions();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (options) setForm((current) => ({ ...current, ...prefillFrom(searchParams, options) }));
  }, [options, searchParams]);

  const levelGroups = useMemo(() => {
    const groups = new Map();
    for (const level of options?.levels || []) {
      if (!level.group) continue;
      // "IGCSE Year 7" reads as "Year 7" under the IGCSE heading.
      const label = level.label.replace(/^IGCSE\s+/, "");
      groups.set(level.group, [...(groups.get(level.group) || []), { ...level, label }]);
    }
    return [...groups];
  }, [options]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const toggleSubject = (subject) =>
    setField(
      "subjects",
      form.subjects.includes(subject)
        ? form.subjects.filter((item) => item !== subject)
        : [...form.subjects, subject]
    );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setSubmitError("");
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await apiRequest("public/registrations/", {
        method: "POST",
        body: {
          ...form,
          student_name: form.student_name.trim(),
          parent_name: form.parent_name.trim(),
          level_other: form.level === "OTHER" ? form.level_other.trim() : "",
          subjects_other: form.subjects_other.trim(),
        },
      });
      setSubmittedName(form.student_name.trim());
      setForm(emptyForm);
    } catch (error) {
      const details = error.details && typeof error.details === "object" ? error.details : {};
      setErrors(
        Object.fromEntries(
          Object.entries(details)
            .filter(([field]) => field in emptyForm)
            .map(([field, value]) => [field, Array.isArray(value) ? value[0] : String(value)])
        )
      );
      setSubmitError(error.message || "Registration could not be sent. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-400 ${
      errors[field] ? "border-red-400" : "border-slate-200"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/" aria-label="Shuleni Online home" className="mb-6 flex justify-center">
          <ShuleniLogo />
        </Link>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="bg-[#12999E] px-6 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Registration</p>
            <h1 className="mt-1 text-xl font-bold">{program?.title || "Register for tuition"}</h1>
            {program && <p className="mt-1 text-sm text-white/90">{formatProgramDates(program)}</p>}
            {program?.audience && <p className="mt-0.5 text-xs text-white/80">{program.audience}</p>}
          </header>

          {submittedName ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 size={44} className="mx-auto text-brand-500" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Registration received</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
                Thank you. We have registered {submittedName} and will call the parent's number to confirm the
                schedule and fees.
              </p>
              <button
                type="button"
                onClick={() => setSubmittedName("")}
                className="mt-6 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Register another student
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6 px-6 py-6">
              {optionsError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{optionsError}</p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="student_name" className="mb-1 block text-sm font-medium text-slate-700">
                    Student's name
                  </label>
                  <input
                    id="student_name"
                    type="text"
                    value={form.student_name}
                    onChange={(event) => setField("student_name", event.target.value)}
                    placeholder="e.g. Amani Otieno"
                    className={inputClass("student_name")}
                    aria-invalid={Boolean(errors.student_name)}
                  />
                  <FieldError message={errors.student_name} />
                </div>
                <div>
                  <label htmlFor="parent_name" className="mb-1 block text-sm font-medium text-slate-700">
                    Parent's name
                  </label>
                  <input
                    id="parent_name"
                    type="text"
                    autoComplete="name"
                    value={form.parent_name}
                    onChange={(event) => setField("parent_name", event.target.value)}
                    className={inputClass("parent_name")}
                    aria-invalid={Boolean(errors.parent_name)}
                  />
                  <FieldError message={errors.parent_name} />
                </div>
                <div>
                  <label htmlFor="parent_phone" className="mb-1 block text-sm font-medium text-slate-700">
                    Parent's phone number
                  </label>
                  <input
                    id="parent_phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={form.parent_phone}
                    onChange={(event) => setField("parent_phone", event.target.value)}
                    placeholder="0712 345 678"
                    className={inputClass("parent_phone")}
                    aria-invalid={Boolean(errors.parent_phone)}
                  />
                  <FieldError message={errors.parent_phone} />
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">Level of student</legend>
                <div className="space-y-3">
                  {levelGroups.map(([group, levels]) => (
                    <div key={group}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {group}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {levels.map(({ value, label }) => (
                          <Chip
                            key={value}
                            type="radio"
                            name="level"
                            checked={form.level === value}
                            onChange={() => setField("level", value)}
                          >
                            {label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip type="radio" name="level" checked={form.level === "OTHER"} onChange={() => setField("level", "OTHER")}>
                      Other
                    </Chip>
                    {form.level === "OTHER" && (
                      <input
                        type="text"
                        aria-label="Specify level"
                        value={form.level_other}
                        onChange={(event) => setField("level_other", event.target.value)}
                        placeholder="Specify level"
                        className={`flex-1 ${inputClass("level_other")}`}
                      />
                    )}
                  </div>
                </div>
                <FieldError message={errors.level || errors.level_other} />
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">Mode of study</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(options?.study_modes || []).map(({ value, label }) => (
                    <Chip
                      key={value}
                      type="radio"
                      name="study_mode"
                      checked={form.study_mode === value}
                      onChange={() => setField("study_mode", value)}
                    >
                      <span className="block">{label}</span>
                      {MODE_HINTS[value] && <span className="block text-xs font-normal text-slate-500">{MODE_HINTS[value]}</span>}
                    </Chip>
                  ))}
                </div>
                <FieldError message={errors.study_mode} />
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">
                  Subjects of study <span className="font-normal text-slate-400">(tick all that apply)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(options?.subjects || []).map(({ value, label }) => (
                    <Chip
                      key={value}
                      type="checkbox"
                      name="subjects"
                      checked={form.subjects.includes(value)}
                      onChange={() => toggleSubject(value)}
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
                <input
                  type="text"
                  aria-label="Other subjects"
                  value={form.subjects_other}
                  onChange={(event) => setField("subjects_other", event.target.value)}
                  placeholder="Other subjects (optional)"
                  className={`mt-2 ${inputClass("subjects_other")}`}
                />
                <FieldError message={errors.subjects} />
              </fieldset>

              {submitError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !options}
                className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting…" : "Submit registration"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center gap-2 text-xs text-slate-500">
          {contactPhone && (
            <a href={`tel:${contactPhoneIntl}`} className="inline-flex items-center gap-1.5 hover:text-slate-700">
              <Phone size={13} aria-hidden="true" /> Questions? Call {contactPhone}
            </a>
          )}
          <p>
            Already registered?{" "}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
