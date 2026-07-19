import { lazy, Suspense } from "react";
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
import ProtectedRoute from "./components/protected-route";
import PublicRoute from "./components/public-route";
import BillingGuard from "./components/billing/billing-guard";
import { BranchSessionProvider } from "./components/auth/branch-session-context";
import { AuthPageSkeleton } from "./components/ui/page-skeleton";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const TechnicianDashboard = lazy(() => import("./pages/TechnicianDashboard"));
const JobOrders = lazy(() => import("./pages/JobOrders"));
const Quotations = lazy(() => import("./pages/Quotations"));
const Clients = lazy(() => import("./pages/Clients"));
// const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Technicians = lazy(() => import("./pages/Technicians"));
const TechnicianDetailPage = lazy(() => import("./pages/TechnicianDetailPage"));
const Account = lazy(() => import("./pages/Account"));
const Materials = lazy(() => import("./pages/Materials"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Branches = lazy(() => import("./pages/Branches"));
const ManagerReAuth = lazy(() => import("./components/auth/manager-reauth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const BillingAccounts = lazy(() => import("./pages/BillingAccounts"));
const Rentals = lazy(() => import("./pages/Rentals"));
const RentalAssets = lazy(() => import("./pages/RentalAssets"));
const DashboardRental = lazy(() => import("./pages/DashboardRental"));
const Archive = lazy(() => import("./pages/Archive"));
const Printing = lazy(() => import("./pages/Printing"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 1 minute; window-focus refetch still keeps
      // multi-terminal counters in sync without refetching on every mount.
      staleTime: 60 * 1000,
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
          {/* Outer boundary only catches public routes (login, reset, 404);
              protected pages resolve inside AppLayout's own Suspense so the
              sidebar and header never unmount during navigation. */}
          <Suspense fallback={<AuthPageSkeleton />}>
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
              <Route
                path="technician-dashboard"
                element={<TechnicianDashboard />}
              />
              <Route path="manager-re-auth" element={<ManagerReAuth />} />
              <Route path="job-orders" element={<JobOrders />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="clients" element={<Clients />} />
              <Route path="materials" element={<Materials />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="billing" element={<BillingGuard><BillingAccounts /></BillingGuard>} />
              <Route path="billing/:id" element={<BillingGuard><BillingAccounts /></BillingGuard>} />
              <Route path="rentals" element={<Rentals />} />
              <Route path="printing" element={<Printing />} />
              <Route path="rental-assets" element={<RentalAssets />} />
              <Route path="archive" element={<Archive />} />
              <Route path="dashboard/rental" element={<DashboardRental />} />
              <Route path="branches" element={<Branches />} />
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
          </Suspense>
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
