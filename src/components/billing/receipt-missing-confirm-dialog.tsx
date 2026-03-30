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
  disabled?: boolean;
}

export default function ReceiptMissingConfirmDialog({
  open,
  onOpenChange,
  onContinueWithoutReceipt,
  onAttachNow,
  title = "⚠ No Receipt Attached",
  description = "This transaction has no proof of payment. Would you like to attach a receipt now?",
  disabled = false,
}: ReceiptMissingConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onAttachNow} disabled={disabled}>
            Attach Receipt
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled}
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
