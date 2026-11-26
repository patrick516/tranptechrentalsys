import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/Login";
import AdminLayout, { type AdminNavId } from "./layouts/AdminLayout";
import DashboardPage from "./pages/Dashboard";
import TodayPage from "./pages/Today";
import BookingsPage from "./pages/Bookings";
import CustomersPage from "./pages/Customers";
import StockPage from "./pages/Stock";
import PaymentsPage from "./pages/Payments";
import PromisesPage from "./pages/Promises";
import MessagesPage from "./pages/Messages";
import ReportsPage from "./pages/Reports";
import FilesPage from "./pages/Files";
import SettingsPage from "./pages/Settings";

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminNavId>("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-sm font-medium text-brand-navy">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AdminLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      {activeTab === "dashboard" && <DashboardPage onNavigate={setActiveTab} />}
      {activeTab === "today" && <TodayPage />}
      {activeTab === "bookings" && <BookingsPage />}
      {activeTab === "customers" && <CustomersPage />}
      {activeTab === "stock" && <StockPage />}
      {activeTab === "payments" && <PaymentsPage />}
      {activeTab === "promises" && <PromisesPage />}
      {activeTab === "messages" && <MessagesPage />}
      {activeTab === "reports" && <ReportsPage />}
      {activeTab === "files" && <FilesPage />}
      {activeTab === "settings" && <SettingsPage />}
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
