import { useState } from "react";
import { BookOpenCheck, Coins, Link, Link2, Megaphone, Plus } from "lucide-react";
import ClassWizardModal from "../components/classes/ClassWizardModal.jsx";
import ClassCostModal from "../components/classes/ClassCostModal.jsx";
import EnrollmentLinkModal from "../components/classes/EnrollmentLinkModal.jsx";
import CampaignFormModal from "../components/campaigns/CampaignFormModal.jsx";
import ActionMenu from "../components/common/ActionMenu.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import useApiCollection from "../hooks/useApiCollection.js";

const columnLabels = ["Class", "Teacher", "Schedule", "Cost", "Meeting", "Enrolled", "Status", ""];

function scheduleText(rules) {
  if (!rules?.length) return "Not scheduled";
  const days = rules.map((rule) => rule.weekday_label.slice(0, 3)).join(", ");
  return `${days} · ${rules[0].start_time.slice(0, 5)}–${rules[0].end_time.slice(0, 5)}`;
}

export default function ClassesPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [classForLink, setClassForLink] = useState(null);
  const [classForCost, setClassForCost] = useState(null);
  const { items: classes, isLoading, error, reload } = useApiCollection("classes/?page_size=100");

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Scheduled class groups, teachers, enrollments, and meeting-link readiness."
        actionSlot={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsCampaignOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Megaphone size={16} />
              Create campaign
            </button>
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus size={16} />
              Create class
            </button>
          </div>
        }
      />

      {error && <InlineAlert>{error}</InlineAlert>}
      {isLoading ? (
        <TableSkeleton columnLabels={columnLabels} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="No classes scheduled"
          description="Create a class, assign a qualified teacher, set its timetable, and enroll students."
          primaryActionLabel="Create class"
          onPrimaryAction={() => setIsWizardOpen(true)}
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
                    {scheduleText(classGroup.schedule_rules)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {classGroup.cost_amount === null
                      ? "Not set"
                      : `${classGroup.currency} ${Number(classGroup.cost_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      classGroup.default_meeting_url ? "text-brand-700" : "text-amber-600"
                    }`}>
                      <Link2 size={14} />
                      {classGroup.default_meeting_url ? "Ready" : "Missing"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{classGroup.enrolled_count}</td>
                  <td className="px-4 py-3"><StatusBadge status={classGroup.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <ActionMenu
                      label={`Actions for ${classGroup.name}`}
                      items={[
                        {
                          label: "Copy enrollment link",
                          icon: Link,
                          onSelect: () => setClassForLink(classGroup),
                        },
                        {
                          label: "Set cost",
                          icon: Coins,
                          onSelect: () => setClassForCost(classGroup),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClassWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={reload}
      />
      <CampaignFormModal
        isOpen={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
      />
      <EnrollmentLinkModal
        classGroup={classForLink}
        onClose={() => setClassForLink(null)}
      />
      <ClassCostModal
        classGroup={classForCost}
        onClose={() => setClassForCost(null)}
        onUpdated={reload}
      />
    </div>
  );
}
