import { useEffect, useState } from "react";
import { FileText, Pencil, Plus } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import EmptyState from "../../components/common/EmptyState.jsx";
import InlineAlert from "../../components/common/InlineAlert.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import ResourceFormModal from "../../components/resources/ResourceFormModal.jsx";
import useApiCollection from "../../hooks/useApiCollection.js";
import { useAuth } from "../../context/AuthContext.jsx";

// Teachers share notes and papers for the subjects they teach.
export default function TeacherResourcesPage() {
  const { items: resources, isLoading, error, reload } = useApiCollection("portal/teacher/resources/?page_size=100");
  const [subjects, setSubjects] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toEdit, setToEdit] = useState(null);
  const { currentUser } = useAuth();

  // Only the teacher's own subjects are offered.
  useEffect(() => {
    Promise.all([apiRequest("subjects/"), apiRequest("portal/teacher/classes/?page_size=100")])
      .then(([allSubjects, classes]) => {
        const taught = new Set((classes.results || classes).map((classGroup) => classGroup.subject?.id ?? classGroup.subject));
        const list = allSubjects.results || allSubjects;
        setSubjects(taught.size ? list.filter((subject) => taught.has(subject.id) || taught.has(subject.name)) : list);
      })
      .catch(() => {});
  }, [currentUser]);

  return (
    <div>
      <PageHeader
        title="My resources"
        description="Notes and past papers for your subjects. Students in your classes can open them from their portal."
        actionSlot={
          <button type="button" onClick={() => setIsOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <Plus size={16} /> Add resource
          </button>
        }
      />
      {error && <InlineAlert>{error}</InlineAlert>}
      {!isLoading && resources.length === 0 ? (
        <EmptyState icon={FileText} title="No resources yet" description="Add notes or a past paper as an https link (for example a shared Google Drive file)." primaryActionLabel="Add resource" onPrimaryAction={() => setIsOpen(true)} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <li key={resource.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{resource.resource_type_label}</p>
              <h3 className="mt-2 font-display text-lg font-bold text-shuleni-navy">{resource.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{[resource.subject?.name, resource.grade_level].filter(Boolean).join(" · ")}</p>
              <div className="mt-auto flex items-center justify-between pt-4">
                <StatusBadge status={resource.is_published ? "ACTIVE" : "DRAFT"} />
                <button type="button" onClick={() => setToEdit(resource)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                  <Pencil size={14} /> Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ResourceFormModal
        isOpen={isOpen || Boolean(toEdit)}
        resource={toEdit}
        subjects={subjects}
        endpoint="portal/teacher/resources/"
        onClose={() => {
          setIsOpen(false);
          setToEdit(null);
        }}
        onCreated={reload}
      />
    </div>
  );
}
