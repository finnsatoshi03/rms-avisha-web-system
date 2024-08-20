import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  destructive?: boolean;
  isPending?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  destructive,
  isPending,
}: ConfirmDialogProps) => (
  <AlertDialog open={isOpen} onOpenChange={onClose}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirm Action</AlertDialogTitle>
        <AlertDialogDescription>{message}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant={destructive ? "destructive" : "default"}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming..
            </>
          ) : (
            "Confirm"
          )}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
