import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest, resultList } from "../../api/client.js";
import FormField, { inputClassName } from "../common/FormField.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import Modal from "../common/Modal.jsx";

export default function AssignStudentModal({ student, onClose, onAssigned }) {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!student) return;
    setClassId("");
    setError("");
    setIsLoading(true);
    apiRequest("classes/?status=ACTIVE&page_size=200")
      .then((payload) => setClasses(resultList(payload)))
      .catch((requestError) => setError(requestError.message || "Could not load classes."))
      .finally(() => setIsLoading(false));
  }, [student]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest(`students/${student.id}/assign/`, {
        method: "POST",
        body: { class_id: Number(classId) },
      });
      await onAssigned();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Could not assign the student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(student)}
      onClose={onClose}
      title="Assign to a class"
      description={student ? `Add ${student.full_name} to an active class.` : ""}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <FormField label="Class" htmlFor="student-class" required>
            <select
              id="student-class"
              required
              disabled={isLoading}
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className={inputClassName}
            >
              <option value="">{isLoading ? "Loading classes…" : "Select class"}</option>
              {classes.map((classGroup) => (
                <option key={classGroup.id} value={classGroup.id}>
                  {classGroup.name} · {classGroup.enrolled_count}
                  {classGroup.capacity ? `/${classGroup.capacity}` : ""} enrolled
                </option>
              ))}
            </select>
          </FormField>
          <InlineAlert tone="success">
            If this class has a cost, the new enrollment receives a pending balance. Access is not blocked by that balance.
          </InlineAlert>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSubmitting || isLoading} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Assign student
          </button>
        </footer>
      </form>
    </Modal>
  );
}
