import { ArrowRight, Clock3 } from "lucide-react";
import { formatMoney, formatSchedule, subjectIcon, subjectTone } from "./format.js";

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const WEEK_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function WeekStrip({ schedule }) {
  const activeDays = new Set(schedule.map((slot) => slot.weekday));
  return (
    <div className="flex gap-1" aria-label={`Meets on ${schedule.map((slot) => slot.day).join(", ") || "days to be confirmed"}`}>
      {WEEK.map((letter, weekday) => (
        <span
          key={WEEK_NAMES[weekday]}
          title={WEEK_NAMES[weekday]}
          aria-hidden="true"
          className={`flex h-7 flex-1 items-center justify-center rounded-md text-xs font-bold ${
            activeDays.has(weekday) ? "bg-shuleni-navy text-white" : "bg-slate-100 text-slate-400"
          }`}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

function Places({ capacity, enrolled, remaining }) {
  if (capacity === null || capacity === undefined) return <p className="text-sm text-slate-500">Places available</p>;
  const isFull = remaining === 0;
  const isNearlyFull = !isFull && remaining <= Math.max(3, Math.ceil(capacity * 0.15));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className={isFull ? "font-bold text-shuleni-red" : isNearlyFull ? "font-bold text-shuleni-orange" : "text-slate-600"}>
          {isFull ? "Class full" : isNearlyFull ? `Only ${remaining} places left` : `${remaining} places left`}
        </span>
        <span className="text-xs text-slate-400">
          {enrolled}/{capacity}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className={`h-full rounded-full ${isFull ? "bg-shuleni-red" : "bg-shuleni-teal"}`}
          style={{ width: `${Math.min(100, Math.round((enrolled / capacity) * 100))}%` }}
        />
      </div>
    </div>
  );
}

export default function ClassCard({ classGroup, onRequest }) {
  const Icon = subjectIcon(classGroup.subject);
  const isFull = classGroup.remaining_seats === 0;

  return (
    <article className="flex w-full flex-col rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-shuleni-navy/10">
      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-sm font-bold text-shuleni-ink">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${subjectTone(classGroup.subject)}`}>
              <Icon size={16} aria-hidden="true" />
            </span>
            {classGroup.subject}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{classGroup.grade_level}</span>
        </div>
        <div>
          <h3 className="font-display text-xl font-bold leading-snug text-shuleni-navy">{classGroup.name}</h3>
          {classGroup.teacher && <p className="mt-1 text-sm text-slate-500">with {classGroup.teacher}</p>}
        </div>

        <div className="space-y-2">
          <WeekStrip schedule={classGroup.schedule} />
          {classGroup.schedule.length === 0 ? (
            <p className="text-sm text-slate-500">Times to be confirmed</p>
          ) : (
            formatSchedule(classGroup.schedule).map((line) => (
              <p key={line} className="flex items-center gap-2 text-sm text-slate-700">
                <Clock3 size={15} className="shrink-0 text-shuleni-teal" aria-hidden="true" /> {line}
              </p>
            ))
          )}
        </div>

        <Places capacity={classGroup.capacity} enrolled={classGroup.enrolled_count} remaining={classGroup.remaining_seats} />

        <div className="mt-auto space-y-3 border-t border-slate-100 pt-4">
          {classGroup.cost_amount !== null && (
            <p className="flex items-baseline justify-between text-sm text-slate-500">
              Fee
              <span className="font-display text-lg font-bold text-shuleni-ink">
                {formatMoney(classGroup.cost_amount, classGroup.currency)}
              </span>
            </p>
          )}
          <button
            type="button"
            onClick={() => onRequest(classGroup)}
            disabled={isFull}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-shuleni-red px-4 py-2.5 text-sm font-bold text-white hover:bg-[#cf3330] disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isFull ? "Class full" : "Request a place"}
            {!isFull && <ArrowRight size={15} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </article>
  );
}
