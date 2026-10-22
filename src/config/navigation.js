import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpenCheck,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  FileBarChart2,
  Library,
  Settings,
} from "lucide-react";


export const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview of today's activity",
  },
  {
    id: "students",
    label: "Students",
    path: "/students",
    icon: Users,
    description: "Registrations and student records",
  },
  {
    id: "teachers",
    label: "Teachers",
    path: "/teachers",
    icon: GraduationCap,
    description: "Teacher profiles and assignments",
  },
  {
    id: "classes",
    label: "Classes",
    path: "/classes",
    icon: BookOpenCheck,
    description: "Class links and scheduling",
  },
  {
    id: "resources",
    label: "Resources",
    path: "/resources",
    icon: Library,
    description: "Notes, papers, and study guides",
  },
  {
    id: "calendar",
    label: "Calendar",
    path: "/calendar",
    icon: CalendarDays,
    description: "Lesson timetable",
  },
  {
    id: "payments",
    label: "Payments",
    path: "/payments",
    icon: Wallet,
    description: "M-Pesa invoices and receipts",
  },
  {
    id: "attendance",
    label: "Attendance",
    path: "/attendance",
    icon: ClipboardCheck,
    description: "Attendance records",
  },
  {
    id: "reports",
    label: "Reports",
    path: "/reports",
    icon: FileBarChart2,
    description: "Exports and analytics",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Platform configuration",
  },
];

export const teacherNavigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/teacher",
    icon: LayoutDashboard,
    description: "Your teaching overview",
  },
  {
    id: "classes",
    label: "My classes",
    path: "/teacher/classes",
    icon: BookOpenCheck,
    description: "Rosters and meeting links",
  },
  {
    id: "calendar",
    label: "My timetable",
    path: "/teacher/calendar",
    icon: CalendarDays,
    description: "Your weekly teaching schedule",
  },
];

export const studentNavigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/student",
    icon: LayoutDashboard,
    description: "Your learning overview",
  },
  {
    id: "classes",
    label: "My classes",
    path: "/student/classes",
    icon: BookOpenCheck,
    description: "Subjects, teachers, and balances",
  },
  {
    id: "calendar",
    label: "My timetable",
    path: "/student/calendar",
    icon: CalendarDays,
    description: "Your weekly class schedule",
  },
  {
    id: "payments",
    label: "Payments",
    path: "/student/payments",
    icon: Wallet,
    description: "Invoices and M-Pesa receipts",
  },
];

export function navigationForRole(role) {
  if (role === "TEACHER") return teacherNavigationItems;
  if (role === "STUDENT") return studentNavigationItems;
  return navigationItems;
}

export function dashboardPathForRole(role) {
  if (role === "TEACHER") return "/teacher";
  if (role === "STUDENT") return "/student";
  return "/dashboard";
}
