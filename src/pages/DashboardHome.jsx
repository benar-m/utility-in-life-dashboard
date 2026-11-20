import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, ClipboardCheck, ClipboardList, GraduationCap, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import InlineAlert from "../components/common/InlineAlert.jsx";
import ModuleCard from "../components/common/ModuleCard.jsx";
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
    { label: "Active teachers", value: summary?.active_teachers ?? "—", icon: GraduationCap, tone: "brand" },
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
      <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-shuleni-turquoise via-[#7FE8E0] to-shuleni-aqua px-6 py-8 sm:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-ink/70">Shuleni Online · Staff</p>
        <h1 className="mt-2 font-display text-3xl font-black text-shuleni-navy sm:text-4xl">Welcome back, {firstName}</h1>
        <p className="mt-2 max-w-xl text-shuleni-ink/80">Here's what's happening across classes, students and sign-ups today.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/registrations"
            className="inline-flex items-center gap-2 rounded-full bg-shuleni-red px-5 py-2.5 text-sm font-bold text-white hover:bg-[#cf3330]"
          >
            <ClipboardList size={16} aria-hidden="true" /> Review registrations
          </Link>
          <Link
            to="/classes"
            className="inline-flex items-center gap-2 rounded-full border-2 border-shuleni-navy px-5 py-2 text-sm font-bold text-shuleni-navy hover:bg-shuleni-navy hover:text-white"
          >
            Manage classes <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {error && <InlineAlert>{error}</InlineAlert>}
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <section aria-label="Modules" className="mt-8">
        <h2 className="mb-4 font-display text-lg font-bold text-shuleni-navy">Modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardModules.map((moduleItem) => <ModuleCard key={moduleItem.id} {...moduleItem} />)}
        </div>
      </section>

      <section aria-label="Recent activity" className="mt-8">
        <h2 className="mb-4 font-display text-lg font-bold text-shuleni-navy">Recent activity</h2>
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          Student, teacher, class, and attendance events will appear here when the audit stream is added.
        </div>
      </section>
    </div>
  );
}
