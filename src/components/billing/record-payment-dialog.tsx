import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Separator } from "../ui/separator";
import { useBillingLineItems, useRecordBillingPayment } from "./useBilling";
import { RecordPaymentData, BillingLineItem } from "../../lib/billing-types";
import { formatNumberWithCommas } from "../../lib/helpers";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  clientId: number;
}

type AllocationMode = "fifo" | "manual";

interface LineItemAllocation {
  line_item_id: string;
  checked: boolean;
  amount: number;
  maxAmount: number;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
  { value: "online", label: "Online" },
  { value: "gcash", label: "GCash" },
  { value: "paymaya", label: "PayMaya" },
  { value: "grabpay", label: "GrabPay" },
  { value: "other", label: "Other" },
];

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  accountId,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [allocationMode, setAllocationMode] = useState<AllocationMode>("fifo");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<LineItemAllocation[]>([]);

  const { data: lineItems } = useBillingLineItems(
    allocationMode === "manual" ? accountId : undefined
  );
  const recordPayment = useRecordBillingPayment();

  const unpaidItems = useMemo(() => {
    if (!lineItems) return [];
    return (lineItems as BillingLineItem[]).filter(
      (item) => item.amount - (item.paid_amount || 0) > 0
    );
  }, [lineItems]);

  // Sync allocations state when unpaid items change
  useMemo(() => {
    if (allocationMode === "manual" && unpaidItems.length > 0) {
      setAllocations((prev) => {
        const existingMap = new Map(prev.map((a) => [a.line_item_id, a]));
        return unpaidItems.map((item) => {
          const remaining = item.amount - (item.paid_amount || 0);
          const existing = existingMap.get(item.id);
          return {
            line_item_id: item.id,
            checked: existing?.checked ?? false,
            amount: existing ? Math.min(existing.amount, remaining) : 0,
            maxAmount: remaining,
          };
        });
      });
    }
  }, [unpaidItems, allocationMode]);

  const parsedAmount = parseFloat(amount) || 0;

  const allocatedTotal = useMemo(
    () =>
      allocations
        .filter((a) => a.checked)
        .reduce((sum, a) => sum + a.amount, 0),
    [allocations]
  );

  const isManualValid =
    allocationMode === "manual"
      ? parsedAmount > 0 &&
        allocatedTotal > 0 &&
        Math.abs(allocatedTotal - parsedAmount) < 0.01
      : true;

  const canSubmit =
    parsedAmount > 0 &&
    paymentDate &&
    paymentMethod &&
    (allocationMode === "fifo" || isManualValid);

  function resetForm() {
    setAmount("");
    setPaymentDate(todayString());
    setPaymentMethod("cash");
    setReferenceNumber("");
    setAllocationMode("fifo");
    setNotes("");
    setAllocations([]);
  }

  function handleClose(value: boolean) {
    if (!value) resetForm();
    onOpenChange(value);
  }

  function handleToggleItem(lineItemId: string, checked: boolean) {
    setAllocations((prev) =>
      prev.map((a) =>
        a.line_item_id === lineItemId
          ? {
              ...a,
              checked,
              amount: checked ? Math.min(a.maxAmount, Math.max(a.amount, 0)) : 0,
            }
          : a
      )
    );
  }

  function handleAllocationAmount(lineItemId: string, value: string) {
    const num = parseFloat(value) || 0;
    setAllocations((prev) =>
      prev.map((a) =>
        a.line_item_id === lineItemId
          ? { ...a, amount: Math.min(num, a.maxAmount), checked: num > 0 }
          : a
      )
    );
  }

  async function handleSubmit() {
    const payload: RecordPaymentData = {
      billing_account_id: accountId,
      amount: parsedAmount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference_number: referenceNumber || undefined,
      notes: notes || undefined,
    };

    if (allocationMode === "manual") {
      payload.allocations = allocations
        .filter((a) => a.checked && a.amount > 0)
        .map((a) => ({ line_item_id: a.line_item_id, amount: a.amount }));
    }

    recordPayment.mutate(payload, {
      onSuccess: () => {
        handleClose(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                ₱
              </span>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-date">Payment Date</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-ref">Reference Number</Label>
            <Input
              id="payment-ref"
              placeholder="Optional"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          <Separator />

          {/* Allocation Mode */}
          <div className="space-y-1.5">
            <Label>Allocation Mode</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={allocationMode === "fifo" ? "default" : "outline"}
                onClick={() => setAllocationMode("fifo")}
              >
                Apply to balance
              </Button>
              <Button
                type="button"
                size="sm"
                variant={allocationMode === "manual" ? "default" : "outline"}
                onClick={() => setAllocationMode("manual")}
              >
                Apply to specific items
              </Button>
            </div>
          </div>

          {/* Manual Allocation List */}
          {allocationMode === "manual" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Unpaid Line Items</span>
                <span
                  className={
                    Math.abs(allocatedTotal - parsedAmount) < 0.01 && parsedAmount > 0
                      ? "text-green-600 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  Allocated: ₱{formatNumberWithCommas(Math.round(allocatedTotal * 100) / 100)} / ₱
                  {formatNumberWithCommas(Math.round(parsedAmount * 100) / 100)}
                </span>
              </div>

              {unpaidItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No unpaid line items found.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                  {unpaidItems.map((item) => {
                    const remaining = item.amount - (item.paid_amount || 0);
                    const alloc = allocations.find(
                      (a) => a.line_item_id === item.id
                    );
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-2 rounded hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={alloc?.checked ?? false}
                          onCheckedChange={(checked) =>
                            handleToggleItem(item.id, !!checked)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.description}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>Total: ₱{formatNumberWithCommas(item.amount)}</span>
                            <span>Paid: ₱{formatNumberWithCommas(item.paid_amount || 0)}</span>
                            <span className="font-medium text-foreground">
                              Remaining: ₱{formatNumberWithCommas(remaining)}
                            </span>
                          </div>
                        </div>
                        <div className="w-28 shrink-0">
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            step="0.01"
                            placeholder="0.00"
                            className="h-8 text-sm"
                            disabled={!alloc?.checked}
                            value={alloc?.checked ? alloc.amount || "" : ""}
                            onChange={(e) =>
                              handleAllocationAmount(item.id, e.target.value)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {parsedAmount > 0 &&
                allocatedTotal > 0 &&
                Math.abs(allocatedTotal - parsedAmount) >= 0.01 && (
                  <p className="text-sm text-destructive">
                    Allocation total (₱{formatNumberWithCommas(Math.round(allocatedTotal * 100) / 100)}) must
                    equal payment amount (₱{formatNumberWithCommas(Math.round(parsedAmount * 100) / 100)}).
                  </p>
                )}
            </div>
          )}

          <Separator />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-notes">Notes</Label>
            <textarea
              id="payment-notes"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || recordPayment.isPending}
          >
            {recordPayment.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
