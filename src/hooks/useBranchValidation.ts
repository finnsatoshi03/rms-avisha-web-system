import { useUser } from "../components/auth/useUser";

export const useBranchValidation = (selectedBranchId?: number | null) => {
  const { isAdmin, isSharedManager, branchId: currentUserBranchId } = useUser();

  const getBranchId = (): number | null => {
    if (selectedBranchId !== undefined && selectedBranchId !== null) {
      return selectedBranchId;
    }

    if (isAdmin) return null;
    return currentUserBranchId ?? null;
  };

  const hasValidBranch = (): boolean => {
    const branchId = getBranchId();
    return branchId !== null && branchId > 0;
  };

  const getBranchName = (): string => {
    const branchId = getBranchId();
    if (branchId === 1) return "Taytay";
    if (branchId === 2) return "Pasig";
    return "No Branch Assigned";
  };

  const getBranchWarningMessage = (): string => {
    if (!hasValidBranch()) {
      if (isSharedManager) {
        return "No active branch selected for this session. Choose a branch to continue.";
      }

      return "No branch assigned. Please select a branch before selecting inventory items.";
    }
    return "";
  };

  return {
    branchId: getBranchId(),
    hasValidBranch: hasValidBranch(),
    branchName: getBranchName(),
    warningMessage: getBranchWarningMessage(),
  };
};
