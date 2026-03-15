export type ActiveBranchSelection = {
  userId: string;
  branchId: number;
};

const ACTIVE_BRANCH_SELECTION_KEY = "rms_active_branch_selection";

export const isValidBranchId = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const hasWindow = () => typeof window !== "undefined";

export const readStoredActiveBranchSelection =
  (): ActiveBranchSelection | null => {
    if (!hasWindow()) return null;

    const raw = window.sessionStorage.getItem(ACTIVE_BRANCH_SELECTION_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<ActiveBranchSelection>;

      if (
        typeof parsed?.userId !== "string" ||
        !parsed.userId ||
        !isValidBranchId(parsed?.branchId)
      ) {
        return null;
      }

      return {
        userId: parsed.userId,
        branchId: parsed.branchId,
      };
    } catch {
      return null;
    }
  };

export const persistActiveBranchSelection = (
  selection: ActiveBranchSelection | null
) => {
  if (!hasWindow()) return;

  if (!selection) {
    window.sessionStorage.removeItem(ACTIVE_BRANCH_SELECTION_KEY);
    return;
  }

  window.sessionStorage.setItem(
    ACTIVE_BRANCH_SELECTION_KEY,
    JSON.stringify(selection)
  );
};

export const clearStoredActiveBranchSelection = () => {
  persistActiveBranchSelection(null);
};

