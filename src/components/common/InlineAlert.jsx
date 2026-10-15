import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function InlineAlert({ children, tone = "error" }) {
  const isSuccess = tone === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${
        isSuccess ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"
      }`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
