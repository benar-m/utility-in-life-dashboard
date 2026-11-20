import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, ClipboardCheck, ClipboardList, Link2Off, UserRoundCheck, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest, resultList } from "../api/client.js";
import ChartCard from "../components/charts/ChartCard.jsx";
import ColumnChart from "../components/charts/ColumnChart.jsx";
import { isoDate, shortDate } from "../components/charts/DateRangeFilter.jsx";
import LineChart from "../components/charts/LineChart.jsx";
import { ATTENDANCE_COLORS } from "../components/charts/palette.js";
import StatTile from "../components/charts/StatTile.jsx";
import { compactNumber } from "../components/charts/useChartFrame.js";
import ActivityList from "../components/dashboard/ActivityList.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const kes = (value, long = false) =>
  long ? `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}` : `KES ${compactNumber(Number(value))}`;

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return isoDate(date);
};

// Load everything the home page needs; each part fails independently.
function useDashboard() {
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  useEffect(() => {
    const today = isoDate(new Date());
    const requests = {
      summary: "dashboard/summary/",
      money: `reports/summary/?start=${daysAgo(55)}&end=${today}`,
      attendance: `attendance/summary/?start=${daysAgo(13)}&end=${today}`,
      activity: "dashboard/activity/",
      newRegistrations: "registrations/?status=NEW&page_size=1",
      pendingApplications: "applications/?status=PENDING&page_size=1",
      overdue: "payments/invoices/?status=OVERDUE&page_size=1",
      classes: "classes/?status=ACTIVE&page_size=200",
    };
    Object.entries(requests).forEach(([key, path]) =>
      apiRequest(path)
        .then((value) => setData((current) => ({ ...current, [key]: value })))
        .catch((requestError) => key === "summary" && setError(requestError.message || "Could not load the dashboard."))
    );
  }, []);
  return { data, error };
}

const count = (payload) => (payload ? payload.count ?? resultList(payload).length : null);

export default function DashboardHome() {
  const { currentUser } = useAuth();
  const { data, error } = useDashboard();
  const firstName = currentUser?.full_name?.split(" ")[0] ?? "there";
  const today = data.summary?.attendance_today;
  const missingLinks = data.classes ? resultList(data.classes).filter((classGroup) => !classGroup.default_meeting_url).length : null;

  const attention = [
    { label: "New registrations to call", value: count(data.newRegistrations), to: "/registrations", icon: ClipboardList },
    { label: "Applications waiting", value: count(data.pendingApplications), to: "/students", icon: UserRoundCheck },
    { label: "Overdue invoices", value: count(data.overdue), to: "/payments", icon: Wallet },
    { label: "Classes without a meeting link", value: missingLinks, to: "/classes", icon: Link2Off },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-shuleni-turquoise via-[#7FE8E0] to-shuleni-aqua px-6 py-7 sm:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-ink/70">Shuleni Online · Staff</p>
        <h1 className="mt-2 font-display text-3xl font-black text-shuleni-navy sm:text-4xl">Welcome back, {firstName}</h1>
        <p className="mt-2 max-w-xl text-shuleni-ink/80">
          {today?.lessons_scheduled
            ? `${today.lessons_scheduled} lesson${today.lessons_scheduled === 1 ? "" : "s"} on today's timetable · attendance taken for ${today.lessons_recorded}.`
            : "No lessons on today's timetable."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/registrations" className="inline-flex items-center gap-2 rounded-full bg-shuleni-red px-5 py-2.5 text-sm font-bold text-white hover:bg-[#cf3330]">
            <ClipboardList size={16} aria-hidden="true" /> Review registrations
          </Link>
          <Link to="/reports" className="inline-flex items-center gap-2 rounded-full border-2 border-shuleni-navy px-5 py-2 text-sm font-bold text-shuleni-navy hover:bg-shuleni-navy hover:text-white">
            Open reports <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {error && <InlineAlert>{error}</InlineAlert>}

      <section aria-label="Key figures" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active students" value={data.summary?.active_students ?? "—"} hint={`${data.summary?.active_classes ?? "—"} active classes · ${data.summary?.active_teachers ?? "—"} teachers`} icon={Users} />
        <StatTile
          label="Collected, last 8 weeks"
          value={data.money ? Number(data.money.totals.collected) : "—"}
          format={(n) => kes(n, true)}
          trend={data.money?.collections.map((row) => Number(row.collected))}
          icon={Wallet}
        />
        <StatTile label="Outstanding" value={data.money ? Number(data.money.totals.outstanding) : "—"} format={(n) => kes(n, true)} hint="All unpaid balances" icon={Wallet} tone="amber" />
        <StatTile
          label="Attendance today"
          value={today?.rate ?? "—"}
          format={(n) => `${Math.round(n)}%`}
          hint={today ? (today.lessons_recorded ? `${today.lessons_recorded} of ${today.lessons_scheduled} lessons recorded` : "Not recorded yet") : ""}
          trend={data.attendance?.by_day.filter((day) => day.rate !== null).map((day) => day.rate)}
          icon={ClipboardCheck}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="min-w-0 space-y-6">
          <ChartCard
            title="Collections"
            subtitle="Weekly payments received over the last 8 weeks, net of refunds"
            action={<Link to="/reports" className="text-sm font-medium text-brand-600 hover:underline">Reports</Link>}
            table={data.money && {
              columns: [
                { label: "Week of", render: (row) => shortDate(row.period, true) },
                { label: "Collected", align: "right", render: (row) => kes(row.collected, true) },
              ],
              rows: data.money.collections,
            }}
          >
            {data.money ? (
              <ColumnChart data={data.money.collections} xKey="period" valueKey="collected" xFormat={(v, long) => (long ? `Week of ${shortDate(v, true)}` : shortDate(v))} yFormat={(v, long) => kes(v, long)} height={200} emptyLabel="No payments yet" />
            ) : <div className="h-[200px] animate-pulse rounded-xl bg-slate-50" />}
          </ChartCard>

          <ChartCard
            title="Attendance, last 14 days"
            subtitle="Share of students present or late, per day with lessons"
            action={<Link to="/attendance" className="text-sm font-medium text-brand-600 hover:underline">Attendance</Link>}
          >
            {data.attendance ? (
              <LineChart data={data.attendance.by_day.filter((day) => day.rate !== null)} xKey="date" xFormat={shortDate} yMax={100} yFormat={(v) => `${Math.round(v)}%`} series={[{ key: "rate", label: "Attendance rate", color: ATTENDANCE_COLORS.present }]} height={180} emptyLabel="Teachers haven't recorded attendance yet" />
            ) : <div className="h-[180px] animate-pulse rounded-xl bg-slate-50" />}
          </ChartCard>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-shuleni-navy">Needs attention</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {attention.map(({ label, value, to, icon: Icon }) => (
                <li key={label}>
                  <Link to={to} className="group flex items-center gap-3 py-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${value ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-400"}`}><Icon size={17} /></span>
                    <span className="flex-1 text-sm text-slate-700">{label}</span>
                    <span className={`font-display text-lg font-bold tabular-nums ${value ? "text-shuleni-navy" : "text-slate-300"}`}>{value ?? "—"}</span>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-shuleni-navy">Recent activity</h2>
            <div className="mt-2 max-h-[30rem] overflow-auto">
              {data.activity ? <ActivityList events={data.activity.slice(0, 12)} /> : <div className="h-40 animate-pulse rounded-xl bg-slate-50" />}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
