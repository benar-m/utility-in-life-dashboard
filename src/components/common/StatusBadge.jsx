const styles = {
  ACTIVE: "bg-brand-50 text-brand-700",
  WITHDRAWN: "bg-slate-100 text-slate-600",
  COMPLETED: "bg-blue-50 text-blue-700",
  NEW: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-brand-50 text-brand-700",
  REJECTED: "bg-slate-100 text-slate-600",
  FULFILLED: "bg-brand-50 text-brand-700",
  CONTACTED: "bg-blue-50 text-blue-700",
  PENDING: "bg-amber-50 text-amber-700",
  INVITED: "bg-blue-50 text-blue-700",
  NOT_INVITED: "bg-slate-100 text-slate-600",
  NOT_CONFIGURED: "bg-slate-100 text-slate-600",
  CLEARED: "bg-brand-50 text-brand-700",
  WAIVED: "bg-blue-50 text-blue-700",
  DRAFT: "bg-slate-100 text-slate-600",
  INACTIVE: "bg-slate-100 text-slate-600",
  PAUSED: "bg-amber-50 text-amber-700",
  ISSUED: "bg-blue-50 text-blue-700",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700",
  PAID: "bg-brand-50 text-brand-700",
  OVERDUE: "bg-red-50 text-red-700",
  VOID: "bg-slate-100 text-slate-500",
  SUCCEEDED: "bg-brand-50 text-brand-700",
  FAILED: "bg-red-50 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  PARTIALLY_REFUNDED: "bg-amber-50 text-amber-700",
  REFUNDED: "bg-slate-100 text-slate-600",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status?.toLowerCase().replaceAll("_", " ") || "unknown"}
    </span>
  );
}
