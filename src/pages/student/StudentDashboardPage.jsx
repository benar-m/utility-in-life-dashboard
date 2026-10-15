import { useEffect, useState } from "react";
import { BookOpenCheck, CalendarDays, GraduationCap, Wallet } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import InlineAlert from "../../components/common/InlineAlert.jsx";
import ModuleCard from "../../components/common/ModuleCard.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import { studentNavigationItems } from "../../config/navigation.js";

const modules = studentNavigationItems.filter((item) => item.id !== "dashboard");

export default function StudentDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("portal/student/summary/")
      .then(setSummary)
      .catch((requestError) => setError(requestError.message || "Could not load your dashboard."));
  }, []);

  const stats = [
    { label: "Active classes", value: summary?.active_classes ?? "—", icon: BookOpenCheck },
    { label: "Weekly lessons", value: summary?.weekly_lessons ?? "—", icon: CalendarDays, tone: "slate" },
    {
      label: "Pending balances",
      value: summary?.pending_balance_classes ?? "—",
      helperText: "Balances do not block class access",
      icon: Wallet,
      tone: "amber",
    },
    {
      label: "Grade level",
      value: summary?.grade_level || "—",
      icon: GraduationCap,
      tone: "slate",
    },
  ];

  return (
    <div>
      <PageHeader
        title={summary?.student_name ? `Welcome, ${summary.student_name.split(" ")[0]}` : "My learning"}
        description="Your classes, weekly timetable, and account status."
      />
      {error && <InlineAlert>{error}</InlineAlert>}
      {summary?.access_restricted && (
        <InlineAlert>Your class access is restricted: {summary.restriction_reason}. You can still open Payments and settle invoices.</InlineAlert>
      )}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Learning summary">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Learning tools</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modules.map((moduleItem) => <ModuleCard key={moduleItem.id} {...moduleItem} />)}
        </div>
      </section>
    </div>
  );
}
