import {
  BrowserRouter,
  // HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import "./styles/loader.css";

import AppLayout from "./layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import DashboardRental from "./pages/DashboardRental";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import JobOrders from "./pages/JobOrders";
import Quotations from "./pages/Quotations";
import Clients from "./pages/Clients";
// import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/protected-route";
import PublicRoute from "./components/public-route";
import Technicians from "./pages/Technicians";
import TechnicianDetailPage from "./pages/TechnicianDetailPage";
import Account from "./pages/Account";
import Materials from "./pages/Materials";
import Expenses from "./pages/Expenses";
import ManagerReAuth from "./components/auth/manager-reauth";
// import BillingStatement from "./pages/BillingStatement";
// import Rental from "./pages/Rental";
import NotFound from "./pages/NotFound";
import Maintenance from "./pages/Maintenance";
import { BranchSessionProvider } from "./components/auth/branch-session-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      // refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  // console.log("App Loads");

  return (
    <QueryClientProvider client={queryClient}>
      <BranchSessionProvider>
        <ReactQueryDevtools initialIsOpen={false} />
        <BrowserRouter>
          <Routes>
            <Route
              index
              element={<Navigate replace to="dashboard/job-order" />}
            />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard/job-order" element={<Dashboard />} />
              <Route path="dashboard/rental" element={<DashboardRental />} />
              <Route
                path="technician-dashboard"
                element={<TechnicianDashboard />}
              />
              <Route path="manager-re-auth" element={<ManagerReAuth />} />
              <Route path="job-orders" element={<JobOrders />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="rental" element={<Maintenance />} />
              <Route path="billing-statement" element={<Maintenance />} />
              <Route path="clients" element={<Clients />} />
              <Route path="materials" element={<Materials />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="settings" element={<Maintenance />} />
              <Route path="technicians" element={<Technicians />} />
              <Route
                path="technicians/:technicianName"
                element={<TechnicianDetailPage />}
              />
              <Route path="account" element={<Account />} />
            </Route>

            <Route
              path="login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route path="auth/callback" element={<AuthCallback />} />
            <Route path="auth/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BranchSessionProvider>

      <Toaster
        position="top-center"
        gutter={12}
        containerStyle={{ margin: "8px" }}
        toastOptions={{
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          },
          style: {
            fontSize: "16px",
            maxWidth: "500px",
            padding: "16px 24px",
            backgroundColor: "white",
            color: "var(--color-grey-700)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
