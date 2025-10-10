import { useState } from "react";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "../ui/alert-dialog";
import { FileText, ClipboardList, SaveAll, Loader2 } from "lucide-react";

interface PrintSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectOption: (option: "quotation" | "job_order" | "both") => void;
  loading: boolean;
}

export default function PrintSelectionDialog({
  open,
  onClose,
  onSelectOption,
  loading,
}: PrintSelectionDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handlePrint = () => {
    if (selectedOption) {
      onSelectOption(selectedOption as "quotation" | "job_order" | "both");
    }
  };

  const buttonStyle = "text-left justify-start h-fit gap-4";

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="w-fit">
        <AlertDialogHeader className="items-center">
          <AlertDialogTitle className="text-xl font-extrabold">
            Print Selection
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-xs">
            Choose what you would like to print. You can print the quotation,
            the job order, or both. If you don't want to print, simply select
            the option below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            className={buttonStyle}
            variant={selectedOption === "quotation" ? "default" : "outline"}
            onClick={() => handleOptionSelect("quotation")}
          >
            <FileText size={30} strokeWidth={1} />
            <div>
              <strong>Quotation</strong>
              <p>Print the quotation document only.</p>
            </div>
          </Button>
          <Button
            className={buttonStyle}
            variant={selectedOption === "job_order" ? "default" : "outline"}
            onClick={() => handleOptionSelect("job_order")}
          >
            <ClipboardList size={30} strokeWidth={1} />
            <div>
              <strong>Job Order</strong>
              <p>Print the job order document only.</p>
            </div>
          </Button>
          <Button
            className={buttonStyle}
            variant={selectedOption === "both" ? "default" : "outline"}
            onClick={() => handleOptionSelect("both")}
          >
            <SaveAll size={30} strokeWidth={1} />
            <div>
              <strong>Both Documents</strong>
              <p>Print both quotation and job order documents.</p>
            </div>
          </Button>
        </div>
        <AlertDialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Don't Print
          </Button>
          <Button
            variant="default"
            onClick={handlePrint}
            disabled={!selectedOption || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing..
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
