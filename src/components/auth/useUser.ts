import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../../services/apiAuth";
import { useBranchSession } from "./branch-session-context";

export function useUser() {
  const { activeBranchSelection } = useBranchSession();
  const { isLoading, data: user } = useQuery({
    queryKey: ["user"],
    queryFn: getCurrentUser,
    // getCurrentUser makes 4-6 sequential network calls and this hook is
    // mounted by ~40 components. Login/logout/profile updates already seed or
    // clear this cache explicitly, so it's safe to keep it fresh for long.
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const role = user?.role;
  const rawBranchId = user?.branch_id ?? null;
  const isSharedManager = role === "manager" && Boolean(user?.shared_manager);
  const activeBranchId =
    user?.id && activeBranchSelection?.userId === user.id
      ? activeBranchSelection.branchId
      : null;
  const branchId = isSharedManager ? activeBranchId : rawBranchId;
  const requiresBranchSelection = isSharedManager && branchId === null;
  const mustChangePassword = user?.must_change_password ?? false;
  const isDev = role === "dev";
  const isAdmin = role === "admin" || isDev;
  const isManager = role === "manager";
  const isTechnician = role === "technician";
  const isTaytay = isManager && branchId === 1;
  const isPasig = isManager && branchId === 2;

  return {
    isLoading,
    user,
    role,
    branchId,
    rawBranchId,
    activeBranchId,
    isSharedManager,
    requiresBranchSelection,
    mustChangePassword,
    isDev,
    isAdmin,
    isManager,
    isTechnician,
    isTaytay,
    isPasig,
    isUser: isTechnician, // backwards-compatible alias
  };
}
