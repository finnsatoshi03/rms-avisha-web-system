import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { formatNumberWithCommas } from "../../lib/helpers";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import ReceiptAttachmentField from "../billing/receipt-attachment-field";
import ReceiptMissingConfirmDialog from "../billing/receipt-missing-confirm-dialog";
import { useTransactionHandler } from "../../hooks/useTransactionHandler";
import { amountsMatch } from "../../lib/transaction-totals";

const paymentMethods = [
  { label: "Cash", value: "cash" },
  { label: "Check", value: "check" },
  { label: "GCash", value: "gcash" },
  { label: "PayMaya", value: "paymaya" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "GrabPay", value: "grabpay" },
];

interface RentalPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    payments: Record<string, number>,
    receiptFile?: File | null
  ) => Promise<void>;
  totalAmount: number;
  rentalNo: string;
  isBillingLinked?: boolean;
}

export default function RentalPaymentDialog({
  open,
  onClose,
  onSubmit,
  totalAmount,
  rentalNo,
  isBillingLinked = false,
}: RentalPaymentDialogProps) {
  const [payments, setPayments] = useState<Record<string, number>>({});
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [totalEntered, setTotalEntered] = useState(0);
  const [splitPayments, setSplitPayments] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBillingConfirm, setShowBillingConfirm] = useState(false);
  const [showMissingReceiptConfirm, setShowMissingReceiptConfirm] =
    useState(false);
  const [pendingPayments, setPendingPayments] = useState<
    Record<string, number> | null
  >(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [confirmMethod, setConfirmMethod] = useState("");
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);
  const transaction = useTransactionHandler();

  const isProcessing = transaction.isLoading;
  const disableInteraction = isProcessing;

  useEffect(() => {
    const total = Object.values(payments).reduce(
      (sum, value) => sum + Number(value),
      0
    );
    setTotalEntered(total);

    if (splitPayments) {
      setIsSubmitDisabled(
        selectedMethods.length === 0 || !amountsMatch(total, totalAmount)
      );
    } else {
      setIsSubmitDisabled(!splitPayments);
    }
  }, [payments, selectedMethods, splitPayments, totalAmount]);

  useEffect(() => {
    if (!open && !isProcessing) {
      resetFormState();
      transaction.reset();
    }
  }, [open, isProcessing, transaction.reset]);

  function resetFormState() {
    setPayments({});
    setSelectedMethods([]);
    setTotalEntered(0);
    setSplitPayments(false);
    setShowConfirm(false);
    setShowBillingConfirm(false);
    setShowMissingReceiptConfirm(false);
    setPendingPayments(null);
    setReceiptFile(null);
    setConfirmMethod("");
    setIsSubmitDisabled(true);
  }

  function handleMainDialogChange(nextOpen: boolean) {
    if (nextOpen) return;
    if (disableInteraction) return;
    onClose();
  }

  const handlePaymentChange = (method: string, value: string) => {
    if (disableInteraction) return;
    setPayments({ ...payments, [method]: Number(value) });
  };

  const handleMethodSelect = (method: string) => {
    if (disableInteraction) return;

    if (!splitPayments) {
      setConfirmMethod(method);
      setShowConfirm(true);
      transaction.setConfirming();
      return;
    }

    if (selectedMethods.includes(method)) {
      setSelectedMethods(selectedMethods.filter((m) => m !== method));
      setPayments((prev) => {
        const updated = { ...prev };
        delete updated[method];
        return updated;
      });
      return;
    }

    setSelectedMethods([...selectedMethods, method]);
  };

  const resolvePaymentsToSubmit = () => {
    if (!splitPayments) {
      if (!confirmMethod) return null;
      return { [confirmMethod]: totalAmount };
    }

    if (!amountsMatch(totalEntered, totalAmount)) {
      alert(
        `Total entered (${totalEntered}) does not match the rental total (${totalAmount}).`
      );
      return null;
    }

    return payments;
  };

  const runSubmission = async (payload: Record<string, number>) => {
    if (disableInteraction) return;

    setShowConfirm(false);
    setShowBillingConfirm(false);
    setShowMissingReceiptConfirm(false);

    const success = await transaction.run(
      async () => {
        await onSubmit(payload, receiptFile);
      },
      {
        errorMessage: "Payment failed. Please try again.",
        successMessage: "Payment recorded successfully.",
        keepSuccessStateMs: 500,
      }
    );

    if (!success) return;

    transaction.reset();
    onClose();
  };

  const maybeConfirmMissingReceipt = (payload: Record<string, number>) => {
    if (!receiptFile) {
      setPendingPayments(payload);
      setShowMissingReceiptConfirm(true);
      transaction.setConfirming();
      return;
    }
    void runSubmission(payload);
  };

  const handleConfirmPayment = () => {
    if (disableInteraction) return;

    const payload = resolvePaymentsToSubmit();
    if (!payload) return;

    if (isBillingLinked) {
      setPendingPayments(payload);
      setShowBillingConfirm(true);
      setShowConfirm(false);
      transaction.setConfirming();
      return;
    }

    maybeConfirmMissingReceipt(payload);
  };

  const handleBillingConfirm = () => {
    if (disableInteraction || !pendingPayments) return;
    setShowBillingConfirm(false);
    maybeConfirmMissingReceipt(pendingPayments);
  };

  const toggleSplitPayments = () => {
    if (disableInteraction) return;

    if (splitPayments) {
      setPayments({});
      setSelectedMethods([]);
    }
    setSplitPayments(!splitPayments);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleMainDialogChange}>
        <DialogContent
          closeDisabled={disableInteraction}
          onEscapeKeyDown={(event) => {
            if (disableInteraction) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (disableInteraction) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogDescription className="opacity-60 text-xs md:text-sm">
              Complete Rental {rentalNo} — Total Amount
            </DialogDescription>
            <DialogTitle className="text-3xl font-bold md:text-5xl">
              <span className="opacity-60">₱</span>
              {formatNumberWithCommas(totalAmount)}
            </DialogTitle>
          </DialogHeader>

          {!splitPayments && (
            <>
              <p className="text-xs md:text-sm">Payment Method:</p>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.value}
                    className={`hover:bg-green-500 hover:text-white ${
                      selectedMethods.includes(method.value) ? "selected" : ""
                    }`}
                    variant="outline"
                    onClick={() => handleMethodSelect(method.value)}
                    disabled={disableInteraction}
                  >
                    {method.label}
                  </Button>
                ))}
              </div>
            </>
          )}

          {splitPayments && (
            <>
              <p>Select payment methods and split amounts:</p>
              {paymentMethods.map((method) => (
                <div
                  key={method.value}
                  className="grid grid-cols-[0.5fr_1fr] gap-2"
                >
                  <Button
                    className={`payment-method-button ${
                      selectedMethods.includes(method.value) ? "selected" : ""
                    }`}
                    onClick={() => handleMethodSelect(method.value)}
                    disabled={disableInteraction}
                  >
                    {method.label}
                  </Button>
                  {selectedMethods.includes(method.value) && (
                    <Input
                      type="number"
                      min="0"
                      placeholder={`Enter amount for ${method.label}`}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      disabled={disableInteraction}
                      onChange={(e) =>
                        handlePaymentChange(method.value, e.target.value)
                      }
                    />
                  )}
                </div>
              ))}
            </>
          )}

          {splitPayments && <p>Total entered: {totalEntered}</p>}
          <Button
            className={`${
              splitPayments
                ? "bg-red-500 hover:bg-red-600"
                : "hover:bg-green-500 hover:text-white"
            }`}
            variant={splitPayments ? "default" : "outline"}
            onClick={toggleSplitPayments}
            disabled={disableInteraction}
          >
            {splitPayments ? "Cancel Split Payments" : "Split Payments"}
          </Button>

          {isProcessing && (
            <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Payment...</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Please wait.</p>
            </div>
          )}

          {transaction.isSuccess && transaction.successMessage && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {transaction.successMessage}
            </div>
          )}

          {transaction.isError && transaction.error && (
            <p className="text-sm text-destructive">{transaction.error}</p>
          )}

          <div className="grid grid-cols-[0.5fr_1fr] gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={disableInteraction}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isSubmitDisabled || disableInteraction}
            >
              {isProcessing ? "Processing..." : "Submit Payment"}
            </Button>
          </div>
          <ReceiptAttachmentField
            file={receiptFile}
            onFileChange={setReceiptFile}
            inputId="rental-receipt-upload"
            disabled={disableInteraction}
          />
        </DialogContent>
      </Dialog>

      {showConfirm && (
        <AlertDialog
          open={showConfirm}
          onOpenChange={(nextOpen) => {
            if (disableInteraction) return;
            setShowConfirm(nextOpen);
            if (!nextOpen) {
              transaction.setIdle();
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to process full payment with{" "}
                {confirmMethod.toUpperCase()} for ₱
                {formatNumberWithCommas(totalAmount)}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button
              variant="default"
              onClick={handleConfirmPayment}
              className="bg-green-500 hover:bg-green-600"
              disabled={disableInteraction}
            >
              {isProcessing ? "Processing..." : "Yes, Confirm"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (disableInteraction) return;
                setShowConfirm(false);
                transaction.setIdle();
              }}
              disabled={disableInteraction}
            >
              Cancel
            </Button>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <ReceiptMissingConfirmDialog
        open={showMissingReceiptConfirm}
        onOpenChange={(nextOpen) => {
          if (disableInteraction) return;
          setShowMissingReceiptConfirm(nextOpen);
          if (!nextOpen) {
            transaction.setIdle();
          }
        }}
        onAttachNow={() => {
          if (disableInteraction) return;
          setShowMissingReceiptConfirm(false);
          transaction.setIdle();
        }}
        onContinueWithoutReceipt={() => {
          if (!pendingPayments || disableInteraction) return;
          void runSubmission(pendingPayments);
        }}
        disabled={disableInteraction}
      />
      {showBillingConfirm && (
        <AlertDialog
          open={showBillingConfirm}
          onOpenChange={(nextOpen) => {
            if (disableInteraction) return;
            setShowBillingConfirm(nextOpen);
            if (!nextOpen) {
              setPendingPayments(null);
              transaction.setIdle();
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                This payment will reflect in Billing Statement
              </AlertDialogTitle>
              <AlertDialogDescription>
                This rental is linked or transferred to billing. Confirming this
                payment will update the billing statement and remaining balance.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button
              variant="default"
              onClick={handleBillingConfirm}
              className="bg-green-500 hover:bg-green-600"
              disabled={disableInteraction}
            >
              Confirm & Update Billing
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (disableInteraction) return;
                setShowBillingConfirm(false);
                setPendingPayments(null);
                transaction.setIdle();
              }}
              disabled={disableInteraction}
            >
              Cancel
            </Button>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
