import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

/**
 * Classic dashboard shell: fixed left sidebar + top bar, with page
 * content rendered by the active route via <Outlet />.
 */
export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarOpen((previousState) => !previousState);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} onNavigate={closeSidebar} />

      {/* Dimmed backdrop for the mobile off-canvas sidebar */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-0">
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
