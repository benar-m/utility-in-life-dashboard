import { useState } from "react";
import { GraduationCap, Plus } from "lucide-react";
import EmptyState from "../components/common/EmptyState.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import TeacherFormModal from "../components/teachers/TeacherFormModal.jsx";
import useApiCollection from "../hooks/useApiCollection.js";

const columnLabels = ["Teacher", "Subjects", "Assigned classes", "Status", "Contact"];

export default function TeachersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { items: teachers, isLoading, error, reload } = useApiCollection("teachers/?page_size=100");

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Teacher profiles, subject assignments, and class allocations."
        actionSlot={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            Invite teacher
          </button>
        }
      />

      {error && <InlineAlert>{error}</InlineAlert>}
      {isLoading ? (
        <TableSkeleton columnLabels={columnLabels} />
      ) : teachers.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No teachers added yet"
          description="Invite a teacher and record their subjects before creating classes."
          primaryActionLabel="Invite teacher"
          onPrimaryAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columnLabels.map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{teacher.display_name}</p>
                    <p className="text-xs text-slate-400">{teacher.account_email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{teacher.subjects.join(", ")}</td>
                  <td className="px-4 py-3 text-slate-600">{teacher.assigned_classes}</td>
                  <td className="px-4 py-3"><StatusBadge status={teacher.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{teacher.account_phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TeacherFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={reload}
      />
    </div>
  );
}
