import { BookOpenCheck, Clock3, Video } from "lucide-react";
import EmptyState from "../../components/common/EmptyState.jsx";
import InlineAlert from "../../components/common/InlineAlert.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import TableSkeleton from "../../components/common/TableSkeleton.jsx";
import useApiCollection from "../../hooks/useApiCollection.js";

const columns = ["Class", "Teacher", "Schedule", "Balance", "Attend"];

function scheduleText(rules) {
  if (!rules?.length) return "Not scheduled";
  const days = rules.map((rule) => rule.weekday_label.slice(0, 3)).join(", ");
  return `${days} · ${rules[0].start_time.slice(0, 5)}–${rules[0].end_time.slice(0, 5)}`;
}

export default function StudentClassesPage() {
  const { items: classes, isLoading, error } = useApiCollection(
    "portal/student/classes/?page_size=100"
  );

  return (
    <div>
      <PageHeader
        title="My classes"
        description="Only classes where your student record has an active enrollment are shown."
      />
      {error && <InlineAlert>{error}</InlineAlert>}
      <InlineAlert tone="success">
        You can view and pay invoices from Payments. An overdue restriction may pause class attendance while payment access remains open.
      </InlineAlert>
      <div className="mt-4">
        {isLoading ? (
          <TableSkeleton columnLabels={columns} />
        ) : classes.length === 0 ? (
          <EmptyState
            icon={BookOpenCheck}
            title="No active classes"
            description="An administrator must enroll your student record into a class before it appears here."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-medium">{column}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((classGroup) => (
                  <tr key={classGroup.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{classGroup.name}</p>
                      <p className="text-xs text-slate-400">
                        {classGroup.subject.name} · {classGroup.grade_level} · {classGroup.term.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{classGroup.teacher.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={14} />
                        {scheduleText(classGroup.schedule_rules)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={classGroup.financial_status} />
                      {classGroup.balance_due !== null && (
                        <p className="mt-1 text-xs text-slate-500">
                          {classGroup.currency} {Number(classGroup.balance_due).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled
                        title={classGroup.access_restricted ? classGroup.restriction_reason : "Attend opens when dated lesson sessions are implemented."}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${classGroup.access_restricted ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-400"}`}
                      >
                        <Video size={13} />
                        {classGroup.access_restricted ? "Restricted" : classGroup.meeting_ready ? "Attend not open" : "Link pending"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
