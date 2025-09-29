import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-fit">
        <DialogHeader className="items-center">
          <DialogTitle className="text-xl font-extrabold">
            Print Quotation
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            A new quotation has been created for this job order. Would you like
            to print it?
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
