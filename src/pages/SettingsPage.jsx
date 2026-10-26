import PageHeader from "../components/common/PageHeader.jsx";
import { ROLES, getDescriptionForRole, allModules } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

const settingsModule = allModules.find((module) => module.id === "settings");

const sectionsByRole = {
  [ROLES.ADMIN]: [
    { id: "organization", title: "Organization", description: "Business name, contact details, and academic term dates." },
    { id: "payments", title: "Payments", description: "M-Pesa Paybill number and invoice settings. Secrets are managed server-side only." },
    { id: "roles", title: "Roles & permissions", description: "Control what administrators, teachers, and parents can see and do." },
    { id: "notifications", title: "Notifications", description: "SMS and email reminders for payments, classes, and attendance." },
  ],
  [ROLES.TEACHER]: [
    { id: "profile", title: "Profile", description: "Name, subjects taught, and contact details." },
    { id: "payout", title: "Payout details", description: "M-Pesa number used to receive earnings payouts." },
    { id: "notifications", title: "Notifications", description: "Reminders for upcoming classes and payout confirmations." },
  ],
  [ROLES.PARENT_STUDENT]: [
    { id: "profile", title: "Profile", description: "Your details, or your child's, and emergency contact information." },
    { id: "payment-method", title: "Payment method", description: "M-Pesa number used to pay fee invoices." },
    { id: "notifications", title: "Notifications", description: "Reminders for upcoming classes, fees due, and attendance." },
  ],
};

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? ROLES.PARENT_STUDENT;
  const sections = sectionsByRole[role] ?? sectionsByRole[ROLES.PARENT_STUDENT];

  return (
    <div>
      <PageHeader title={settingsModule.label} description={getDescriptionForRole(settingsModule, role)} />

      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
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
