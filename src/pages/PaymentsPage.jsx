import { useCallback, useEffect, useState } from "react";
import { Banknote, Ban, CheckCircle2, FilePlus2, RefreshCw, RotateCcw, Smartphone, Wallet, XCircle } from "lucide-react";
import { apiRequest, resultList } from "../api/client.js";
import ActionMenu from "../components/common/ActionMenu.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import StatCard from "../components/common/StatCard.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import InvoiceFormModal from "../components/payments/InvoiceFormModal.jsx";
import PaymentPromptModal from "../components/payments/PaymentPromptModal.jsx";
import RecordPaymentModal from "../components/payments/RecordPaymentModal.jsx";
import RefundModal from "../components/payments/RefundModal.jsx";

const invoiceColumns = ["Invoice", "Student", "Charge", "Due", "Balance", "Status", ""];

function money(value, currency = "KES") {
  return `${currency} ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateText(value) {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

export default function PaymentsPage() {
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState(null);
  const [invoiceToRecord, setInvoiceToRecord] = useState(null);
  const [paymentToRefund, setPaymentToRefund] = useState(null);

  const load = useCallback(async () => {
    try {
      const [summaryData, invoiceData, paymentData, studentData, reconciliationData] = await Promise.all([
        apiRequest("payments/summary/"),
        apiRequest("payments/invoices/?page_size=100"),
        apiRequest("payments/transactions/?page_size=100"),
        apiRequest("students/?page_size=100"),
        apiRequest("payments/reconciliations/?page_size=10"),
      ]);
      setSummary(summaryData);
      setInvoices(resultList(invoiceData));
      setPayments(resultList(paymentData));
      setStudents(resultList(studentData));
      setReconciliations(resultList(reconciliationData));
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load billing records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const perform = async (request, successMessage) => {
    setIsWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await request();
      setNotice(typeof successMessage === "function" ? successMessage(response) : successMessage);
      await load();
    } catch (requestError) {
      setError(requestError.message || "The billing action could not be completed.");
    } finally {
      setIsWorking(false);
    }
  };

  const latestRun = reconciliations[0];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Invoices, PayHero M-Pesa prompts, recorded cash or bank payments, receipts, reconciliation, and overdue restrictions."
        actionSlot={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowInvoiceForm(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><FilePlus2 size={16} /> Create invoice</button>
            <button type="button" disabled={isWorking} onClick={() => perform(() => apiRequest("payments/invoices/generate/", { method: "POST", body: {} }), (result) => `${result.created} invoice(s) created; ${result.updated} refreshed.`)} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"><RefreshCw size={16} /> Generate class invoices</button>
          </div>
        }
      />

      {error && <InlineAlert>{error}</InlineAlert>}
      {notice && <InlineAlert tone="success">{notice}</InlineAlert>}

      <section aria-label="Payment summary" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected this month" value={summary ? money(summary.collected_this_month) : "KES —"} helperText={`${summary?.successful_payments ?? "—"} successful payment(s)`} icon={Wallet} tone="brand" />
        <StatCard label="Pending invoices" value={summary?.pending_invoices ?? "—"} helperText={`${summary?.overdue_invoices ?? "—"} overdue`} icon={Wallet} tone="amber" />
        <StatCard label="Refunds" value={summary?.refunds ?? "—"} helperText={`${summary?.failed_attempts ?? "—"} failed/cancelled prompts`} icon={RotateCcw} tone="slate" />
        <StatCard label="Restricted students" value={summary?.active_restrictions ?? "—"} helperText="Payment access stays open" icon={Ban} tone="slate" />
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" disabled={isWorking} onClick={() => window.confirm("Restrict class access for every student with an overdue invoice? Payment access stays open, and you can lift each restriction from Students.") && perform(() => apiRequest("payments/restrictions/apply-overdue/", { method: "POST", body: {} }), (result) => `${result.restricted} new restriction(s) applied across ${result.overdue_students} overdue student(s).`)} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"><Ban size={15} /> Restrict overdue accounts</button>
        <button type="button" disabled={isWorking} onClick={() => perform(() => apiRequest("payments/reconciliations/", { method: "POST", body: {} }), (result) => `Reconciliation checked ${result.checked_count} records and found ${result.issue_count} issue(s).`)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} /> Run reconciliation</button>
      </div>

      {latestRun && (
        <InlineAlert tone={latestRun.issue_count === 0 ? "success" : undefined}>
          Latest reconciliation: {latestRun.checked_count} records checked, {latestRun.issue_count} issue(s) found.
          {latestRun.issues?.[0] && ` ${latestRun.issues[0].detail}`}
        </InlineAlert>
      )}
      {latestRun?.issues?.length > 0 && (
        <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Reconciliation issues</h2>
          {latestRun.issues.map((issue) => (
            <div key={issue.id} className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium text-slate-800">{issue.kind.toLowerCase().replaceAll("_", " ")}{issue.invoice_number ? ` · ${issue.invoice_number}` : ""}</p><p className="text-xs text-slate-500">{issue.detail}</p>{issue.resolution_note && <p className="mt-1 text-xs text-brand-700">Resolved: {issue.resolution_note}</p>}</div>
              <button type="button" disabled={Boolean(issue.resolved_at)} onClick={() => {
                const note = window.prompt("How was this reconciliation issue resolved?");
                if (note?.trim()) perform(() => apiRequest(`payments/reconciliation-issues/${issue.id}/resolve/`, { method: "POST", body: { resolution_note: note.trim() } }), "Reconciliation issue marked resolved.");
              }} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:border-slate-200 disabled:text-slate-400"><CheckCircle2 size={14} /> {issue.resolved_at ? "Resolved" : "Mark resolved"}</button>
            </div>
          ))}
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Invoices</h2>
        {isLoading ? <TableSkeleton columnLabels={invoiceColumns} /> : invoices.length === 0 ? (
          <EmptyState icon={Wallet} title="No invoices yet" description="Set class costs and generate invoices, or issue a one-off invoice." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{invoiceColumns.map((column) => <th key={column} className="px-4 py-3 font-medium">{column}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3"><p className="font-medium text-slate-900">{invoice.number}</p><p className="text-xs text-slate-400">{invoice.class_name || "One-off charge"}</p></td>
                    <td className="px-4 py-3 text-slate-700">{invoice.student.name}</td>
                    <td className="px-4 py-3 text-slate-600"><p>{invoice.description}</p><p className="text-xs text-slate-400">{money(invoice.total_amount, invoice.currency)}</p></td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateText(invoice.due_date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{money(invoice.amount_due, invoice.currency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={invoice.status} />{invoice.pending_prompt && <p className="mt-1 text-xs font-medium text-amber-700">M-Pesa prompt pending</p>}</td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu label={`Actions for ${invoice.number}`} items={[
                        { label: "Send M-Pesa prompt", icon: Smartphone, disabled: ["PAID", "VOID"].includes(invoice.status), onSelect: () => setInvoiceToPay(invoice) },
                        { label: "Record cash or bank payment", icon: Banknote, disabled: ["PAID", "VOID"].includes(invoice.status), onSelect: () => setInvoiceToRecord(invoice) },
                        { label: "Void invoice", icon: XCircle, tone: "danger", disabled: Number(invoice.amount_paid) > 0 || invoice.status === "VOID", onSelect: () => perform(() => apiRequest(`payments/invoices/${invoice.id}/void/`, { method: "POST", body: {} }), `${invoice.number} was voided.`) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Payments and receipts</h2>
        {payments.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">M-Pesa, cash, and bank payments will appear here.</p> : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Method / reference", "Invoice", "Student", "Amount", "Receipt", "Status", ""].map((column) => <th key={column} className="px-4 py-3 font-medium">{column}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3"><p className="font-medium text-slate-900">{payment.method === "BANK" ? "Bank transfer" : payment.method === "CASH" ? "Cash" : "M-Pesa"}</p><p className="text-xs text-slate-500">{payment.provider_reference}</p>{payment.recording_note && <p className="text-xs text-slate-400">{payment.recording_note}</p>}</td>
                  <td className="px-4 py-3 text-slate-600">{payment.invoice.number}</td>
                  <td className="px-4 py-3 text-slate-600">{payment.invoice.student.name}</td>
                  <td className="px-4 py-3 text-slate-600">{money(payment.amount, payment.currency)}{Number(payment.amount_refunded) > 0 && <p className="text-xs text-red-500">Refunded {money(payment.amount_refunded, payment.currency)}</p>}</td>
                  <td className="px-4 py-3 text-slate-600">{payment.receipt_number || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
                  <td className="px-4 py-3 text-right"><ActionMenu label={`Actions for payment ${payment.provider_reference}`} items={[{ label: payment.provider === "payhero" ? "Refund in PayHero" : payment.method === "MPESA" ? "Refund" : "Manual refund not available", icon: RotateCcw, tone: "danger", disabled: payment.provider !== "mock" || Number(payment.refundable_amount) <= 0, onSelect: () => setPaymentToRefund(payment) }]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <InvoiceFormModal isOpen={showInvoiceForm} students={students} onClose={() => setShowInvoiceForm(false)} onCreated={load} />
      <PaymentPromptModal invoice={invoiceToPay} onClose={() => setInvoiceToPay(null)} onCompleted={load} />
      <RecordPaymentModal invoice={invoiceToRecord} onClose={() => setInvoiceToRecord(null)} onCompleted={load} />
      <RefundModal payment={paymentToRefund} onClose={() => setPaymentToRefund(null)} onCompleted={load} />
    </div>
  );
}
