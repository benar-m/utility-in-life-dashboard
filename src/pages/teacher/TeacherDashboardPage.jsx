import { useEffect, useState } from "react";
import { BookOpenCheck, CalendarDays, Link2, Users } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import InlineAlert from "../../components/common/InlineAlert.jsx";
import ModuleCard from "../../components/common/ModuleCard.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import { teacherNavigationItems } from "../../config/navigation.js";
import { useAuth } from "../../context/AuthContext.jsx";

const modules = teacherNavigationItems.filter((item) => item.id !== "dashboard");

export default function TeacherDashboardPage() {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const firstName = currentUser?.full_name?.split(" ")[0] || "there";

  useEffect(() => {
    apiRequest("portal/teacher/summary/")
      .then(setSummary)
      .catch((requestError) => setError(requestError.message || "Could not load your dashboard."));
  }, []);

  const stats = [
    { label: "Assigned classes", value: summary?.assigned_classes ?? "—", icon: BookOpenCheck },
    { label: "Active students", value: summary?.active_students ?? "—", icon: Users, tone: "slate" },
    { label: "Weekly lessons", value: summary?.weekly_lessons ?? "—", icon: CalendarDays },
    {
      label: "Missing meeting links",
      value: summary?.missing_meeting_links ?? "—",
      icon: Link2,
      tone: "amber",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your assigned classes, learners, and weekly teaching schedule."
      />
      {error && <InlineAlert>{error}</InlineAlert>}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Teaching summary">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Teaching tools</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modules.map((moduleItem) => <ModuleCard key={moduleItem.id} {...moduleItem} />)}
        </div>
      </section>
    </div>
  );
}
