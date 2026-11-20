import { CalendarDays, Clock3 } from "lucide-react";
import EmptyState from "../components/common/EmptyState.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import useApiCollection from "../hooks/useApiCollection.js";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CalendarPage({
  endpoint = "classes/?status=ACTIVE&page_size=100",
  title = "Calendar",
  description = "The recurring weekly timetable across active class groups.",
}) {
  const { items: classes, isLoading, error } = useApiCollection(endpoint);
  const timetable = weekdays.map((_, weekday) =>
    classes.flatMap((classGroup) =>
      classGroup.schedule_rules
        .filter((rule) => rule.weekday === weekday)
        .map((rule) => ({ classGroup, rule }))
    )
  );
  const hasLessons = timetable.some((day) => day.length > 0);

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
      />

      {error && <InlineAlert>{error}</InlineAlert>}
      {isLoading ? (
        <TableSkeleton columnLabels={weekdays.map((day) => day.slice(0, 3))} rowCount={2} />
      ) : !hasLessons ? (
        <EmptyState
          icon={CalendarDays}
          title="No lessons scheduled this week"
          description="Classes with weekly timetable rules will appear here."
        />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[70rem] grid-cols-7 gap-3">
            {weekdays.map((weekday, index) => (
              <section key={weekday} className="min-h-72 rounded-xl border border-slate-200 bg-white">
                <header className="border-b border-slate-100 px-3 py-3">
                  <h2 className="text-sm font-semibold text-slate-800">{weekday}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {timetable[index].length} {timetable[index].length === 1 ? "class" : "classes"}
                  </p>
                </header>
                <div className="space-y-2 p-2">
                  {timetable[index].map(({ classGroup, rule }) => (
                    <article key={rule.id} className="rounded-lg border border-brand-100 bg-brand-50 p-3">
                      <p className="text-xs font-semibold text-brand-800">{classGroup.name}</p>
                      <p className="mt-1 text-xs text-brand-700">{classGroup.teacher.name}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                        <Clock3 size={12} />
                        {rule.start_time.slice(0, 5)}–{rule.end_time.slice(0, 5)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
