import { FileBarChart2, Download } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

const reportTypes = [
  { id: "attendance", label: "Attendance report", description: "Per-student and per-class attendance over a date range." },
  { id: "earnings", label: "Teacher earnings", description: "Payable amounts per teacher, based on classes taught." },
  { id: "payments", label: "Payments report", description: "Invoices, receipts, and reconciliation against M-Pesa statements." },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" description="Export attendance, earnings, and payment reports as CSV or PDF." />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {reportTypes.map((report) => (
          <div key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">{report.label}</p>
            <p className="mt-1 text-xs text-slate-500">{report.description}</p>
            <button
              type="button"
              disabled
              title="Available once this module is connected to the API"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        ))}
      </div>

      <EmptyState
        icon={FileBarChart2}
        title="Reports will appear here"
        description="Reports are generated from live attendance and payment data, so they'll populate once those modules are connected."
      />
    </div>
  );
}
