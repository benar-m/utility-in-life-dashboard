import { Wallet } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import StatCard from "../components/common/StatCard.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import { ROLES, getLabelForRole, getDescriptionForRole, allModules } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

const paymentsModule = allModules.find((module) => module.id === "payments");

// SECURITY NOTE: this page only ever displays payment status. The M-Pesa
// Daraja consumer key/secret, passkey, and callback signing must live
// server-side only and are never sent to, or read by, this front end.

const configByRole = {
  [ROLES.ADMIN]: {
    stats: [
      { label: "Collected this month", value: "KES —" },
      { label: "Pending invoices", value: "—" },
      { label: "Failed / reversed", value: "—" },
    ],
    columnLabels: ["Invoice #", "Parent", "Student", "Amount (KES)", "Status", "Date"],
    emptyTitle: "No invoices yet",
    emptyDescription:
      "Invoices generated for class fees will appear here once a parent is billed, with live M-Pesa Paybill confirmation status.",
  },
  [ROLES.TEACHER]: {
    stats: [
      { label: "Earned this month", value: "KES —" },
      { label: "Pending payout", value: "KES —" },
      { label: "Classes billed", value: "—" },
    ],
    columnLabels: ["Class", "Sessions taught", "Rate", "Amount (KES)", "Status"],
    emptyTitle: "No earnings recorded yet",
    emptyDescription: "Payouts are calculated from classes you've taught. They'll appear here once scheduling is connected.",
  },
  [ROLES.PARENT_STUDENT]: {
    stats: [
      { label: "Balance due", value: "KES —" },
      { label: "Paid this term", value: "KES —" },
      { label: "Next due date", value: "—" },
    ],
    columnLabels: ["Invoice #", "Class", "Amount (KES)", "Status", "Due date"],
    emptyTitle: "No invoices yet",
    emptyDescription: "Fee invoices for enrolled classes will appear here, with an M-Pesa STK push to pay directly.",
  },
};

export default function PaymentsPage() {
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? ROLES.PARENT_STUDENT;
  const config = configByRole[role];
  const hasInvoiceRecords = false;

  return (
    <div>
      <PageHeader title={getLabelForRole(paymentsModule, role)} description={getDescriptionForRole(paymentsModule, role)} />

      <section aria-label="Payment summary" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {config.stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} helperText="Awaiting data" icon={Wallet} tone="brand" />
        ))}
      </section>

      {hasInvoiceRecords ? (
        <TableSkeleton columnLabels={config.columnLabels} />
      ) : (
        <EmptyState icon={Wallet} title={config.emptyTitle} description={config.emptyDescription} />
      )}
    </div>
  );
}
