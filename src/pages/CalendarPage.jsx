import { CalendarDays } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  return (
    <div>
      <PageHeader title="Calendar" description="Weekly lesson timetable across all teachers." />

      <div className="mb-4 grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500">
        {weekdayLabels.map((weekdayLabel) => (
          <span key={weekdayLabel}>{weekdayLabel}</span>
        ))}
      </div>
      <div className="mb-6 grid grid-cols-7 gap-2">
        {weekdayLabels.map((weekdayLabel) => (
          <div
            key={weekdayLabel}
            className="h-24 rounded-lg border border-dashed border-slate-200 bg-white"
          />
        ))}
      </div>

      <EmptyState
        icon={CalendarDays}
        title="No lessons scheduled this week"
        description="Lessons created in the Classes module will appear on this calendar automatically."
      />
    </div>
  );
}
