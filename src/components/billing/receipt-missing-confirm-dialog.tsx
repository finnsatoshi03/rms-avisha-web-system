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

interface ReceiptMissingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueWithoutReceipt: () => void;
  onAttachNow: () => void;
  title?: string;
  description?: string;
}

export default function ReceiptMissingConfirmDialog({
  open,
  onOpenChange,
  onContinueWithoutReceipt,
  onAttachNow,
  title = "⚠ No Receipt Attached",
  description = "This transaction has no proof of payment. Would you like to attach a receipt now?",
}: ReceiptMissingConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onAttachNow}>Attach Receipt</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onContinueWithoutReceipt();
            }}
          >
            Continue Without Receipt
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
