import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpenCheck,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  FileBarChart2,
  Settings,
} from "lucide-react";


export const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/",
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
