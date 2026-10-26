import { Users, Wallet, ClipboardCheck } from "lucide-react";
import StatCard from "../../components/common/StatCard.jsx";
import ModuleCard from "../../components/common/ModuleCard.jsx";
import { allModules, getLabelForRole, getDescriptionForRole, ROLES } from "../../config/navigation.js";

const summaryStats = [
  { id: "classes-today", label: "Classes today", value: "—", helperText: "Awaiting data", icon: ClipboardCheck, tone: "brand" },
  { id: "students", label: "My students", value: "—", helperText: "Awaiting data", icon: Users, tone: "slate" },
  { id: "earnings", label: "Earnings this month", value: "KES —", helperText: "Awaiting data", icon: Wallet, tone: "amber" },
];

const teacherModules = allModules.filter(
  (module) => module.roles.includes(ROLES.TEACHER) && module.id !== "dashboard"
);

export default function TeacherOverview() {
  return (
    <div>
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryStats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </section>

      <section aria-label="Today's schedule" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Today's schedule</h2>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Your classes for today will appear here, with a one-tap link to open the class
          and mark attendance once scheduling is connected.
        </div>
      </section>

      <section aria-label="Modules" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teacherModules.map((module) => (
            <ModuleCard
              key={module.id}
              path={module.path}
              label={getLabelForRole(module, ROLES.TEACHER)}
              description={getDescriptionForRole(module, ROLES.TEACHER)}
              icon={module.icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
