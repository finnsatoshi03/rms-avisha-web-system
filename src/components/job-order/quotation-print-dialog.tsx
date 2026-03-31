import { useEffect, useState } from "react";
import { Download, FileText, Mail, X } from "lucide-react";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import DocumentEmailComposer, {
  EmailComposePayload,
} from "../email/document-email-composer";

type QuotationDialogAction = "print" | "download" | "email";

interface QuotationPrintDialogProps {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onSendEmail: (payload: EmailComposePayload) => void | Promise<void>;
  loading: boolean;
  isSendingEmail?: boolean;
  canSendEmail?: boolean;
  defaultRecipient?: string;
  defaultCc?: string;
  defaultBcc?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  initialAction?: QuotationDialogAction;
  hasSentBefore?: boolean;
  emailError?: string | null;
}

export default function QuotationPrintDialog({
  open,
  onClose,
  onPrint,
  onDownload,
  onSendEmail,
  loading,
  isSendingEmail = false,
  canSendEmail = false,
  defaultRecipient = "",
  defaultCc = "",
  defaultBcc = "",
  defaultSubject = "Quotation from RMS Avisha",
  defaultMessage = "",
  initialAction = "print",
  hasSentBefore = false,
  emailError = null,
}: QuotationPrintDialogProps) {
  const [selectedAction, setSelectedAction] =
    useState<QuotationDialogAction>("print");

  useEffect(() => {
    if (!open) return;
    setSelectedAction(initialAction);
  }, [open, initialAction]);

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent
        className={
          selectedAction === "email"
            ? "sm:max-w-5xl max-h-[90vh] overflow-y-auto"
            : "sm:max-w-xl"
        }
      >
        <AlertDialogHeader className="items-start">
          <AlertDialogTitle className="text-xl font-extrabold">
            {selectedAction === "email" ? "Send Quotation" : "Select Action"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-left">
            {selectedAction === "email"
              ? "Review recipient and message, then send the quotation with PDF attachment."
              : "Choose how you want to proceed with this quotation document."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {selectedAction !== "email" ? (
          <div className="flex flex-col gap-2">
            <Button
              className="text-left justify-start h-fit gap-4 py-3"
              variant="default"
              onClick={onPrint}
              disabled={loading || isSendingEmail}
            >
              <FileText size={28} strokeWidth={1.5} />
              <div>
                <strong>Print Quotation</strong>
                <p>Generate and print the quotation document.</p>
              </div>
            </Button>
            <Button
              className="text-left justify-start h-fit gap-4 py-3"
              variant="outline"
              onClick={onDownload}
              disabled={loading || isSendingEmail}
            >
              <Download size={28} strokeWidth={1.5} />
              <div>
                <strong>Download PDF</strong>
                <p>Download the same quotation PDF without printing.</p>
              </div>
            </Button>
            {canSendEmail && (
              <Button
                className="text-left justify-start h-fit gap-4 py-3"
                variant="outline"
                onClick={() => setSelectedAction("email")}
                disabled={loading || isSendingEmail}
              >
                <Mail size={28} strokeWidth={1.5} />
                <div>
                  <strong>Send via Email</strong>
                  <p>Attach PDF and send instantly to the client.</p>
                </div>
              </Button>
            )}
            <Button
              className="text-left justify-start h-fit gap-4 py-3"
              variant="outline"
              onClick={onClose}
              disabled={loading || isSendingEmail}
            >
              <X size={28} strokeWidth={1.5} />
              <div>
                <strong>Cancel</strong>
              </div>
            </Button>
          </div>
        ) : (
          <DocumentEmailComposer
            open={open}
            initialValues={{
              to: defaultRecipient,
              cc: defaultCc,
              bcc: defaultBcc,
              subject: defaultSubject,
              message: defaultMessage,
            }}
            isSending={isSendingEmail || loading}
            error={emailError}
            hasSentBefore={hasSentBefore}
            showBack={true}
            onBack={() => setSelectedAction("print")}
            onCancel={onClose}
            onSubmit={onSendEmail}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
