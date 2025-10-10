import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { FileText, X } from "lucide-react";

interface QuotationPrintDialogProps {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
  loading: boolean;
}

export default function QuotationPrintDialog({
  open,
  onClose,
  onPrint,
  loading,
}: QuotationPrintDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="w-fit">
        <AlertDialogHeader className="items-center">
          <AlertDialogTitle className="text-xl font-extrabold">
            Print Quotation
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-xs">
            A new quotation has been created for this job order. Would you like
            to print it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            className="text-left justify-start h-fit gap-4"
            variant="default"
            onClick={onPrint}
            disabled={loading}
          >
            <FileText size={30} strokeWidth={1} />
            <div>
              <strong>Print Quotation</strong>
              <p>Generate and print the quotation document.</p>
            </div>
          </Button>
          <Button
            className="text-left justify-start h-fit gap-4"
            variant="outline"
            onClick={onClose}
          >
            <X size={30} strokeWidth={1} />
            <div>
              <strong>Don't Print</strong>
            </div>
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
