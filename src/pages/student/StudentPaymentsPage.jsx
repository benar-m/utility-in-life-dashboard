import { useCallback, useEffect, useState } from "react";
import { ReceiptText, Smartphone, Wallet } from "lucide-react";
import { apiRequest, resultList } from "../../api/client.js";
import EmptyState from "../../components/common/EmptyState.jsx";
import InlineAlert from "../../components/common/InlineAlert.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import TableSkeleton from "../../components/common/TableSkeleton.jsx";
import PaymentPromptModal from "../../components/payments/PaymentPromptModal.jsx";

function dateText(value) {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function money(value, currency = "KES") {
  return `${currency} ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StudentPaymentsPage() {
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceToPay, setInvoiceToPay] = useState(null);

  const load = useCallback(async () => {
    try {
      const [invoiceData, receiptData] = await Promise.all([
        apiRequest("payments/invoices/?page_size=100"),
        apiRequest("payments/receipts/?page_size=100"),
      ]);
      setInvoices(resultList(invoiceData));
      setReceipts(resultList(receiptData));
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load your billing account.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // While an M-Pesa prompt is live, refresh so the row updates when it's paid or times out.
  const hasPendingPrompt = invoices.some((invoice) => invoice.pending_prompt);
  useEffect(() => {
    if (!hasPendingPrompt) return undefined;
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [hasPendingPrompt, load]);

  return (
    <div>
      <PageHeader title="Payments" description="View invoices, pay with M-Pesa, and keep your digital receipts." />
      {error && <InlineAlert>{error}</InlineAlert>}
      <InlineAlert>M-Pesa payment prompts are handled securely. A receipt appears here after a payment is confirmed.</InlineAlert>

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">My invoices</h2>
        {isLoading ? <TableSkeleton columnLabels={["Invoice", "Description", "Due", "Balance", "Status", ""]} /> : invoices.length === 0 ? (
          <EmptyState icon={Wallet} title="No invoices" description="Your class and one-off charges will appear here." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Invoice", "Description", "Due", "Balance", "Status", ""].map((column) => <th key={column} className="px-4 py-3 font-medium">{column}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3"><p className="font-medium text-slate-900">{invoice.number}</p><p className="text-xs text-slate-400">{invoice.class_name || "Account charge"}</p></td>
                  <td className="px-4 py-3 text-slate-600">{invoice.description}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateText(invoice.due_date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{money(invoice.amount_due, invoice.currency)}</td>
                  <td className="px-4 py-3"><StatusBadge status={invoice.status} />{invoice.pending_prompt && <p className="mt-1 text-xs font-medium text-amber-700">M-Pesa prompt sent. Check your phone.</p>}</td>
                  <td className="px-4 py-3 text-right"><button type="button" disabled={["PAID", "VOID"].includes(invoice.status) || Boolean(invoice.pending_prompt)} onClick={() => setInvoiceToPay(invoice)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:bg-slate-100 disabled:text-slate-400"><Smartphone size={14} /> Pay</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><ReceiptText size={16} /> Receipts</h2>
        {receipts.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">Receipts appear when a payment is completed or recorded by the organization.</p> : (
          <div className="grid gap-3 sm:grid-cols-2">{receipts.map((receipt) => (
            <article key={receipt.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{receipt.number}</p><p className="text-xs text-slate-400">Invoice {receipt.invoice_number}</p></div><StatusBadge status="CLEARED" /></div>
              <p className="mt-4 text-lg font-semibold text-brand-700">{money(receipt.amount, receipt.currency)}</p>
              <p className="mt-1 text-xs text-slate-500">{receipt.method === "BANK" ? "Bank transfer" : receipt.method === "CASH" ? "Cash" : "M-Pesa"}: {receipt.provider_reference}</p>
            </article>
          ))}</div>
        )}
      </section>

      <PaymentPromptModal invoice={invoiceToPay} onClose={() => setInvoiceToPay(null)} onCompleted={load} />
    </div>
  );
}
