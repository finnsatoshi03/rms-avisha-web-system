import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import Loader from "../ui/loader";
import { getBranches } from "../../services/apiBranches";

const FALLBACK_BRANCHES = [
  { id: 1, location: "Taytay" },
  { id: 2, location: "Pasig" },
];

export default function SharedManagerBranchGateway({
  onSelectBranch,
}: {
  onSelectBranch: (branchId: number) => void;
}) {
  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches", "shared-manager-gateway"],
    queryFn: getBranches,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const selectableBranches =
    branches && branches.length > 0 ? branches : FALLBACK_BRANCHES;

  return (
    <AlertDialog open>
      <AlertDialogContent
        className="sm:max-w-xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <AlertDialogHeader className="space-y-3">
          <AlertDialogTitle className="text-center">
            Branch Selection Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            This account manages multiple branches. Select the branch you want
            to access for this session.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <Loader />
            <p className="text-sm text-muted-foreground">Loading branches...</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {selectableBranches.map((branch) => (
              <Button
                key={branch.id}
                type="button"
                className="w-full justify-start"
                onClick={() => onSelectBranch(branch.id)}
              >
                {branch.location} Branch
              </Button>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          You can switch branches anytime from the branch button in the top bar.
        </p>
      </AlertDialogContent>
    </AlertDialog>
  );
}
