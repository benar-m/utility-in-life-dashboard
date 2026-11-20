import PageHeader from "../components/common/PageHeader.jsx";

const settingsSections = [
  {
    id: "organization",
    title: "Organization",
    description: "Business name, contact details, and academic term dates.",
  },
  {
    id: "payments",
    title: "Payments",
    description: "M-Pesa Paybill number and invoice settings. Secrets are managed server-side only.",
  },
  {
    id: "roles",
    title: "Roles & permissions",
    description: "Control what administrators, teachers, and parents can see and do.",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "SMS and email reminders for payments, classes, and attendance.",
  },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Platform-wide configuration for administrators." />

      <div className="space-y-3">
        {settingsSections.map((section) => (
          <div
            key={section.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{section.title}</p>
              <p className="mt-1 text-xs text-slate-500">{section.description}</p>
            </div>
            <button
              type="button"
              disabled
              title="Available in a later phase"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400"
            >
              Manage
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
