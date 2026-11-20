import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { apiRequest } from "../api/client.js";
import EmptyState from "../components/common/EmptyState.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import useApiCollection from "../hooks/useApiCollection.js";

// Sign-ups from the public registration form (/register). Staff call the parent,
// then record the outcome here.
const STATUSES = [
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["ENROLLED", "Enrolled"],
  ["DECLINED", "Declined"],
];

const STATUS_STYLES = {
  NEW: "border-amber-200 bg-amber-50 text-amber-800",
  CONTACTED: "border-blue-200 bg-blue-50 text-blue-800",
  ENROLLED: "border-brand-200 bg-brand-50 text-brand-800",
  DECLINED: "border-slate-200 bg-slate-100 text-slate-600",
};

const columns = ["Student", "Parent", "Level", "Mode", "Subjects", "Received", "Status"];

const dateText = (value) =>
  new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function useLabels() {
  const [labels, setLabels] = useState({ levels: {}, modes: {}, subjects: {} });
  useEffect(() => {
    apiRequest("public/registrations/options/")
      .then((options) => {
        const byValue = (items) => Object.fromEntries(items.map((item) => [item.value, item.label]));
        setLabels({
          levels: byValue(options.levels),
          modes: byValue(options.study_modes),
          subjects: byValue(options.subjects),
        });
      })
      .catch(() => {});
  }, []);
  return labels;
}

export default function RegistrationsPage() {
  const [statusFilter, setStatusFilter] = useState("NEW");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const labels = useLabels();
  const query = statusFilter ? `registrations/?status=${statusFilter}&page_size=100` : "registrations/?page_size=100";
  const { items: registrations, isLoading, error, reload } = useApiCollection(query);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return registrations;
    return registrations.filter((registration) =>
      [registration.student_name, registration.parent_name, registration.parent_phone].join(" ").toLowerCase().includes(term)
    );
  }, [registrations, search]);

  const updateStatus = async (registration, status) => {
    setActionError("");
    try {
      await apiRequest(`registrations/${registration.id}/`, { method: "PATCH", body: { status } });
      await reload();
    } catch (requestError) {
      setActionError(requestError.message || "Could not update the registration.");
    }
  };

  const levelText = (registration) =>
    registration.level === "OTHER" ? registration.level_other : labels.levels[registration.level] || registration.level;
  const subjectText = (registration) =>
    [...registration.subjects.map((subject) => labels.subjects[subject] || subject), registration.subjects_other]
      .filter(Boolean)
      .join(", ");

  return (
    <div>
      <PageHeader
        title="Registrations"
        description="Sign-ups from the public registration form. Call the parent, then record the outcome."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Filter by status">
          {[...STATUSES, ["", "All"]].map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={statusFilter === value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                statusFilter === value ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:w-72">
          <Search size={16} className="text-slate-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or phone"
            aria-label="Search registrations"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {(error || actionError) && <InlineAlert>{error || actionError}</InlineAlert>}
      {isLoading ? (
        <TableSkeleton columnLabels={columns} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search ? "No matching registrations" : "No registrations here"}
          description={search ? "Try a different name or phone number." : "New sign-ups from the registration form will appear here."}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((registration) => (
                <tr key={registration.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">{registration.student_name}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{registration.parent_name}</p>
                    <a href={`tel:${registration.parent_phone}`} className="text-xs font-medium text-brand-700 hover:text-brand-800">
                      {registration.parent_phone}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{levelText(registration)}</td>
                  <td className="px-4 py-3 text-slate-600">{labels.modes[registration.study_mode] || registration.study_mode}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{subjectText(registration)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateText(registration.created_at)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={registration.status}
                      onChange={(event) => updateStatus(registration, event.target.value)}
                      aria-label={`Status for ${registration.student_name}`}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[registration.status]}`}
                    >
                      {STATUSES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
