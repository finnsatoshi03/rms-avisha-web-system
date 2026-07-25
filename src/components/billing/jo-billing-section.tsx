import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReceiptText, ExternalLink, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { DatePicker } from "../ui/date-picker";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

import { JobOrderData } from "../../lib/types";
import { useUser } from "../auth/useUser";
import {
  useBillingAccountByClient,
  useTransferJobOrderToBilling,
  useBillingAccountBalance,
} from "./useBilling";
import {
  deleteReceiptFile,
  updateSourceReceipt,
  uploadReceiptFile,
} from "../../services/apiBilling";
import { formatNumberWithCommas } from "../../lib/helpers";
import {
  formatDateLabel,
  normalizeDateOnly,
  resolveTransactionDateFromMode,
  TransactionDateMode,
} from "../../lib/transaction-date";
import { getServerNow } from "../../lib/server-time";

interface JoBillingSectionProps {
  jobOrder: JobOrderData;
}

export default function JoBillingSection({ jobOrder }: JoBillingSectionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isTechnician } = useUser();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [transactionDateMode, setTransactionDateMode] =
    useState<TransactionDateMode>("source");
  const [customTransactionDate, setCustomTransactionDate] = useState<
    string | null
  >(null);
  const [transactionDateError, setTransactionDateError] = useState<
    string | null
  >(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const clientId = jobOrder.client_id;
  const { data: billingAccount, isLoading } = useBillingAccountByClient(clientId);
  const { data: balance } = useBillingAccountBalance(billingAccount?.id);
  const transferMutation = useTransferJobOrderToBilling();
  const isTransactionBusy = transferMutation.isPending || isUploadingReceipt;

  const remainingBalance = (jobOrder.grand_total || 0) - (jobOrder.downpayment || 0);
  const isTransferred = jobOrder.transferred_to_billing;
  const hasMissingReceipt = !jobOrder.receipt_url;
  const sourceTransactionDate = normalizeDateOnly(jobOrder.created_at);
  const sourceTransactionDateLabel = formatDateLabel(sourceTransactionDate);
  const currentTransactionDateLabel = formatDateLabel(
    normalizeDateOnly(getServerNow())
  );

  useEffect(() => {
    if (!confirmOpen) return;
    setTransactionDateMode("source");
    setCustomTransactionDate(sourceTransactionDate);
    setTransactionDateError(null);
  }, [confirmOpen, sourceTransactionDate]);

  // Technicians should not see billing info
  if (isTechnician) return null;

  // If no billing account exists and not transferred, show nothing
  if (!isLoading && !billingAccount && !isTransferred) return null;

  if (isLoading) return null;

  const handleTransfer = async () => {
    if (!billingAccount) return;

    const resolved = resolveTransactionDateFromMode({
      mode: transactionDateMode,
      sourceDate: sourceTransactionDate,
      customDate: customTransactionDate,
    });
    if (resolved.error || !resolved.transactionDate) {
      setTransactionDateError(resolved.error || "Transaction date is required.");
      return;
    }

    try {
      await transferMutation.mutateAsync({
        joId: jobOrder.id,
        accountId: billingAccount.id,
        transactionDate: resolved.transactionDate,
      });
      setConfirmOpen(false);
    } catch {
      // Error handled by mutation hook
    }
  };

  const handleUploadReceipt = async (file: File | null) => {
    if (!file) return;

    let receiptPath: string | null = null;
    setIsUploadingReceipt(true);
    try {
      receiptPath = await uploadReceiptFile({
        sourceType: "job_order",
        sourceId: jobOrder.id,
        file,
      });

      await updateSourceReceipt("job_order", jobOrder.id, receiptPath);
      toast.success("Receipt attached to job order.");
      queryClient.invalidateQueries({ queryKey: ["job_order"] });
    } catch (error) {
      if (receiptPath) {
        try {
          await deleteReceiptFile(receiptPath);
        } catch (deleteError) {
          console.error("Failed to rollback receipt upload", deleteError);
        }
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to upload receipt."
      );
    } finally {
      setIsUploadingReceipt(false);
      if (receiptInputRef.current) {
        receiptInputRef.current.value = "";
      }
    }
  };

  const handleConfirmDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && isTransactionBusy) return;
    setConfirmOpen(nextOpen);
  };

  return (
    <>
      <Separator className="my-4" />
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ReceiptText size={16} className="text-pink-800" />
          <h4 className="font-semibold text-sm">Billing</h4>
        </div>

        {isTransferred ? (
          <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-pink-100 text-pink-800 border-pink-200">
                Transferred to Billing
              </Badge>
              {jobOrder.transferred_to_billing_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(jobOrder.transferred_to_billing_at), "MMM d, yyyy")}
                </span>
              )}
            </div>
            {billingAccount && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Account: <span className="font-mono font-medium text-foreground">{billingAccount.account_number}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => navigate(`/billing/${billingAccount.id}`)}
                >
                  View Account <ExternalLink size={12} />
                </Button>
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Amount transferred: </span>
              <span className="font-medium">₱{formatNumberWithCommas(remainingBalance)}</span>
            </div>
          </div>
        ) : billingAccount && remainingBalance > 0 ? (
          <div className="rounded-lg border border-dashed border-pink-300 bg-pink-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Billing account: <span className="font-mono font-medium text-foreground">{billingAccount.account_number}</span>
              </span>
              {balance !== undefined && (
                <span className="text-xs text-muted-foreground">
                  Balance: ₱{formatNumberWithCommas(Number(balance))}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              type="button"
              size="sm"
              className="w-full text-xs gap-1 border-pink-300 text-pink-800 hover:bg-pink-100"
              onClick={() => setConfirmOpen(true)}
            >
              Transfer to Billing <ArrowRight size={12} />
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Remaining balance of ₱{formatNumberWithCommas(remainingBalance)} will be transferred
            </p>
          </div>
        ) : billingAccount ? (
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Account: <span className="font-mono font-medium text-foreground">{billingAccount.account_number}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => navigate(`/billing/${billingAccount.id}`)}
              >
                View Account <ExternalLink size={12} />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              No remaining balance to transfer. Set a grand total on this job order first.
            </p>
          </div>
        ) : null}
      </div>

      {/* Transfer confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={handleConfirmDialogChange}>
        <DialogContent
          className="sm:max-w-[425px]"
          closeDisabled={isTransactionBusy}
          onEscapeKeyDown={(event) => {
            if (isTransactionBusy) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (isTransactionBusy) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Transfer to Billing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Transfer the remaining balance of this job order to the billing account?
            </p>
            <div className="rounded-md bg-slate-50 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Order</span>
                <span className="font-mono">{jobOrder.order_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grand Total</span>
                <span>₱{formatNumberWithCommas(jobOrder.grand_total || 0)}</span>
              </div>
              {(jobOrder.downpayment || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Downpayment</span>
                  <span>-₱{formatNumberWithCommas(jobOrder.downpayment || 0)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-medium">
                <span>Amount to Transfer</span>
                <span>₱{formatNumberWithCommas(remainingBalance)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>To Account</span>
                <span className="font-mono">{billingAccount?.account_number}</span>
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Transaction Date
              </p>
              <p className="text-xs text-muted-foreground">
                Choose which date should be used for this billing entry:
              </p>
              <RadioGroup
                value={transactionDateMode}
                onValueChange={(value) => {
                  setTransactionDateMode(value as TransactionDateMode);
                  setTransactionDateError(null);
                }}
                className="space-y-2"
                disabled={isTransactionBusy}
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    id={`jo-transfer-date-current-${jobOrder.id}`}
                    value="current"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor={`jo-transfer-date-current-${jobOrder.id}`}>
                      Use Current Date
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      [ {currentTransactionDateLabel} ]
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    id={`jo-transfer-date-source-${jobOrder.id}`}
                    value="source"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor={`jo-transfer-date-source-${jobOrder.id}`}>
                      Use Job Order Date
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      [ {sourceTransactionDateLabel} ]
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    id={`jo-transfer-date-custom-${jobOrder.id}`}
                    value="custom"
                  />
                  <div className="space-y-1">
                    <Label htmlFor={`jo-transfer-date-custom-${jobOrder.id}`}>
                      Use Custom Date
                    </Label>
                    <DatePicker
                      value={customTransactionDate || undefined}
                      onChange={(nextDate) => {
                        setCustomTransactionDate(nextDate);
                        setTransactionDateError(null);
                      }}
                      disabled={isTransactionBusy || transactionDateMode !== "custom"}
                      placeholder="Pick date"
                      className="text-xs"
                    />
                  </div>
                </div>
              </RadioGroup>
              {transactionDateError && (
                <p className="text-xs text-red-600">{transactionDateError}</p>
              )}
            </div>

            {billingAccount && billingAccount.credit_limit > 0 && balance !== undefined && (balance + remainingBalance) > billingAccount.credit_limit && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1.5 border border-amber-200">
                <span>
                  This transfer will exceed the credit limit by ₱
                  {formatNumberWithCommas(balance + remainingBalance - billingAccount.credit_limit)}. Proceed anyway?
                </span>
              </div>
            )}

            {hasMissingReceipt && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 space-y-2">
                <p className="text-xs text-amber-800">
                  ⚠ No Receipt Attached. This transaction has no proof of
                  payment. Would you like to attach a receipt now?
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={isTransactionBusy}
                >
                  {isUploadingReceipt ? "Uploading..." : "Upload Receipt"}
                </Button>
                <input
                  ref={receiptInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={isTransactionBusy}
                  onChange={(event) =>
                    handleUploadReceipt(event.target.files?.[0] || null)
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isTransactionBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={isTransactionBusy}
            >
              {transferMutation.isPending ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
