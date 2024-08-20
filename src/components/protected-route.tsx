import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "./auth/useUser";
import Loader from "./ui/loader";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { isUser, isPasig, isTaytay, isAdmin, isLoading } = useUser();

  useEffect(
    function () {
      if (isUser) navigate("/job-orders");
      if ((!isUser || !isAdmin || !isTaytay || !isPasig) && isLoading)
        navigate("/login");
    },
    [isUser, isAdmin, isTaytay, isPasig, isLoading, navigate]
  );

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return isUser || isAdmin || isPasig || isTaytay ? children : null;
}
