import { ClipboardCheck } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

const attendanceColumnLabels = ["Student", "Class", "Teacher", "Status", "Recorded at"];

export default function AttendancePage() {
  const hasAttendanceRecords = false;

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Attendance recorded by teachers for each class session."
      />

      {hasAttendanceRecords ? (
        <TableSkeleton columnLabels={attendanceColumnLabels} />
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="No attendance recorded yet"
          description="Once teachers start marking attendance from their class view, records will appear."
        />
      )}
    </div>
  );
}
