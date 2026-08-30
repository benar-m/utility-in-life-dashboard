import { ClipboardCheck, Check } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import { ROLES, getLabelForRole, getDescriptionForRole, allModules } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

const attendanceModule = allModules.find((module) => module.id === "attendance");

const columnLabelsByRole = {
  [ROLES.ADMIN]: ["Student", "Class", "Teacher", "Status", "Recorded at"],
  [ROLES.TEACHER]: ["Student", "Class", "Status", "Recorded at"],
  [ROLES.PARENT_STUDENT]: ["Class", "Date", "Status"],
};

const emptyCopyByRole = {
  [ROLES.ADMIN]: {
    title: "No attendance recorded yet",
    description: "Once teachers start marking attendance, records across all classes will appear here.",
  },
  [ROLES.TEACHER]: {
    title: "No class selected",
    description: "Pick a class session below to mark attendance for its enrolled students.",
  },
  [ROLES.PARENT_STUDENT]: {
    title: "No attendance history yet",
    description: "Your attendance record will build up here as classes are held.",
  },
};

export default function AttendancePage() {
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? ROLES.PARENT_STUDENT;
  const hasAttendanceRecords = false;

  return (
    <div>
      <PageHeader
        title={getLabelForRole(attendanceModule, role)}
        description={getDescriptionForRole(attendanceModule, role)}
        actionSlot={
          role === ROLES.TEACHER ? (
            <button
              type="button"
              disabled
              title="Available once class scheduling is connected"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white opacity-60"
            >
              <Check size={16} />
              Mark today's attendance
            </button>
          ) : null
        }
      />

      {hasAttendanceRecords ? (
        <TableSkeleton columnLabels={columnLabelsByRole[role] ?? columnLabelsByRole[ROLES.PARENT_STUDENT]} />
      ) : (
        <EmptyState icon={ClipboardCheck} {...(emptyCopyByRole[role] ?? emptyCopyByRole[ROLES.PARENT_STUDENT])} />
      )}
    </div>
  );
}
