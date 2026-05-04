import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Store } from "lucide-react";
import toast from "react-hot-toast";
import { useUser } from "./useUser";
import { useBranchSession } from "./branch-session-context";
import { getBranches } from "../../services/apiBranches";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type BranchOption = {
  id: number;
  name?: string;
  location?: string;
};

const getBranchLabel = (branchId: number | null, branches: BranchOption[]) => {
  if (!branchId) return "Select branch";
  const matched = branches.find((branch) => branch.id === branchId);
  return matched?.name ?? matched?.location ?? "Branch";
};

export default function SharedManagerBranchSwitcher() {
  const queryClient = useQueryClient();
  const { user, isSharedManager, branchId: activeBranchId } = useUser();
  const { setActiveBranchSelection } = useBranchSession();

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches", "shared-manager-switcher"],
    queryFn: getBranches,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isSharedManager,
  });

  const selectableBranches = useMemo(
    () => (branches && branches.length > 0 ? branches : []),
    [branches]
  );

  const activeBranchLabel = useMemo(
    () => getBranchLabel(activeBranchId ?? null, selectableBranches),
    [activeBranchId, selectableBranches]
  );

  if (!isSharedManager || !user) {
    return null;
  }

  const handleSwitchBranch = async (nextBranchId: number) => {
    if (activeBranchId === nextBranchId) return;

    try {
      await setActiveBranchSelection(user.id, nextBranchId);
      await queryClient.invalidateQueries({ refetchType: "active" });

      const label = getBranchLabel(nextBranchId, selectableBranches);
      toast.success(`Switched to ${label} Branch.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to switch active branch.";
      toast.error(message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Store size={14} />
          )}
          <span className="hidden sm:inline">Branch</span>
          <span className="max-w-[120px] truncate">{activeBranchLabel}</span>
          <ChevronsUpDown size={14} className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[230px]">
        <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {selectableBranches.map((branch) => {
          const isActive = branch.id === activeBranchId;

          return (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => {
                void handleSwitchBranch(branch.id);
              }}
              className="justify-between"
            >
              <span>{branch.name ?? branch.location ?? "Branch"} Branch</span>
              {isActive ? <Check size={14} className="text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
        {selectableBranches.length === 0 ? (
          <DropdownMenuItem disabled>No branches available</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
