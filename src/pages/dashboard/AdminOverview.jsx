import { Users, Wallet, ClipboardCheck, BookOpenCheck } from "lucide-react";
import StatCard from "../../components/common/StatCard.jsx";
import ModuleCard from "../../components/common/ModuleCard.jsx";
import { allModules, getLabelForRole, getDescriptionForRole, ROLES } from "../../config/navigation.js";

const summaryStats = [
  { id: "students", label: "Active students", value: "—", helperText: "Awaiting data", icon: Users, tone: "brand" },
  { id: "classes", label: "Classes this week", value: "—", helperText: "Awaiting data", icon: BookOpenCheck, tone: "slate" },
  { id: "payments", label: "Payments pending", value: "—", helperText: "Awaiting data", icon: Wallet, tone: "amber" },
  { id: "attendance", label: "Attendance today", value: "—", helperText: "Awaiting data", icon: ClipboardCheck, tone: "brand" },
];

// Every module an admin can reach, excluding the dashboard link itself.
const adminModules = allModules.filter(
  (module) => module.roles.includes(ROLES.ADMIN) && module.id !== "dashboard"
);

export default function AdminOverview() {
  return (
    <div>
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </section>

      <section aria-label="Modules" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {adminModules.map((module) => (
            <ModuleCard
              key={module.id}
              path={module.path}
              label={getLabelForRole(module, ROLES.ADMIN)}
              description={getDescriptionForRole(module, ROLES.ADMIN)}
              icon={module.icon}
            />
          ))}
        </div>
      </section>

      <section aria-label="Recent activity" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent activity</h2>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Activity such as new registrations, payments, and attendance updates will
          appear here once the platform is connected to live data.
        </div>
      </section>
    </div>
  );
}
