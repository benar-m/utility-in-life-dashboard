import { useState } from "react";
import { BookOpenCheck, Link2, Pencil } from "lucide-react";
import EmptyState from "../../components/common/EmptyState.jsx";
import InlineAlert from "../../components/common/InlineAlert.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import TableSkeleton from "../../components/common/TableSkeleton.jsx";
import MeetingLinkModal from "../../components/teachers/MeetingLinkModal.jsx";
import useApiCollection from "../../hooks/useApiCollection.js";

const columns = ["Class", "Schedule", "Learners", "Meeting link", "Status"];

function scheduleText(rules) {
  if (!rules?.length) return "Not scheduled";
  const days = rules.map((rule) => rule.weekday_label.slice(0, 3)).join(", ");
  return `${days} · ${rules[0].start_time.slice(0, 5)}–${rules[0].end_time.slice(0, 5)}`;
}

export default function TeacherClassesPage() {
  const [selectedClass, setSelectedClass] = useState(null);
  const { items: classes, isLoading, error, reload } = useApiCollection(
    "portal/teacher/classes/?page_size=100"
  );

  return (
    <div>
      <PageHeader
        title="My classes"
        description="Only classes assigned to you are shown. Manage links and review each active roster."
      />
      {error && <InlineAlert>{error}</InlineAlert>}
      {isLoading ? (
        <TableSkeleton columnLabels={columns} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="No classes assigned"
          description="An administrator must assign you as the primary teacher before a class appears here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-medium">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map((classGroup) => (
                <tr key={classGroup.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{classGroup.name}</p>
                    <p className="text-xs text-slate-400">
                      {classGroup.subject.name} · {classGroup.grade_level} · {classGroup.term.name}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {scheduleText(classGroup.schedule_rules)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{classGroup.enrolled_count}</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-400">
                      {classGroup.roster.map((student) => student.full_name).join(", ") || "No active learners"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedClass(classGroup)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {classGroup.default_meeting_url ? <Pencil size={13} /> : <Link2 size={13} />}
                      {classGroup.default_meeting_url ? "Update link" : "Add link"}
                    </button>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={classGroup.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <MeetingLinkModal
        classGroup={selectedClass}
        onClose={() => setSelectedClass(null)}
        onUpdated={reload}
      />
    </div>
  );
}
