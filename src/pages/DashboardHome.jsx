import PageHeader from "../components/common/PageHeader.jsx";
import { ROLES, roleDisplayNames } from "../config/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";
import AdminOverview from "./dashboard/AdminOverview.jsx";
import TeacherOverview from "./dashboard/TeacherOverview.jsx";
import ParentStudentOverview from "./dashboard/ParentStudentOverview.jsx";

const overviewComponentByRole = {
  [ROLES.ADMIN]: AdminOverview,
  [ROLES.TEACHER]: TeacherOverview,
  [ROLES.PARENT_STUDENT]: ParentStudentOverview,
};

export default function DashboardHome() {
  const { currentUser } = useAuth();
  const firstName = currentUser?.fullName?.split(" ")[0] ?? "there";
  const OverviewForRole = overviewComponentByRole[currentUser?.role] ?? ParentStudentOverview;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`Signed in as ${roleDisplayNames[currentUser?.role] ?? "guest"}. Here's what's happening today.`}
      />
      <OverviewForRole />
    </div>
  );
}
