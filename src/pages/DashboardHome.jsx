import { useEffect, useState } from "react";
import { BookOpenCheck, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { apiRequest } from "../api/client.js";
import InlineAlert from "../components/common/InlineAlert.jsx";
import ModuleCard from "../components/common/ModuleCard.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import StatCard from "../components/common/StatCard.jsx";
import { navigationItems } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

const dashboardModules = navigationItems.filter((item) => item.id !== "dashboard");

export default function DashboardHome() {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const firstName = currentUser?.full_name?.split(" ")[0] ?? "there";

  useEffect(() => {
    apiRequest("dashboard/summary/")
      .then(setSummary)
      .catch((requestError) => setError(requestError.message || "Could not load the dashboard."));
  }, []);

  const stats = [
    { label: "Active students", value: summary?.active_students ?? "—", icon: Users, tone: "brand" },
    { label: "Active teachers", value: summary?.active_teachers ?? "—", icon: GraduationCap, tone: "slate" },
    { label: "Active classes", value: summary?.active_classes ?? "—", icon: BookOpenCheck, tone: "brand" },
    {
      label: "Attendance today",
      value: summary?.attendance_today ?? "—",
      helperText: "Available with lesson attendance",
      icon: ClipboardCheck,
      tone: "amber",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening across the platform today."
      />

      {error && <InlineAlert>{error}</InlineAlert>}
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <section aria-label="Modules" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardModules.map((moduleItem) => <ModuleCard key={moduleItem.id} {...moduleItem} />)}
        </div>
      </section>

      <section aria-label="Recent activity" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent activity</h2>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Student, teacher, class, and attendance events will appear here when the audit stream is added.
        </div>
      </section>
    </div>
  );
}
