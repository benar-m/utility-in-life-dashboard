import { Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import { getRolesForPath } from "./config/navigation.js";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import StudentsPage from "./pages/StudentsPage.jsx";
import TeachersPage from "./pages/TeachersPage.jsx";
import ClassesPage from "./pages/ClassesPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import PaymentsPage from "./pages/PaymentsPage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import ProgressPage from "./pages/ProgressPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

// Maps each route path to its page component. Role restrictions for each
// path are read from config/navigation.js (getRolesForPath), so a module's
// allowed roles only ever need to be defined once.
const routeDefinitions = [
  { path: "/", element: <DashboardHome /> },
  { path: "/students", element: <StudentsPage /> },
  { path: "/teachers", element: <TeachersPage /> },
  { path: "/classes", element: <ClassesPage /> },
  { path: "/calendar", element: <CalendarPage /> },
  { path: "/payments", element: <PaymentsPage /> },
  { path: "/attendance", element: <AttendancePage /> },
  { path: "/reports", element: <ReportsPage /> },
  { path: "/progress", element: <ProgressPage /> },
  { path: "/settings", element: <SettingsPage /> },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {routeDefinitions.map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={<ProtectedRoute allowedRoles={getRolesForPath(path)}>{element}</ProtectedRoute>}
          />
        ))}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
