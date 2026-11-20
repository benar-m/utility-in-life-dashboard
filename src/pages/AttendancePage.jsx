import { useEffect, useState } from "react";
import { CalendarCheck2, Download, Loader2, Percent, UserX, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { apiDownload, apiRequest, resultList } from "../api/client.js";
import ChartCard from "../components/charts/ChartCard.jsx";
import DateRangeFilter, { rangeForDays, shortDate } from "../components/charts/DateRangeFilter.jsx";
import LineChart from "../components/charts/LineChart.jsx";
import { ATTENDANCE_COLORS, STATUS } from "../components/charts/palette.js";
import { DonutChart, RingGauge } from "../components/charts/RadialCharts.jsx";
import StatTile from "../components/charts/StatTile.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PageHeader from "../components/common/PageHeader.jsx";

const percent = (value) => (value === null || value === undefined ? "—" : `${Math.round(value)}%`);

// Colour a rate by how worrying it is; always shown with the number itself.
const rateColor = (value) => (value === null ? STATUS.neutral : Math.round(value) >= 85 ? STATUS.good : Math.round(value) >= 70 ? STATUS.warning : STATUS.critical);

export default function AttendancePage() {
  const [range, setRange] = useState(() => rangeForDays(30));
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("classes/?page_size=200").then((data) => setClasses(resultList(data))).catch(() => {});
  }, []);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    const query = new URLSearchParams({ start: range.start, end: range.end, ...(classId && { class_id: classId }) });
    apiRequest(`attendance/summary/?${query}`)
      .then((data) => isCurrent && (setSummary(data), setError("")))
      .catch((requestError) => isCurrent && setError(requestError.message || "Could not load attendance."))
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [range.start, range.end, classId]);

  const totals = summary?.totals;
  const recorded = totals ? totals.present + totals.late + totals.absent + totals.excused : 0;
  const lessonDays = summary ? summary.by_day.filter((day) => day.rate !== null).length : 0;

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Recorded by teachers from their class list. Rate counts late as attended and leaves excused absences out."
        actionSlot={
          <button
            type="button"
            onClick={() => apiDownload(`reports/export/attendance/?start=${range.start}&end=${range.end}`, "attendance.csv").catch((e) => setError(e.message))}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download size={16} /> Export CSV
          </button>
        }
      />
      <DateRangeFilter value={range} onChange={setRange} presets={[7, 30, 90]}>
        <select
          aria-label="Class"
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
        >
          <option value="">All classes</option>
          {classes.map((classGroup) => (
            <option key={classGroup.id} value={classGroup.id}>{classGroup.name}</option>
          ))}
        </select>
        {isLoading && <Loader2 size={18} className="animate-spin text-slate-400" aria-label="Loading" />}
      </DateRangeFilter>
      {error && <InlineAlert>{error}</InlineAlert>}

      {summary && (
        <div className={`space-y-6 transition-opacity ${isLoading ? "opacity-60" : ""}`}>
          <section aria-label="Totals" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Attendance rate" value={summary.rate ?? "—"} format={(n) => `${Math.round(n)}%`} hint="Present or late" icon={Percent} />
            <StatTile label="Lesson days recorded" value={lessonDays} hint={`${recorded} student marks`} icon={CalendarCheck2} />
            <StatTile label="Present" value={totals.present + totals.late} hint={`${totals.late} of them late`} icon={Users} />
            <StatTile label="Absences" value={totals.absent} hint={`${totals.excused} excused`} icon={UserX} tone={totals.absent ? "red" : "slate"} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
            <ChartCard
              title="Attendance rate by day"
              subtitle="One point per day with recorded lessons"
              table={{
                columns: [
                  { label: "Day", render: (row) => shortDate(row.date, true) },
                  { label: "Present", key: "present", align: "right" },
                  { label: "Late", key: "late", align: "right" },
                  { label: "Absent", key: "absent", align: "right" },
                  { label: "Rate", align: "right", render: (row) => percent(row.rate) },
                ],
                rows: summary.by_day.filter((day) => day.rate !== null),
              }}
            >
              <LineChart
                data={summary.by_day.filter((day) => day.rate !== null)}
                xKey="date"
                xFormat={shortDate}
                yMax={100}
                yFormat={(v) => `${Math.round(v)}%`}
                series={[{ key: "rate", label: "Attendance rate", color: ATTENDANCE_COLORS.present }]}
                emptyLabel="No attendance recorded in this range"
              />
            </ChartCard>

            <ChartCard title="Status breakdown" subtitle="All student marks in this range">
              <DonutChart
                variant="half"
                size={250}
                parts={[
                  { label: "Present", value: totals.present, color: ATTENDANCE_COLORS.present },
                  { label: "Late", value: totals.late, color: ATTENDANCE_COLORS.late },
                  { label: "Absent", value: totals.absent, color: ATTENDANCE_COLORS.absent },
                  { label: "Excused", value: totals.excused, color: ATTENDANCE_COLORS.excused },
                ]}
                centerValue={percent(summary.rate)}
                centerLabel="attended"
                emptyLabel="Nothing recorded in this range"
              />
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Rate by class"
              subtitle="Green 85%+, amber 70–84%, red below 70%"
              table={{
                columns: [
                  { label: "Class", key: "name" },
                  { label: "Lessons", key: "lessons", align: "right" },
                  { label: "Rate", align: "right", render: (row) => percent(row.rate) },
                ],
                rows: summary.by_class,
              }}
            >
              {summary.by_class.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No class has attendance in this range yet</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                  {summary.by_class.map((row) => (
                    <RingGauge key={row.class_id} value={row.rate} color={rateColor(row.rate)} caption={`${row.lessons} lesson${row.lessons === 1 ? "" : "s"}`}>
                      <Link to={`/classes/${row.class_id}`} className="hover:underline">{row.name}</Link>
                    </RingGauge>
                  ))}
                </div>
              )}
            </ChartCard>

            <ChartCard title="Missing the most lessons" subtitle="Follow up with these families first">
              {summary.frequent_absentees.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No absences in this range.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {summary.frequent_absentees.map((row) => (
                    <li key={row.student_id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link to={`/students/${row.student_id}`} className="font-medium text-slate-800 hover:underline">{row.name}</Link>
                      <span className="flex items-center gap-3 text-sm">
                        <span className="text-slate-500">{row.absences} absent</span>
                        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-slate-900">
                          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: rateColor(row.rate) }} />
                          {percent(row.rate)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
