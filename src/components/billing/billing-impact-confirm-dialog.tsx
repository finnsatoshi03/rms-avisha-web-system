import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface BillingImpactConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
  isPending?: boolean;
}

export default function BillingImpactConfirmDialog({
  open,
  onOpenChange,
  onProceed,
  isPending = false,
}: BillingImpactConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ⚠ This record is linked to a Billing Account
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Changes to this Job Order/Rental will affect its billing
                records.
              </p>
              <div className="text-foreground">
                <p>If you proceed:</p>
                <p>• Payments applied may be reverted</p>
                <p>• Billing totals may be recalculated</p>
                <p>• Financial records will be updated</p>
              </div>
              <p>Do you want to continue?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onProceed();
            }}
            disabled={isPending}
          >
            {isPending ? "Recalculating..." : "Proceed & Recalculate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
