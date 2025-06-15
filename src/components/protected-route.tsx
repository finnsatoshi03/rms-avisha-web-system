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
  const { isUser, isPasig, isTaytay, isAdmin, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;

    // Redirect to login if no valid role is found
    if (!isUser && !isAdmin && !isTaytay && !isPasig) {
      navigate("/login");
    } else if (isUser) {
      // Allow only specific paths for `isUser`
      const allowedPaths = ["/technician-dashboard", "/job-orders", "/account"];
      if (!allowedPaths.includes(location.pathname)) {
        navigate("/technician-dashboard");
      }
    } else if (!isUser && location.pathname === "/technician-dashboard") {
      navigate("/dashboard/job-order");
    }
  }, [isUser, isAdmin, isTaytay, isPasig, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Allow access to children components if authenticated and date is correct
  return isUser || isAdmin || isPasig || isTaytay ? children : null;
}
