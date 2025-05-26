import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppSidebar from "./Sidebar";
import { useUser } from "../components/auth/useUser";
import { useEffect } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";
import { Separator } from "../components/ui/separator";

export default function AppLayout() {
  const { isUser, user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      location.pathname !== "/dashboard/job-order" &&
      location.pathname !== "/manager-re-auth"
    ) {
      // console.log("Clearing re-authentication flag");
      localStorage.removeItem("managerReAuthenticated");
    }

    if (!user) {
      navigate("/login");
    }
  }, [location, user, navigate]);

  return (
    <SidebarProvider>
      <AppSidebar isUser={isUser} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-muted-foreground">RMS</span>
              <span>/</span>
              <span>Dashboard</span>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 pt-0">
          <div className="h-[calc(100vh-6rem)]">
            <div className="h-full p-6">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
