import { TrendingUp } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import { allModules, getDescriptionForRole, ROLES } from "../config/navigation.js";

const progressModule = allModules.find((module) => module.id === "progress");

export default function ProgressPage() {
  return (
    <div>
      <PageHeader title={progressModule.label} description={getDescriptionForRole(progressModule, ROLES.PARENT_STUDENT)} />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Attendance trend</p>
          <p className="mt-1 text-xs text-slate-500">Last 8 weeks</p>
          <div className="mt-4 h-32 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Latest feedback</p>
          <p className="mt-1 text-xs text-slate-500">From teachers, per class</p>
          <div className="mt-4 h-32 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
        </div>
      </section>

      <EmptyState
        icon={TrendingUp}
        title="No progress data yet"
        description="Grades, teacher feedback, and attendance trends will build up here as classes are held."
      />
    </div>
  );
}
