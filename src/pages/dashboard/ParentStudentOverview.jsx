import { CalendarDays, Wallet, TrendingUp } from "lucide-react";
import StatCard from "../../components/common/StatCard.jsx";
import ModuleCard from "../../components/common/ModuleCard.jsx";
import { allModules, getLabelForRole, getDescriptionForRole, ROLES } from "../../config/navigation.js";

const summaryStats = [
  { id: "next-class", label: "Next class", value: "—", helperText: "Awaiting data", icon: CalendarDays, tone: "brand" },
  { id: "balance", label: "Fee balance", value: "KES —", helperText: "Awaiting data", icon: Wallet, tone: "amber" },
  { id: "progress", label: "Attendance rate", value: "—", helperText: "Awaiting data", icon: TrendingUp, tone: "slate" },
];

const parentStudentModules = allModules.filter(
  (module) => module.roles.includes(ROLES.PARENT_STUDENT) && module.id !== "dashboard"
);

export default function ParentStudentOverview() {
  return (
    <div>
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryStats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </section>

      <section aria-label="Upcoming classes" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Upcoming classes</h2>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Upcoming lessons and their join links will appear here once classes are scheduled.
        </div>
      </section>

      <section aria-label="Modules" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parentStudentModules.map((module) => (
            <ModuleCard
              key={module.id}
              path={module.path}
              label={getLabelForRole(module, ROLES.PARENT_STUDENT)}
              description={getDescriptionForRole(module, ROLES.PARENT_STUDENT)}
              icon={module.icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
