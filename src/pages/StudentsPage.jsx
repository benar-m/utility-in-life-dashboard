import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, Eye, GraduationCap, KeyRound, Plus, RotateCcw, Search, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { apiRequest } from "../api/client.js";
import EnrollmentApplicationsPanel from "../components/campaigns/EnrollmentApplicationsPanel.jsx";
import ActionMenu from "../components/common/ActionMenu.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import StudentFormModal from "../components/students/StudentFormModal.jsx";
import StudentInvitationModal from "../components/students/StudentInvitationModal.jsx";
import AssignStudentModal from "../components/students/AssignStudentModal.jsx";
import ArchiveStudentModal from "../components/students/ArchiveStudentModal.jsx";
import RestrictionModal from "../components/payments/RestrictionModal.jsx";
import useApiCollection from "../hooks/useApiCollection.js";

const columnLabels = ["Student", "Parent/Guardian", "Grade", "Status", "Portal access", "Joined", ""];

export default function StudentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToInvite, setStudentToInvite] = useState(null);
  const [studentToAssign, setStudentToAssign] = useState(null);
  const [studentToArchive, setStudentToArchive] = useState(null);
  const [studentToRestrict, setStudentToRestrict] = useState(null);
  const [actionError, setActionError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Debounce so the server search runs once the admin pauses typing.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = new URLSearchParams({ page_size: "100", ...(statusFilter && { status: statusFilter }), ...(search && { search }) });
  const { items: students, isLoading, error, reload } = useApiCollection(`students/?${query}`);

  const restore = async (student) => {
    setActionError("");
    try {
      await apiRequest(`students/${student.id}/restore/`, { method: "POST", body: {} });
      await reload();
    } catch (requestError) {
      setActionError(requestError.message || "Could not restore the student.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Students"
        description="Student registrations and records reviewed by administrators."
        actionSlot={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            Add student
          </button>
        }
      />

      <EnrollmentApplicationsPanel onAccepted={reload} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Filter by status">
          {[["ACTIVE", "Active"], ["INACTIVE", "Archived"], ["", "All"]].map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={statusFilter === value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${statusFilter === value ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:w-80">
          <Search size={16} className="text-slate-400" aria-hidden="true" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, guardian, email or phone"
            aria-label="Search students"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      {(error || actionError) && <InlineAlert>{error || actionError}</InlineAlert>}
      {isLoading ? (
        <TableSkeleton columnLabels={columnLabels} />
      ) : students.length === 0 && (search || statusFilter !== "ACTIVE") ? (
        <EmptyState icon={Users} title="No matching students" description="Try another search or filter." />
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Add a student and their primary guardian to begin class enrollment."
          primaryActionLabel="Add student"
          onPrimaryAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columnLabels.map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link to={`/students/${student.id}`} className="hover:text-brand-600 hover:underline">{student.full_name}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{student.primary_guardian?.name || "—"}</p>
                    <p className="text-xs text-slate-400">{student.primary_guardian?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{student.grade_level}</td>
                  <td className="px-4 py-3"><StatusBadge status={student.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={student.portal_status} />
                    </div>
                    {student.account_email && (
                      <p className="mt-1 text-xs text-slate-400">{student.account_email}</p>
                    )}
                    {student.payment_restriction && (
                      <p className="mt-1 text-xs font-medium text-red-600">Class access restricted</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(
                      new Date(`${student.joined_at}T00:00:00`)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionMenu
                      label={`Actions for ${student.full_name}`}
                      items={[
                        {
                          label: "View / edit",
                          icon: Eye,
                          onSelect: () => navigate(`/students/${student.id}`),
                        },
                        ...(student.status !== "ACTIVE"
                          ? [{ label: "Restore student", icon: RotateCcw, onSelect: () => restore(student) }]
                          : []),
                        {
                          label: "Assign to class",
                          icon: GraduationCap,
                          disabled: student.status !== "ACTIVE",
                          onSelect: () => setStudentToAssign(student),
                        },
                        {
                          label:
                            student.portal_status === "INVITED"
                              ? "Re-invite to portal"
                              : "Invite to portal",
                          icon: KeyRound,
                          disabled: student.portal_status === "ACTIVE" || student.status !== "ACTIVE",
                          onSelect: () => setStudentToInvite(student),
                        },
                        {
                          label: student.payment_restriction ? "Lift payment restriction" : "Restrict for late payment",
                          icon: student.payment_restriction ? ShieldCheck : ShieldOff,
                          disabled: student.status !== "ACTIVE",
                          onSelect: async () => {
                            if (!student.payment_restriction) {
                              setStudentToRestrict(student);
                              return;
                            }
                            setActionError("");
                            try {
                              await apiRequest(`payments/restrictions/${student.payment_restriction.id}/lift/`, { method: "POST", body: {} });
                              await reload();
                            } catch (requestError) {
                              setActionError(requestError.message || "Could not lift the restriction.");
                            }
                          },
                        },
                        {
                          label: "Archive student",
                          icon: Archive,
                          tone: "danger",
                          disabled: student.status !== "ACTIVE",
                          onSelect: () => setStudentToArchive(student),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => reload()}
      />
      <StudentInvitationModal
        student={studentToInvite}
        onClose={() => setStudentToInvite(null)}
        onCreated={reload}
      />
      <AssignStudentModal
        student={studentToAssign}
        onClose={() => setStudentToAssign(null)}
        onAssigned={reload}
      />
      <ArchiveStudentModal
        student={studentToArchive}
        onClose={() => setStudentToArchive(null)}
        onArchived={reload}
      />
      <RestrictionModal
        student={studentToRestrict}
        onClose={() => setStudentToRestrict(null)}
        onUpdated={reload}
      />
    </div>
  );
}
