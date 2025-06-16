import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppSidebar from "./Sidebar";
import { useUser } from "../components/auth/useUser";
import { useEffect, useMemo } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";
import { Separator } from "../components/ui/separator";
import NavigationSearch from "../components/navigation-search";

// Breadcrumb configuration
const breadcrumbConfig: Record<string, string> = {
  dashboard: "Dashboard",
  "job-order": "Job Order",
  rental: "Rental",
  "job-orders": "Job Orders",
  clients: "Clients",
  materials: "Materials",
  expenses: "Expenses",
  settings: "Settings",
  technicians: "Technicians",
  account: "Account",
  "manager-re-auth": "Manager Re-Authentication",
  "billing-statement": "Billing Statement",
};

const generateBreadcrumbs = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = ["RMS"];

  segments.forEach((segment, index) => {
    const decodedSegment = decodeURIComponent(segment);

    // Handle special cases for nested routes
    if (segment === "dashboard" && segments[index + 1]) {
      const nextSegment = segments[index + 1];
      const dashboardLabel = breadcrumbConfig[nextSegment] || nextSegment;
      breadcrumbs.push("Dashboard", dashboardLabel);
      return;
    }

    // Skip if it's already handled by dashboard case
    if (segments[index - 1] === "dashboard") {
      return;
    }

    // Handle technician detail pages
    if (segments[index - 1] === "technicians" && !breadcrumbConfig[segment]) {
      breadcrumbs.push("Technician Details");
      return;
    }

    // Use configured label or capitalize the segment
    const label =
      breadcrumbConfig[segment] ||
      decodedSegment.charAt(0).toUpperCase() + decodedSegment.slice(1);
    breadcrumbs.push(label);
  });

  return breadcrumbs;
};

export default function AppLayout() {
  const { isUser, user, isAdmin } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumbs = useMemo(() => {
    return generateBreadcrumbs(location.pathname);
  }, [location.pathname]);

  // Comprehensive protection check - moved outside useEffect
  const isDashboardRoute = location.pathname.startsWith("/dashboard");
  const isManagerReAuthRoute = location.pathname === "/manager-re-auth";
  const isManagerReAuthenticated =
    localStorage.getItem("managerReAuthenticated") === "true";

  // Block access immediately if trying to access dashboard without auth
  const shouldBlockAccess =
    isDashboardRoute &&
    !isManagerReAuthenticated &&
    !isManagerReAuthRoute &&
    !isAdmin;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Force redirect if trying to bypass
    if (shouldBlockAccess) {
      navigate("/manager-re-auth", { replace: true });
      return;
    }

    // Clear re-authentication flag only when leaving dashboard completely
    if (!isDashboardRoute && !isManagerReAuthRoute) {
      localStorage.removeItem("managerReAuthenticated");
    }
  }, [
    location,
    user,
    navigate,
    shouldBlockAccess,
    isDashboardRoute,
    isManagerReAuthRoute,
  ]);

  // Block rendering entirely if user is not authenticated
  if (!user) {
    return null;
  }

  // Block dashboard access completely until re-authentication
  if (shouldBlockAccess) {
    // Force navigation and block UI
    navigate("/manager-re-auth", { replace: true });
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Redirecting to authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar isUser={isUser} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center justify-between w-full px-4">
            {/* Left side - Sidebar trigger and breadcrumbs */}
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex items-center gap-2 text-sm font-medium">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span
                      className={index === 0 ? "text-muted-foreground" : ""}
                    >
                      {crumb}
                    </span>
                    {index < breadcrumbs.length - 1 && <span>/</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - Search and User Profile */}
            <div className="flex items-center gap-3">
              <NavigationSearch />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 pt-0">
          <div className="h-[calc(100vh-6rem)]">
            <div className="h-full px-6">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
