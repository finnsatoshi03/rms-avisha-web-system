import { Navigate } from "react-router-dom";

import { useUser } from "./auth/useUser";
import Loader from "./ui/loader";

export default function PublicRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user, isTechnician, isManager, isAdmin, isDev } =
    useUser();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
        <Loader />
      </div>
    );
  }

  if (user && (isTechnician || isManager || isAdmin || isDev)) {
    return (
      <Navigate
        replace
        to={isTechnician ? "/technician-dashboard" : "/dashboard/job-order"}
      />
    );
  }

  return children;
}
