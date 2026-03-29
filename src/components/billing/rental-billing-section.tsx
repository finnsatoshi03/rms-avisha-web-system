import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReceiptText, ExternalLink, ArrowRight } from "lucide-react";
import { format } from "date-fns";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

import { RentalData } from "../../lib/types";
import { useUser } from "../auth/useUser";
import {
  useBillingAccountByClient,
  useTransferRentalToBilling,
  useBillingAccountBalance,
} from "./useBilling";
import { formatNumberWithCommas } from "../../lib/helpers";

interface RentalBillingSectionProps {
  rental: RentalData;
}

export default function RentalBillingSection({ rental }: RentalBillingSectionProps) {
  const navigate = useNavigate();
  const { isTechnician } = useUser();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const clientId = rental.client_id;
  const { data: billingAccount, isLoading } = useBillingAccountByClient(clientId);
  const { data: balance } = useBillingAccountBalance(billingAccount?.id);
  const transferMutation = useTransferRentalToBilling();

  const remainingBalance = (rental.grand_total || 0) - (rental.downpayment || 0);
  const isTransferred = rental.transferred_to_billing;

  // Technicians should not see billing info
  if (isTechnician) return null;

  // If no billing account exists and not transferred, show nothing
  if (!isLoading && !billingAccount && !isTransferred) return null;

  if (isLoading) return null;

  const handleTransfer = async () => {
    if (!billingAccount) return;
    try {
      await transferMutation.mutateAsync({
        rentalId: rental.id,
        accountId: billingAccount.id,
      });
      setConfirmOpen(false);
    } catch {
      // Error handled by mutation hook
    }
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
              {rental.transferred_to_billing_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(rental.transferred_to_billing_at), "MMM d, yyyy")}
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
              No remaining balance to transfer.
            </p>
          </div>
        ) : null}
      </div>

      {/* Transfer confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transfer to Billing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Transfer the remaining balance of this rental to the billing account?
            </p>
            <div className="rounded-md bg-slate-50 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rental</span>
                <span className="font-mono">{rental.rental_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rental Fee</span>
                <span>₱{formatNumberWithCommas(rental.rate_amount || 0)}</span>
              </div>
              {(rental.consumables_total || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consumables</span>
                  <span>₱{formatNumberWithCommas(rental.consumables_total || 0)}</span>
                </div>
              )}
              {(rental.discount || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-₱{formatNumberWithCommas(rental.discount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grand Total</span>
                <span>₱{formatNumberWithCommas(rental.grand_total || 0)}</span>
              </div>
              {(rental.downpayment || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Downpayment</span>
                  <span>-₱{formatNumberWithCommas(rental.downpayment || 0)}</span>
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

            {billingAccount && billingAccount.credit_limit > 0 && balance !== undefined && (balance + remainingBalance) > billingAccount.credit_limit && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1.5 border border-amber-200">
                <span>
                  This transfer will exceed the credit limit by ₱
                  {formatNumberWithCommas(balance + remainingBalance - billingAccount.credit_limit)}. Proceed anyway?
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
