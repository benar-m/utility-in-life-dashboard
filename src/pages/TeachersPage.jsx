import { GraduationCap, Plus } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

const teacherColumnLabels = ["Teacher", "Subjects", "Assigned classes", "Status", "Earnings (MTD)"];

export default function TeachersPage() {
  const hasTeacherRecords = false;

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Teacher profiles, subject assignments, and class allocations."
        actionSlot={
          <button
            type="button"
            disabled
            title="Available once this module is connected to the API"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white opacity-60"
          >
            <Plus size={16} />
            Add teacher
          </button>
        }
      />

      {hasTeacherRecords ? (
        <TableSkeleton columnLabels={teacherColumnLabels} />
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="No teachers added yet"
          description="Add a teacher profile to start assigning classes and tracking their earnings."
          primaryActionLabel="Add teacher"
        />
      )}
    </div>
  );
}
