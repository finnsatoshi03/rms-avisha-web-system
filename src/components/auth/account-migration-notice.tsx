import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export default function AccountMigrationNotice({
  open,
  migratedEmail,
  onAcknowledge,
}: {
  open: boolean;
  migratedEmail: string;
  onAcknowledge: () => void;
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader className="space-y-3">
          <AlertDialogTitle>Account Migration Required</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left">
            <span className="block">
              Your account is being migrated to a new email address.
            </span>
            <span className="block">
              New email: <strong>{migratedEmail}</strong>
            </span>
            <span className="block">
              Please check your inbox and complete account setup to continue
              using the new account.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onAcknowledge}>
            I Understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
