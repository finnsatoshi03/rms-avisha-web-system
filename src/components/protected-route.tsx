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
    if (isLoading) return; // Don't do anything if we're still loading

    if (!isUser && !isAdmin && !isTaytay && !isPasig) {
      // Redirect to login if no valid role is found
      navigate("/login");
    } else if (isUser) {
      // If user is authenticated but not allowed to access the current path
      const allowedPaths = ["/job-orders", "/account"];
      if (!allowedPaths.includes(location.pathname)) {
        // Redirect to job-orders if trying to access any other path
        navigate("/job-orders");
      }
    }
  }, [isUser, isAdmin, isTaytay, isPasig, isLoading, navigate, location]);

  // Show loading indicator while user data is being fetched
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Allow access to children components if authenticated or have specific roles
  return isUser || isAdmin || isPasig || isTaytay ? children : null;
}
