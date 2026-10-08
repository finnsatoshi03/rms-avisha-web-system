import React, { useEffect, useState } from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { formatNumberWithCommas } from "../../lib/helpers";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import ReceiptAttachmentField from "../billing/receipt-attachment-field";
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

const RECEIPT_INPUT_ID = "job-order-receipt-upload";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    payments: Record<string, number>,
    receiptFile?: File | null
  ) => Promise<void>;
  totalAmount: number;
  isBillingLinked?: boolean;
}

// Single-screen payment flow: method, receipt and billing notice are all inline,
// so there are no stacked confirmation dialogs.
export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onClose,
  onSubmit,
  totalAmount,
  isBillingLinked = false,
}) => {
  const [splitPayments, setSplitPayments] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [payments, setPayments] = useState<Record<string, number>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptWarned, setReceiptWarned] = useState(false);
  const transaction = useTransactionHandler();

  const isProcessing = transaction.isLoading;
  const totalEntered = selectedMethods.reduce(
    (sum, method) => sum + (payments[method] || 0),
    0
  );
  const remaining = totalAmount - totalEntered;
  const canSubmit = splitPayments
    ? selectedMethods.length > 0 && amountsMatch(totalEntered, totalAmount)
    : selectedMethods.length === 1;
  const singleMethodLabel = paymentMethods.find(
    (m) => m.value === selectedMethods[0]
  )?.label;

  useEffect(() => {
    if (!open && !isProcessing) {
      setSplitPayments(false);
      setSelectedMethods([]);
      setPayments({});
      setReceiptFile(null);
      setReceiptWarned(false);
      transaction.reset();
    }
  }, [open, isProcessing, transaction.reset]);

  const handleMethodSelect = (method: string) => {
    if (isProcessing) return;
    if (!splitPayments) {
      setSelectedMethods([method]);
      return;
    }
    if (selectedMethods.includes(method)) {
      setSelectedMethods(selectedMethods.filter((m) => m !== method));
      setPayments((prev) => {
        const next = { ...prev };
        delete next[method];
        return next;
      });
      return;
    }
    setSelectedMethods([...selectedMethods, method]);
  };

  const toggleSplitPayments = () => {
    if (isProcessing) return;
    setSplitPayments(!splitPayments);
    setSelectedMethods([]);
    setPayments({});
  };

  const handleSubmit = async () => {
    if (isProcessing || !canSubmit) return;

    // First click without a receipt only surfaces the inline warning.
    if (!receiptFile && !receiptWarned) {
      setReceiptWarned(true);
      return;
    }

    const payload = splitPayments
      ? Object.fromEntries(selectedMethods.map((m) => [m, payments[m] || 0]))
      : { [selectedMethods[0]]: totalAmount };

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

  const submitLabel = isProcessing
    ? "Processing..."
    : !receiptFile && receiptWarned
    ? "Submit without receipt"
    : splitPayments
    ? "Confirm split payment"
    : singleMethodLabel
    ? `Confirm ${singleMethodLabel} payment`
    : "Select a payment method";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isProcessing) onClose();
      }}
    >
      <DialogContent
        closeDisabled={isProcessing}
        className="max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(event) => {
          if (isProcessing) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isProcessing) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogDescription className="opacity-60 text-xs md:text-sm">
            Total Amount to Pay
          </DialogDescription>
          <DialogTitle className="text-3xl font-bold md:text-5xl">
            <span className="opacity-60">₱</span>
            {formatNumberWithCommas(totalAmount)}
          </DialogTitle>
        </DialogHeader>

        {isBillingLinked && (
          <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              This job order is linked to billing. This payment will update the
              billing statement and remaining balance.
            </span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm font-medium">
              {splitPayments ? "Payment methods" : "Payment method"}
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={toggleSplitPayments}
              disabled={isProcessing}
            >
              {splitPayments ? "Use a single method" : "Split across methods"}
            </Button>
          </div>

          <div
            className={cn(
              "grid gap-2",
              splitPayments ? "grid-cols-1" : "grid-cols-2"
            )}
          >
            {paymentMethods.map((method) => {
              const selected = selectedMethods.includes(method.value);
              return (
                <div
                  key={method.value}
                  className={cn(
                    splitPayments && "grid grid-cols-[0.6fr_1fr] gap-2"
                  )}
                >
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={selected}
                    className={cn(
                      "w-full",
                      selected &&
                        "border-green-600 bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                    )}
                    onClick={() => handleMethodSelect(method.value)}
                    disabled={isProcessing}
                  >
                    {method.label}
                  </Button>
                  {splitPayments && selected && (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Amount"
                      autoFocus
                      disabled={isProcessing}
                      value={payments[method.value] ?? ""}
                      onChange={(e) =>
                        setPayments((prev) => ({
                          ...prev,
                          [method.value]: Math.max(0, Number(e.target.value)),
                        }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {splitPayments && (
            <p
              className={cn(
                "text-xs",
                amountsMatch(totalEntered, totalAmount)
                  ? "text-green-700"
                  : "text-muted-foreground"
              )}
            >
              ₱{formatNumberWithCommas(totalEntered)} of ₱
              {formatNumberWithCommas(totalAmount)}
              {!amountsMatch(totalEntered, totalAmount) &&
                (remaining > 0
                  ? ` — ₱${formatNumberWithCommas(remaining)} remaining`
                  : ` — ₱${formatNumberWithCommas(-remaining)} over`)}
            </p>
          )}
        </div>

        <ReceiptAttachmentField
          file={receiptFile}
          onFileChange={setReceiptFile}
          inputId={RECEIPT_INPUT_ID}
          disabled={isProcessing}
        />

        {!receiptFile && receiptWarned && (
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              No receipt attached.{" "}
              <label
                htmlFor={RECEIPT_INPUT_ID}
                className="cursor-pointer font-medium underline"
              >
                Attach one
              </label>{" "}
              or submit without proof of payment.
            </span>
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

        <div className="grid grid-cols-[0.5fr_1fr] gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing && <Loader2 size={16} className="mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
