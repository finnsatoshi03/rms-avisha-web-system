import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "./auth/useUser";
import Loader from "./ui/loader";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTechnician, isManager, isAdmin, isDev, isLoading, user } =
    useUser();

  useEffect(() => {
    if (isLoading) return;

    if (!user || (!isAdmin && !isManager && !isTechnician && !isDev)) {
      navigate("/login");
      return;
    }

    if (location.pathname.startsWith("/dev") && !isDev) {
      navigate(isTechnician ? "/technician-dashboard" : "/dashboard/job-order", {
        replace: true,
      });
      return;
    }

    if (location.pathname === "/branches" && !isAdmin) {
      navigate(isTechnician ? "/technician-dashboard" : "/dashboard/job-order", {
        replace: true,
      });
      return;
    }

    if (location.pathname === "/feature-usage" && !isAdmin) {
      navigate(isTechnician ? "/technician-dashboard" : "/dashboard/job-order", {
        replace: true,
      });
      return;
    }

    if (isTechnician) {
      const allowedPaths = ["/technician-dashboard", "/job-orders", "/account"];
      if (!allowedPaths.includes(location.pathname)) {
        navigate("/technician-dashboard", { replace: true });
      }
      return;
    }

    if (location.pathname === "/technician-dashboard") {
      navigate("/dashboard/job-order", { replace: true });
    }
  }, [
    isTechnician,
    isManager,
    isAdmin,
    isDev,
    isLoading,
    navigate,
    location,
    user,
  ]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return isTechnician || isManager || isAdmin || isDev ? children : null;
}
