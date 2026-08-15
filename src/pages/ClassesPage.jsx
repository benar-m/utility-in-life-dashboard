import { BookOpenCheck, Plus } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

const classColumnLabels = ["Class", "Teacher", "Schedule", "Class link", "Enrolled"];

export default function ClassesPage() {
  const hasClassRecords = false;

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Scheduled classes and their online meeting links."
        actionSlot={
          <button
            type="button"
            disabled
            title="Available once this module is connected to the API"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white opacity-60"
          >
            <Plus size={16} />
            Create class
          </button>
        }
      />

      {hasClassRecords ? (
        <TableSkeleton columnLabels={classColumnLabels} />
      ) : (
        <EmptyState
          icon={BookOpenCheck}
          title="No classes scheduled"
          description="Create a class, assign a teacher, and share the join link with enrolled students."
          primaryActionLabel="Create class"
        />
      )}
    </div>
  );
}
