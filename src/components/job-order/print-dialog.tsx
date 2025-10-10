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
import { Building2, Loader2, SaveAll, UserRound } from "lucide-react";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: (type: "company" | "client" | "both") => void;
  title?: string;
  loading?: boolean;
}

export default function PrintDialog({
  open,
  onOpenChange,
  onPrint,
  title = "Print Document",
  loading = false,
}: PrintDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handlePrint = () => {
    if (selectedOption) {
      onPrint(selectedOption as "company" | "client" | "both");
      onOpenChange(false);
    }
  };

  const buttonStyle = "text-left justify-start h-fit gap-4";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[400px]">
        <AlertDialogHeader className="items-center">
          <AlertDialogTitle className="text-xl font-extrabold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-xs">
            Choose how you would like to print the document. You can print a
            copy for the company, a copy for the client, or both. If you don't
            want to print, simply select the option below.
          </AlertDialogDescription>
        </AlertDialogHeader>
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
        <AlertDialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
