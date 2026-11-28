import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
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
import NotFoundPage from "./pages/NotFound";
import ProtectedRoute from "./routes/ProtectedRoute";

// One URL per screen, matching the sidebar ids so links can be shared and the
// browser back button always works.
const PATHS: Record<AdminNavId, string> = {
  dashboard: "/dashboard",
  today: "/today",
  bookings: "/bookings",
  customers: "/customers",
  stock: "/stock",
  payments: "/payments",
  promises: "/promises",
  messages: "/messages",
  reports: "/reports",
  files: "/files",
  settings: "/settings",
};

function tabFromPath(pathname: string): AdminNavId {
  const match = (Object.keys(PATHS) as AdminNavId[]).find(
    (id) => PATHS[id] === pathname,
  );
  return match ?? "dashboard";
}

// Sidebar + chrome around the current route.
function AdminShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <AdminLayout activeTab={tabFromPath(pathname)} onSelectTab={(tab) => navigate(PATHS[tab])}>
      <Outlet />
    </AdminLayout>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
}

// Shown while the session and the first-run flag are still being checked, so
// the portal never flashes the wrong screen.
function BootScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white font-sans"
    >
      <img
        src="/images/RentalsLogo.png"
        alt=""
        width={120}
        height={60}
        className="h-12 w-auto"
      />
      <p className="text-sm text-slate-500">Checking system…</p>
    </div>
  );
}

// Decides between the one-time register screen and the normal portal.
function AppRoutes() {
  const { user, loading, needsSetup } = useAuth();

  if (loading || needsSetup === null) return <BootScreen />;

  // No users in the database yet: only the first-run account can be created,
  // and every other URL leads there.
  if (needsSetup && !user) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/register"
        element={
          <Navigate to={user ? "/dashboard" : "/login"} replace />
        }
      />
      <Route path="/login" element={<LoginRoute />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="today" element={<TodayPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="promises" element={<PromisesPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
