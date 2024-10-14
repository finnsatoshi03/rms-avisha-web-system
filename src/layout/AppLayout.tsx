import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useUser } from "../components/auth/useUser";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";

export default function AppLayout() {
  const { isUser, user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (
      location.pathname !== "/dashboard" &&
      location.pathname !== "/manager-re-auth"
    ) {
      console.log("Clearing re-authentication flag");
      localStorage.removeItem("managerReAuthenticated");
    }

    if (!user) {
      navigate("/login");
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [location, user, navigate]);

  return (
    <div className="relative h-screen w-screen">
      <div
        className={`grid h-screen ${
          sidebarOpen ? "grid-cols-[1fr]" : "lg:grid-cols-[260px_1fr]"
        }`}
      >
        <Sidebar
          className={`fixed lg:relative lg:translate-x-0 transition-transform transform-gpu z-40 lg:z-auto pl-8 py-8 pr-4 h-screen ${
            sidebarOpen ? "translate-x-0" : "-translate-x-[200%]"
          }`}
          isUser={isUser}
          onClose={() => setSidebarOpen(false)}
        />
        <button
          className="lg:hidden mt-4 mx-8"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={24} />
        </button>
        <main
          className="pt-2 lg:pt-8 pb-8 px-8 h-screen overflow-auto"
          onClick={() => sidebarOpen && setSidebarOpen(false)}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
