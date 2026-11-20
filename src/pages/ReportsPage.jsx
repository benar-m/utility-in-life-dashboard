import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, GraduationCap, Loader2, TrendingUp, UserPlus, Wallet } from "lucide-react";
import { apiDownload, apiRequest } from "../api/client.js";
import BarList from "../components/charts/BarList.jsx";
import ChartCard from "../components/charts/ChartCard.jsx";
import ColumnChart from "../components/charts/ColumnChart.jsx";
import DateRangeFilter, { rangeForDays, shortDate } from "../components/charts/DateRangeFilter.jsx";
import LineChart from "../components/charts/LineChart.jsx";
import { CATEGORICAL, PRIMARY } from "../components/charts/palette.js";
import SegmentedBar from "../components/charts/SegmentedBar.jsx";
import StatTile from "../components/charts/StatTile.jsx";
import { compactNumber } from "../components/charts/useChartFrame.js";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PageHeader from "../components/common/PageHeader.jsx";

const kes = (value, long = false) =>
  long ? `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}` : `KES ${compactNumber(Number(value))}`;

const METHOD_COLORS = { MPESA: CATEGORICAL[0], CASH: CATEGORICAL[1], BANK: CATEGORICAL[2] };

const EXPORTS = [
  ["payments", "Payments & receipts", "Every payment, method, reference and refund"],
  ["invoices", "Invoices", "Charges, amounts paid and status"],
  ["attendance", "Attendance", "Each student's status per lesson"],
  ["enrollments", "Enrollments", "Who joined which class, and balances"],
  ["registrations", "Registrations", "Public sign-ups and follow-up status"],
];

export default function ReportsPage() {
  const [range, setRange] = useState(() => rangeForDays(90));
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    apiRequest(`reports/summary/?start=${range.start}&end=${range.end}`)
      .then((data) => isCurrent && (setReport(data), setError("")))
      .catch((requestError) => isCurrent && setError(requestError.message || "Could not load reports."))
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [range.start, range.end]);

  const download = async (kind) => {
    setDownloading(kind);
    setError("");
    try {
      await apiDownload(`reports/export/${kind}/?start=${range.start}&end=${range.end}`, `shuleni-${kind}.csv`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloading("");
    }
  };

  const periodLabel = (value, long) =>
    report?.unit === "week" ? `${long ? "Week of " : ""}${shortDate(value, long)}` : shortDate(value, long);

  const growth = report
    ? report.enrollments.map((row, index) => ({
        period: row.period,
        enrollments: row.count,
        registrations: report.registrations[index]?.count ?? 0,
      }))
    : [];

  return (
    <div>
      <PageHeader title="Reports" description="Money in, money owed, and how the school is growing. Every chart has a table view and a CSV export." />
      <DateRangeFilter value={range} onChange={setRange} presets={[30, 90, 365]}>
        {isLoading && <Loader2 size={18} className="animate-spin text-slate-400" aria-label="Loading" />}
      </DateRangeFilter>
      {error && <InlineAlert>{error}</InlineAlert>}

      {report && (
        <div className={`space-y-6 transition-opacity ${isLoading ? "opacity-60" : ""}`}>
          <section aria-label="Totals" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile label="Collected" value={Number(report.totals.collected)} format={(n) => kes(n, true)} hint="Net of refunds" icon={Wallet} />
            <StatTile label="Invoiced" value={Number(report.totals.invoiced)} format={(n) => kes(n, true)} hint="Issued in this range" icon={FileSpreadsheet} tone="slate" />
            <StatTile label="Outstanding now" value={Number(report.totals.outstanding)} format={(n) => kes(n, true)} hint="All unpaid balances" icon={TrendingUp} tone="amber" />
            <StatTile label="New enrollments" value={report.totals.new_enrollments} hint="Students placed in classes" icon={GraduationCap} />
            <StatTile label="New registrations" value={report.totals.new_registrations} hint="From the public form" icon={UserPlus} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
            <ChartCard
              title="Collections"
              subtitle={`${report.unit === "week" ? "Weekly" : "Daily"} payments received, net of refunds`}
              table={{
                columns: [
                  { label: report.unit === "week" ? "Week of" : "Day", render: (row) => shortDate(row.period, true) },
                  { label: "Collected", align: "right", render: (row) => kes(row.collected, true) },
                ],
                rows: report.collections,
              }}
            >
              <ColumnChart data={report.collections} xKey="period" valueKey="collected" xFormat={periodLabel} yFormat={(v, long) => kes(v, long)} emptyLabel="No payments in this range" />
            </ChartCard>

            <ChartCard
              title="Outstanding by class"
              subtitle="Unpaid balances right now, largest first"
              table={{
                columns: [
                  { label: "Class", key: "name" },
                  { label: "Outstanding", align: "right", render: (row) => kes(row.outstanding, true) },
                ],
                rows: report.outstanding_by_class,
              }}
            >
              <BarList
                rows={report.outstanding_by_class.map((row) => ({ label: row.name, value: Number(row.outstanding) }))}
                color={CATEGORICAL[1]}
                format={(v) => kes(v, true)}
                emptyLabel="Nothing outstanding. Every invoice is paid."
              />
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
            <ChartCard
              title="Growth"
              subtitle="New class enrollments and public registrations"
              legend={[
                { label: "Enrollments", color: PRIMARY },
                { label: "Registrations", color: CATEGORICAL[2] },
              ]}
              table={{
                columns: [
                  { label: report.unit === "week" ? "Week of" : "Day", render: (row) => shortDate(row.period, true) },
                  { label: "Enrollments", key: "enrollments", align: "right" },
                  { label: "Registrations", key: "registrations", align: "right" },
                ],
                rows: growth,
              }}
            >
              <LineChart
                data={growth}
                xKey="period"
                xFormat={periodLabel}
                series={[
                  { key: "enrollments", label: "Enrollments", color: PRIMARY },
                  { key: "registrations", label: "Registrations", color: CATEGORICAL[2] },
                ]}
              />
            </ChartCard>

            <ChartCard
              title="How parents pay"
              subtitle="Share of money received by method"
              table={{
                columns: [
                  { label: "Method", key: "label" },
                  { label: "Received", align: "right", render: (row) => kes(row.total, true) },
                ],
                rows: report.payment_methods,
              }}
            >
              <SegmentedBar
                parts={report.payment_methods.map((row) => ({ label: row.label, value: Number(row.total), color: METHOD_COLORS[row.method] }))}
                format={(v) => kes(v, true)}
                emptyLabel="No payments in this range"
              />
            </ChartCard>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-shuleni-navy">Exports</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              CSV files for {shortDate(range.start, true)} – {shortDate(range.end, true)}. They open in Excel or Google Sheets.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {EXPORTS.map(([kind, title, description]) => (
                <li key={kind}>
                  <button
                    type="button"
                    onClick={() => download(kind)}
                    disabled={Boolean(downloading)}
                    className="group flex h-full w-full flex-col rounded-xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-shuleni-aqua/40 disabled:opacity-60"
                  >
                    <span className="flex items-center justify-between gap-2 font-semibold text-shuleni-navy">
                      {title}
                      {downloading === kind ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-slate-400 group-hover:text-brand-500" />}
                    </span>
                    <span className="mt-1 text-xs text-slate-500">{description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
