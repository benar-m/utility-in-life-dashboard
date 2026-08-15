import { Wallet } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import StatCard from "../components/common/StatCard.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

const invoiceColumnLabels = ["Invoice #", "Parent", "Student", "Amount (KES)", "Status", "Date"];

// only for payment
export default function PaymentsPage() {
  const hasInvoiceRecords = false;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="M-Pesa invoices, confirmations, and digital receipts."
      />

      <section aria-label="Payment summary" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Collected this month" value="KES —" helperText="Awaiting data" icon={Wallet} tone="brand" />
        <StatCard label="Pending invoices" value="—" helperText="Awaiting data" icon={Wallet} tone="amber" />
        <StatCard label="Failed / reversed" value="—" helperText="Awaiting data" icon={Wallet} tone="slate" />
      </section>

      {hasInvoiceRecords ? (
        <TableSkeleton columnLabels={invoiceColumnLabels} />
      ) : (
        <EmptyState
          icon={Wallet}
          title="No invoices yet"
          description="Invoices generated for class fees will appear, with live M-Pesa Paybill confirmation status."
        />
      )}
    </div>
  );
}
