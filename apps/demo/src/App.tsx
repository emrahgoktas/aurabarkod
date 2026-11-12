import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./stores/pos";
import LoginPage from "./pages/LoginPage";
import SetupPage from "./pages/SetupPage";
import PlatformPage from "./pages/PlatformPage";
import PosPage from "./pages/PosPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import ReceiptSettingsPage from "./pages/ReceiptSettingsPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerLedgerPage from "./pages/CustomerLedgerPage";
import CampaignsPage from "./pages/CampaignsPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (user?.role === "platform_admin") return <Navigate to="/platform" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (user?.role === "platform_admin") return <Navigate to="/platform" />;
  if (user?.role === "cashier") return <Navigate to="/" />;
  return <>{children}</>;
}

function PlatformRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (user?.role !== "platform_admin") return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<SetupPage />} />
      <Route path="/setup" element={<Navigate to="/register" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/platform" element={<PlatformRoute><PlatformPage /></PlatformRoute>} />
      <Route path="/dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />
      <Route path="/" element={<PrivateRoute><PosPage /></PrivateRoute>} />
      <Route path="/products" element={<AdminRoute><ProductsPage /></AdminRoute>} />
      <Route path="/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
      <Route path="/customers" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
      <Route path="/customers/:id/ledger" element={<PrivateRoute><CustomerLedgerPage /></PrivateRoute>} />
      <Route path="/campaigns" element={<AdminRoute><CampaignsPage /></AdminRoute>} />
      <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
      <Route path="/settings/receipt" element={<AdminRoute><ReceiptSettingsPage /></AdminRoute>} />
    </Routes>
  );
}
