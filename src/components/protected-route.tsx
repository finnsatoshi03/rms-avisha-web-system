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
  const { isTechnician, isManager, isAdmin, isLoading, user } = useUser();

  useEffect(() => {
    if (isLoading) return;

    if (!user || (!isAdmin && !isManager && !isTechnician)) {
      navigate("/login");
      return;
    }

    if (isTechnician) {
      const allowedPaths = ["/technician-dashboard", "/job-orders", "/account"];
      if (!allowedPaths.includes(location.pathname)) {
        navigate("/technician-dashboard");
      }
      return;
    }

    if (location.pathname === "/technician-dashboard") {
      navigate("/dashboard/job-order");
    }
  }, [
    isTechnician,
    isManager,
    isAdmin,
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

  return isTechnician || isManager || isAdmin ? children : null;
}
