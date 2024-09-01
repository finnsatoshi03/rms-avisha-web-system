import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "./auth/useUser";
import Loader from "./ui/loader";
import { useSystemDateCheck } from "../hooks/useSystemDateCheck";
import DateError from "../pages/DateError";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isUser, isPasig, isTaytay, isAdmin, isLoading } = useUser();
  const isDateCorrect = useSystemDateCheck();

  useEffect(() => {
    if (isLoading || !isDateCorrect) return; // Don't proceed if still loading or date is incorrect

    // Redirect to login if no valid role is found
    if (!isUser && !isAdmin && !isTaytay && !isPasig) {
      navigate("/login");
    } else if (isUser) {
      // Allow only specific paths for `isUser`
      const allowedPaths = ["/dashboard", "/job-orders", "/account"];
      if (!allowedPaths.includes(location.pathname)) {
        navigate("/job-orders");
      }
    }
  }, [
    isUser,
    isAdmin,
    isTaytay,
    isPasig,
    isLoading,
    isDateCorrect,
    navigate,
    location,
  ]);

  if (!isDateCorrect) {
    return (
      <div>
        <DateError />
      </div>
    );
  }

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
