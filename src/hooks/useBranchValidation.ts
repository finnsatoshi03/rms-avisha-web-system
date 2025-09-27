import { useUser } from "../components/auth/useUser";

export const useBranchValidation = (selectedBranchId?: number | null) => {
  const { isTaytay, isPasig, isAdmin, user } = useUser();

  // Determine branch based on user roles
  const userIsPasig = user?.user_metadata.role?.includes("pasig");
  const userIsTaytay = user?.user_metadata.role?.includes("taytay");
  const userIsGeneral =
    user?.user_metadata.role?.includes("technician") &&
    !userIsPasig &&
    !userIsTaytay;

  const getBranchId = (): number | null => {
    // If a branch is explicitly selected (from form), use that
    if (selectedBranchId !== undefined && selectedBranchId !== null) {
      return selectedBranchId;
    }

    // Otherwise, use role-based branch assignment
    if (isTaytay || userIsTaytay) return 1;
    if (isPasig || userIsPasig) return 2;
    if (isAdmin || userIsGeneral) return null; // Admin can select any branch
    return null; // No branch assigned
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
