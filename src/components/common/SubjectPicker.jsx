import { useEffect, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { apiRequest, resultList } from "../../api/client.js";
import { inputClassName } from "./FormField.jsx";

// Choose from existing subjects so near-duplicates ("maths" vs "Mathematics") never appear.
// New subjects are added deliberately; the API returns the existing one if the name matches.
// `value` is a list of subject names (multiple) or a single name.
export default function SubjectPicker({ value, onChange, multiple = false, id }) {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const selected = multiple ? value : value ? [value] : [];

  useEffect(() => {
    apiRequest("subjects/")
      .then((payload) => setSubjects(resultList(payload)))
      .catch(() => setError("Could not load subjects."))
      .finally(() => setIsLoading(false));
  }, []);

  const toggle = (name) => {
    if (!multiple) return onChange(name === value ? "" : name);
    return onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name]);
  };

  const addSubject = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsAdding(true);
    setError("");
    try {
      const subject = await apiRequest("subjects/", { method: "POST", body: { name } });
      setSubjects((current) =>
        current.some((item) => item.id === subject.id) ? current : [...current, subject].sort((a, b) => a.name.localeCompare(b.name))
      );
      if (!selected.includes(subject.name)) toggle(subject.name);
      setNewName("");
    } catch (requestError) {
      setError(requestError.message || "Could not add the subject.");
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) return <p className="text-sm text-slate-500">Loading subjects…</p>;

  return (
    <div id={id}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Subjects">
        {subjects.map((subject) => {
          const isOn = selected.includes(subject.name);
          return (
            <button
              key={subject.id}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(subject.name)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                isOn ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
              }`}
            >
              {isOn && <Check size={14} aria-hidden="true" />}
              {subject.name}
            </button>
          );
        })}
        {subjects.length === 0 && <p className="text-sm text-slate-500">No subjects yet. Add the first one below.</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSubject();
            }
          }}
          placeholder="Not listed? Add a subject"
          aria-label="New subject name"
          className={inputClassName}
        />
        <button
          type="button"
          onClick={addSubject}
          disabled={isAdding || !newName.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isAdding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
