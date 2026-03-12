import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../../services/apiAuth";

export function useUser() {
  const { isLoading, data: user } = useQuery({
    queryKey: ["user"],
    queryFn: getCurrentUser,
  });

  const role = user?.role;
  const branchId = user?.branch_id ?? null;
  const mustChangePassword = user?.must_change_password ?? false;
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isTechnician = role === "technician";
  const isTaytay = isManager && branchId === 1;
  const isPasig = isManager && branchId === 2;

  return {
    isLoading,
    user,
    role,
    branchId,
    mustChangePassword,
    isAdmin,
    isManager,
    isTechnician,
    isTaytay,
    isPasig,
    isUser: isTechnician, // backwards-compatible alias
  };
}
