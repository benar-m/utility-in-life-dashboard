import { Users, Plus } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

const studentColumnLabels = ["Student", "Parent/Guardian", "Grade", "Status", "Joined"];

export default function StudentsPage() {
  const hasStudentRecords = false; // flip once GET /api/students is wired up

  return (
    <div>
      <PageHeader
        title="Students"
        description="Student registrations and records, submitted by parents and reviewed by admins."
        actionSlot={
          <button
            type="button"
            disabled
            title="Available once this module is connected to the API"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white opacity-60"
          >
            <Plus size={16} />
            Add student
          </button>
        }
      />

      {hasStudentRecords ? (
        <TableSkeleton columnLabels={studentColumnLabels} />
      ) : (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Once parents register their children, or an admin adds a student manually, they'll show up here."
          primaryActionLabel="Add student"
        />
      )}
    </div>
  );
}
