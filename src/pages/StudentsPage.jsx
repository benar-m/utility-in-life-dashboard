import { Users, Plus } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import { ROLES, getLabelForRole, allModules } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

const studentColumnLabels = ["Student", "Parent/Guardian", "Grade", "Status", "Joined"];
const studentsModule = allModules.find((module) => module.id === "students");

const copyByRole = {
  [ROLES.ADMIN]: {
    description: "Every student registered on the platform.",
    emptyTitle: "No students yet",
    emptyDescription:
      "Once parents register their children, or an admin adds a student manually, they'll show up here.",
    canAdd: true,
    addLabel: "Add student",
  },
  [ROLES.TEACHER]: {
    description: "Students currently enrolled in classes you teach.",
    emptyTitle: "No students assigned yet",
    emptyDescription: "Once you're assigned a class with enrolled students, they'll show up here.",
    canAdd: false,
  },
  [ROLES.PARENT_STUDENT]: {
    description: "Children registered under your account.",
    emptyTitle: "No children registered yet",
    emptyDescription: "Register your child to enroll them in classes and start receiving fee invoices for them.",
    canAdd: true,
    addLabel: "Register a child",
  },
};

export default function StudentsPage() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const copy = copyByRole[role] ?? copyByRole[ROLES.TEACHER];
  const hasStudentRecords = false; // flip once GET /api/students is wired up

  return (
    <div>
      <PageHeader
        title={getLabelForRole(studentsModule, role)}
        description={copy.description}
        actionSlot={
          copy.canAdd ? (
            <button
              type="button"
              disabled
              title="Available once this module is connected to the API"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white opacity-60"
            >
              <Plus size={16} />
              {copy.addLabel}
            </button>
          ) : null
        }
      />

      {hasStudentRecords ? (
        <TableSkeleton columnLabels={studentColumnLabels} />
      ) : (
        <EmptyState
          icon={Users}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          primaryActionLabel={copy.canAdd ? copy.addLabel : undefined}
        />
      )}
    </div>
  );
}
