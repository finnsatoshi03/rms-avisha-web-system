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

type BranchSessionContextValue = {
  activeBranchSelection: ActiveBranchSelection | null;
  setActiveBranchSelection: (userId: string, branchId: number) => void;
  clearActiveBranchSelection: () => void;
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
    (userId: string, branchId: number) => {
      if (!userId || !isValidBranchId(branchId)) return;

      const nextSelection: ActiveBranchSelection = {
        userId,
        branchId,
      };

      setActiveBranchSelectionState(nextSelection);
      persistActiveBranchSelection(nextSelection);
    },
    []
  );

  const clearActiveBranchSelection = useCallback(() => {
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
