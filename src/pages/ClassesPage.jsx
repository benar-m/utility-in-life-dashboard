import { BookOpenCheck, Plus } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import { ROLES, getLabelForRole, getDescriptionForRole, allModules } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

const classesModule = allModules.find((module) => module.id === "classes");

const columnLabelsByRole = {
  [ROLES.ADMIN]: ["Class", "Teacher", "Schedule", "Class link", "Enrolled"],
  [ROLES.TEACHER]: ["Class", "Schedule", "Class link", "Enrolled students"],
  [ROLES.PARENT_STUDENT]: ["Class", "Teacher", "Schedule", "Class link"],
};

const emptyCopyByRole = {
  [ROLES.ADMIN]: {
    title: "No classes scheduled",
    description: "Create a class, assign a teacher, and share the join link with enrolled students.",
  },
  [ROLES.TEACHER]: {
    title: "No classes assigned yet",
    description: "Once an admin assigns you a class, it'll appear here with its schedule and join link.",
  },
  [ROLES.PARENT_STUDENT]: {
    title: "Not enrolled in any classes yet",
    description: "Once enrolled, your classes and their join links will appear here.",
  },
};

export default function ClassesPage() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const hasClassRecords = false;

  return (
    <div>
      <PageHeader
        title={getLabelForRole(classesModule, role)}
        description={getDescriptionForRole(classesModule, role)}
        actionSlot={
          role === ROLES.ADMIN ? (
            <button
              type="button"
              disabled
              title="Available once this module is connected to the API"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white opacity-60"
            >
              <Plus size={16} />
              Create class
            </button>
          ) : null
        }
      />

      {hasClassRecords ? (
        <TableSkeleton columnLabels={columnLabelsByRole[role] ?? columnLabelsByRole[ROLES.PARENT_STUDENT]} />
      ) : (
        <EmptyState icon={BookOpenCheck} {...(emptyCopyByRole[role] ?? emptyCopyByRole[ROLES.PARENT_STUDENT])} />
      )}
    </div>
  );
}
