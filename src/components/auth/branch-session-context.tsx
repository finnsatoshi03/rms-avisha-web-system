import {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActiveBranchSelection,
  clearStoredActiveBranchSelection,
  isValidBranchId,
  persistActiveBranchSelection,
  readStoredActiveBranchSelection,
} from "../../lib/branchSession";
import {
  clearActiveBranchSelectionRemote,
  persistActiveBranchSelection as persistActiveBranchSelectionRemote,
} from "../../services/apiBranchSession";

type BranchSessionContextValue = {
  activeBranchSelection: ActiveBranchSelection | null;
  setActiveBranchSelection: (userId: string, branchId: number) => Promise<void>;
  clearActiveBranchSelection: (userId?: string | null) => Promise<void>;
};

const BranchSessionContext = createContext<BranchSessionContextValue | undefined>(
  undefined
);

export function BranchSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeBranchSelection, setActiveBranchSelectionState] =
    useState<ActiveBranchSelection | null>(() =>
      readStoredActiveBranchSelection()
    );

  const setActiveBranchSelection = useCallback(
    async (userId: string, branchId: number) => {
      if (!userId || !isValidBranchId(branchId)) return;

      await persistActiveBranchSelectionRemote(userId, branchId);

      const nextSelection: ActiveBranchSelection = {
        userId,
        branchId,
      };

      setActiveBranchSelectionState(nextSelection);
      persistActiveBranchSelection(nextSelection);
    },
    []
  );

  const clearActiveBranchSelection = useCallback(async (userId?: string | null) => {
    if (userId) {
      try {
        await clearActiveBranchSelectionRemote(userId);
      } catch (error) {
        console.error(error);
      }
    }

    setActiveBranchSelectionState(null);
    clearStoredActiveBranchSelection();
  }, []);

  const value = useMemo(
    () => ({
      activeBranchSelection,
      setActiveBranchSelection,
      clearActiveBranchSelection,
    }),
    [activeBranchSelection, clearActiveBranchSelection, setActiveBranchSelection]
  );

  return (
    <BranchSessionContext.Provider value={value}>
      {children}
    </BranchSessionContext.Provider>
  );
}

export function useBranchSession() {
  const context = useContext(BranchSessionContext);

  if (!context) {
    throw new Error(
      "useBranchSession must be used within a BranchSessionProvider"
    );
  }

  return context;
}
