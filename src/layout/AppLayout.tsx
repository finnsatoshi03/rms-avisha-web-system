import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppSidebar from "./Sidebar";
import { useUser } from "../components/auth/useUser";
import { Suspense, useEffect, useMemo, useState } from "react";
import PageSkeleton, {
  DashboardSkeleton,
} from "../components/ui/page-skeleton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";
import { Separator } from "../components/ui/separator";
import NavigationSearch from "../components/navigation-search";
import InitialPasswordSetup from "../components/auth/initial-password-setup";
import { DevConsoleProvider } from "../components/dev-console/dev-console-context";
import DevUsers from "../pages/DevUsers";
import { useBranchSession } from "../components/auth/branch-session-context";
import { useJobOrdersRealtime } from "../hooks/useJobOrdersRealtime";
import SharedManagerBranchGateway from "../components/auth/shared-manager-branch-gateway";
import SharedManagerBranchSwitcher from "../components/auth/shared-manager-branch-switcher";
import AccountMigrationNotice from "../components/auth/account-migration-notice";
import toast from "react-hot-toast";

// Breadcrumb configuration
const breadcrumbConfig: Record<string, string> = {
  dashboard: "Dashboard",
  "job-order": "Job Order",
  "job-orders": "Job Orders",
  clients: "Clients",
  materials: "Materials",
  expenses: "Expenses",
  branches: "Branch Management",
  settings: "Settings",
  billing: "Billing",
  archive: "Archive",
  technicians: "Technicians",
  account: "Account",
  "manager-re-auth": "Manager Re-Authentication",
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

    // Handle billing detail/form pages
    if (segments[index - 1] === "billing" && !breadcrumbConfig[segment]) {
      if (segment === "new") {
        breadcrumbs.push("New Account");
      } else {
        breadcrumbs.push("Account Details");
      }
      return;
    }
    if (segments[index - 2] === "billing" && segment === "edit") {
      breadcrumbs.push("Edit");
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
  const {
    isUser,
    user,
    isAdmin,
    isSharedManager,
    requiresBranchSelection,
  } = useUser();
  const { setActiveBranchSelection } = useBranchSession();
  const location = useLocation();
  const navigate = useNavigate();
  useJobOrdersRealtime();
  const [isMigrationNoticeDismissed, setIsMigrationNoticeDismissed] =
    useState(false);

  const breadcrumbs = useMemo(() => {
    return generateBreadcrumbs(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    setIsMigrationNoticeDismissed(false);
  }, [user?.id, user?.migrated_email, user?.migration_status]);

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
    !isAdmin &&
    !requiresBranchSelection;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (requiresBranchSelection) {
      return;
    }

    if (user.must_change_password) {
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
    requiresBranchSelection,
    user?.must_change_password,
  ]);

  // Block rendering entirely if user is not authenticated
  if (!user) {
    return null;
  }

  if (user.must_change_password) {
    return <InitialPasswordSetup fullname={user.fullname} email={user.email} />;
  }

  if (isSharedManager && requiresBranchSelection) {
    return (
      <SharedManagerBranchGateway
        onSelectBranch={(branchId) => {
          void setActiveBranchSelection(user.id, branchId).catch((error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to save active branch selection.";
            toast.error(message);
          });
        }}
      />
    );
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

  const shouldShowMigrationNotice = Boolean(
    user.migration_notice_required &&
      user.migrated_email &&
      !isMigrationNoticeDismissed
  );

  return (
    <DevConsoleProvider>
      <SidebarProvider>
        {shouldShowMigrationNotice ? (
          <AccountMigrationNotice
            open
            migratedEmail={user.migrated_email!}
            onAcknowledge={() => setIsMigrationNoticeDismissed(true)}
          />
        ) : null}
        <AppSidebar isUser={isUser} />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background/85 backdrop-blur transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center justify-between w-full px-4">
              {/* Left side - Sidebar trigger and breadcrumbs */}
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div className="flex items-center gap-2 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span
                        className={
                          index === breadcrumbs.length - 1
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {crumb}
                      </span>
                      {index < breadcrumbs.length - 1 && (
                        <span className="text-muted-foreground/50">/</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right side - Search and User Profile */}
              <div className="flex items-center gap-3">
                {isSharedManager ? <SharedManagerBranchSwitcher /> : null}
                <NavigationSearch />
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 pt-0">
            <div className="h-[calc(100vh-6rem)]">
              <div className="h-full px-6">
                {/* Boundary lives inside the layout so the sidebar/header stay
                    mounted while a lazy page chunk loads. Fallback shape
                    matches the destination page. */}
                <Suspense
                  fallback={
                    location.pathname.startsWith("/dashboard") ||
                    location.pathname.startsWith("/technician-dashboard") ? (
                      <DashboardSkeleton />
                    ) : (
                      <PageSkeleton />
                    )
                  }
                >
                  <Outlet />
                </Suspense>
              </div>
            </div>
          </div>
        </SidebarInset>
        <DevUsers />
      </SidebarProvider>
    </DevConsoleProvider>
  );
}
