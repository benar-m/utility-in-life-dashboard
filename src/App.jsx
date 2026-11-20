import { Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import StudentRegisterPage from "./pages/StudentRegisterPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import StudentsPage from "./pages/StudentsPage.jsx";
import TeachersPage from "./pages/TeachersPage.jsx";
import ClassesPage from "./pages/ClassesPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import PaymentsPage from "./pages/PaymentsPage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";
import AcceptInvitationPage from "./pages/AcceptInvitationPage.jsx";
import TeacherDashboardPage from "./pages/teacher/TeacherDashboardPage.jsx";
import TeacherClassesPage from "./pages/teacher/TeacherClassesPage.jsx";
import StudentDashboardPage from "./pages/student/StudentDashboardPage.jsx";
import StudentClassesPage from "./pages/student/StudentClassesPage.jsx";
import PublicEnrollmentPage from "./pages/PublicEnrollmentPage.jsx";
import StudentPaymentsPage from "./pages/student/StudentPaymentsPage.jsx";
import StudentResourcesPage from "./pages/student/StudentResourcesPage.jsx";
import TeacherAttendancePage from "./pages/teacher/TeacherAttendancePage.jsx";
import TeacherResourcesPage from "./pages/teacher/TeacherResourcesPage.jsx";
import ResourcesPage from "./pages/ResourcesPage.jsx";
import StudentDetailPage from "./pages/StudentDetailPage.jsx";
import ClassDetailPage from "./pages/ClassDetailPage.jsx";
import RegistrationsPage from "./pages/RegistrationsPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/signup" element={<StudentRegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
      <Route path="/enroll/:publicId" element={<PublicEnrollmentPage />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={["OWNER", "ADMIN"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:studentId" element={<StudentDetailPage />} />
        <Route path="/registrations" element={<RegistrationsPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:classId" element={<ClassDetailPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/teacher" element={<TeacherDashboardPage />} />
        <Route path="/teacher/classes" element={<TeacherClassesPage />} />
        <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />
        <Route path="/teacher/resources" element={<TeacherResourcesPage />} />
        <Route
          path="/teacher/calendar"
          element={
            <CalendarPage
              endpoint="portal/teacher/classes/?status=ACTIVE&page_size=100"
              title="My timetable"
              description="Your recurring weekly teaching schedule."
            />
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/student" element={<StudentDashboardPage />} />
        <Route path="/student/classes" element={<StudentClassesPage />} />
        <Route path="/student/payments" element={<StudentPaymentsPage />} />
        <Route path="/student/resources" element={<StudentResourcesPage />} />
        <Route
          path="/student/calendar"
          element={
            <CalendarPage
              endpoint="portal/student/classes/?page_size=100"
              title="My timetable"
              description="Your recurring weekly class schedule."
            />
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
