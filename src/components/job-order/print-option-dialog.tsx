import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Building2, Loader2, SaveAll, UserRound } from "lucide-react";

interface PrintOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectOption: (option: string) => void;
  loading: boolean;
}

export default function PrintOptionsDialog({
  open,
  onClose,
  onSelectOption,
  loading,
}: PrintOptionsDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handlePrint = () => {
    if (selectedOption) {
      onSelectOption(selectedOption);
    }
  };

  const buttonStyle = "text-left justify-start h-fit gap-4";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[400px]">
        <DialogHeader className="items-center">
          <DialogTitle className="text-xl font-extrabold">
            Print Options
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Choose how you would like to print the job order. You can print a
            copy for the company, a copy for the client, or both. If you don't
            want to print, simply select the option below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            className={buttonStyle}
            variant={selectedOption === "company" ? "default" : "outline"}
            onClick={() => handleOptionSelect("company")}
          >
            <Building2 size={30} strokeWidth={1} />
            <div>
              <strong>Company Copy</strong>
              <p>Print a copy for company records only.</p>
            </div>
          </Button>
          <Button
            className={buttonStyle}
            variant={selectedOption === "client" ? "default" : "outline"}
            onClick={() => handleOptionSelect("client")}
          >
            <UserRound size={30} strokeWidth={1} />
            <div>
              <strong>Client Copy</strong>
              <p>Print a copy for the client only.</p>
            </div>
          </Button>
          <Button
            className={buttonStyle}
            variant={selectedOption === "both" ? "default" : "outline"}
            onClick={() => handleOptionSelect("both")}
          >
            <SaveAll size={30} strokeWidth={1} />
            <div>
              <strong>Both Copies</strong>
              <p>Print both company and client copies.</p>
            </div>
          </Button>
        </div>
        <DialogFooter>
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
                Printing..
              </>
            ) : (
              "Print"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
