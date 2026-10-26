import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpenCheck,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  FileBarChart2,
  TrendingUp,
  Settings,
} from "lucide-react";

export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  PARENT_STUDENT: "parent_student",
};

export const roleDisplayNames = {
  [ROLES.ADMIN]: "Administrator",
  [ROLES.TEACHER]: "Teacher",
  [ROLES.PARENT_STUDENT]: "Parent / Student",
};

export const allModules = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Overview of today's activity",
    roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.PARENT_STUDENT],
  },
  {
    id: "students",
    label: "Students",
    path: "/students",
    icon: Users,
    description: "Registrations and student records",
    roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.PARENT_STUDENT],
    labelByRole: { [ROLES.TEACHER]: "My Students", [ROLES.PARENT_STUDENT]: "My Children" },
    descriptionByRole: {
      [ROLES.TEACHER]: "Students enrolled in your classes",
      [ROLES.PARENT_STUDENT]: "Children registered under your account",
    },
  },
  {
    id: "teachers",
    label: "Teachers",
    path: "/teachers",
    icon: GraduationCap,
    description: "Teacher profiles and assignments",
    roles: [ROLES.ADMIN],
  },
  {
    id: "classes",
    label: "Classes",
    path: "/classes",
    icon: BookOpenCheck,
    description: "Class links and scheduling",
    roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.PARENT_STUDENT],
    labelByRole: { [ROLES.TEACHER]: "My Classes", [ROLES.PARENT_STUDENT]: "My Classes" },
    descriptionByRole: {
      [ROLES.TEACHER]: "Classes you teach and their join links",
      [ROLES.PARENT_STUDENT]: "Enrolled classes and join links",
    },
  },
  {
    id: "calendar",
    label: "Calendar",
    path: "/calendar",
    icon: CalendarDays,
    description: "Lesson timetable",
    roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.PARENT_STUDENT],
  },
  {
    id: "payments",
    label: "Payments",
    path: "/payments",
    icon: Wallet,
    description: "M-Pesa invoices and receipts",
    roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.PARENT_STUDENT],
    labelByRole: { [ROLES.TEACHER]: "Earnings", [ROLES.PARENT_STUDENT]: "Payments" },
    descriptionByRole: {
      [ROLES.TEACHER]: "Payouts owed for classes taught",
      [ROLES.PARENT_STUDENT]: "Fee invoices and M-Pesa receipts",
    },
  },
  {
    id: "attendance",
    label: "Attendance",
    path: "/attendance",
    icon: ClipboardCheck,
    description: "Attendance records",
    roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.PARENT_STUDENT],
    labelByRole: { [ROLES.TEACHER]: "Mark Attendance" },
    descriptionByRole: {
      [ROLES.TEACHER]: "Record attendance for your classes",
      [ROLES.PARENT_STUDENT]: "Attendance history",
    },
  },
  {
    id: "reports",
    label: "Reports",
    path: "/reports",
    icon: FileBarChart2,
    description: "Exports and analytics",
    roles: [ROLES.ADMIN],
  },
  {
    id: "progress",
    label: "Progress",
    path: "/progress",
    icon: TrendingUp,
    description: "Grades, feedback, and progress over time",
    roles: [ROLES.PARENT_STUDENT],
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Platform configuration",
    roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.PARENT_STUDENT],
    descriptionByRole: {
      [ROLES.TEACHER]: "Profile and notification preferences",
      [ROLES.PARENT_STUDENT]: "Profile and notification preferences",
    },
  },
];

/** Modules visible to a given role, in sidebar order. */
export function getModulesForRole(role) {
  return allModules.filter((module) => module.roles.includes(role));
}

/** Resolves the role-specific label, falling back to the base label. */
export function getLabelForRole(module, role) {
  return module.labelByRole?.[role] ?? module.label;
}

/** Resolves the role-specific description, falling back to the base one. */
export function getDescriptionForRole(module, role) {
  return module.descriptionByRole?.[role] ?? module.description;
}

/** Which roles are allowed to view a given route path — used by ProtectedRoute. */
export function getRolesForPath(path) {
  return allModules.find((module) => module.path === path)?.roles ?? [];
}
