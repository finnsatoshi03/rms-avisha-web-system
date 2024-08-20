import {
  BrowserRouter,
  // HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "./styles/loader.css";

import AppLayout from "./layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import JobOrders from "./pages/JobOrders";
import Clients from "./pages/Clients";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ProtectedRoute from "./components/protected-route";
import Technicians from "./pages/Technicians";
import TechnicianDetailPage from "./pages/TechnicianDetailPage";
import Account from "./pages/Account";
import Materials from "./pages/Materials";
import Expenses from "./pages/Expenses";

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
      <BrowserRouter>
        <Routes>
          <Route index element={<Navigate replace to="dashboard" />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="job-orders" element={<JobOrders />} />
            <Route path="clients" element={<Clients />} />
            <Route path="materials" element={<Materials />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="settings" element={<Settings />} />
            <Route path="technicians" element={<Technicians />} />
            <Route
              path="technicians/:technicianName"
              element={<TechnicianDetailPage />}
            />
            <Route path="account" element={<Account />} />
          </Route>

          <Route path="login" element={<Login />} />
        </Routes>
      </BrowserRouter>

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
