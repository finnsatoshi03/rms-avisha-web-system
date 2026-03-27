import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { useBillingLineItems, useRecordBillingPayment } from "./useBilling";
import { RecordPaymentData, BillingLineItem } from "../../lib/billing-types";
import { formatNumberWithCommas } from "../../lib/helpers";

interface RecordPaymentPanelProps {
  accountId: string;
  onClose: () => void;
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

export default function RecordPaymentPanel({
  accountId,
  onClose,
}: RecordPaymentPanelProps) {
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

  function handleToggleItem(lineItemId: string, checked: boolean) {
    setAllocations((prev) =>
      prev.map((a) =>
        a.line_item_id === lineItemId
          ? {
              ...a,
              checked,
              amount: checked
                ? Math.min(a.maxAmount, Math.max(a.amount, 0))
                : 0,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
        onClose();
      },
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Payment Details ──────────────────────────────────── */}
      <div>
        <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
          Payment Details
        </h2>
        <div className="grid md:grid-cols-2 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Amount *</p>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-1">₱</span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Date</p>
            <Input
              type="date"
              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Method & Reference ───────────────────────────────── */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
          Method & Reference
        </h2>

        <div className="border-b py-2">
          <div className="space-y-0 flex justify-between items-center w-full">
            <p className="text-sm font-medium leading-none">Payment Method</p>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent align="end">
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-b py-2">
          <div className="space-y-0 flex justify-between items-center w-full">
            <p className="text-sm font-medium leading-none">Reference #</p>
            <Input
              placeholder="Optional"
              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Allocation ───────────────────────────────────────── */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
          Allocation
        </h2>

        <div className="border-b py-2">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={allocationMode === "fifo" ? "default" : "outline"}
              onClick={() => setAllocationMode("fifo")}
              className="text-xs h-7"
            >
              Apply to balance
            </Button>
            <Button
              type="button"
              size="sm"
              variant={allocationMode === "manual" ? "default" : "outline"}
              onClick={() => setAllocationMode("manual")}
              className="text-xs h-7"
            >
              Specific items
            </Button>
          </div>
        </div>

        {/* Manual Allocation List */}
        {allocationMode === "manual" && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium">Unpaid Items</span>
              <span
                className={
                  Math.abs(allocatedTotal - parsedAmount) < 0.01 &&
                  parsedAmount > 0
                    ? "text-green-600 font-medium"
                    : "text-muted-foreground"
                }
              >
                ₱{formatNumberWithCommas(Math.round(allocatedTotal * 100) / 100)}{" "}
                / ₱{formatNumberWithCommas(Math.round(parsedAmount * 100) / 100)}
              </span>
            </div>

            {unpaidItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">No unpaid items.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-2">
                {unpaidItems.map((item) => {
                  const remaining = item.amount - (item.paid_amount || 0);
                  const alloc = allocations.find(
                    (a) => a.line_item_id === item.id
                  );
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={alloc?.checked ?? false}
                        onCheckedChange={(checked) =>
                          handleToggleItem(item.id, !!checked)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {item.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Remaining: ₱{formatNumberWithCommas(remaining)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.01"
                        placeholder="0.00"
                        className="h-7 text-xs w-24"
                        disabled={!alloc?.checked}
                        value={alloc?.checked ? alloc.amount || "" : ""}
                        onChange={(e) =>
                          handleAllocationAmount(item.id, e.target.value)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {parsedAmount > 0 &&
              allocatedTotal > 0 &&
              Math.abs(allocatedTotal - parsedAmount) >= 0.01 && (
                <p className="text-xs text-destructive mt-1">
                  Allocation must equal payment amount.
                </p>
              )}
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">Notes</h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this payment..."
          rows={3}
          className="text-sm"
        />
      </div>

      {/* ── Actions ─ same layout as edit form ──────────────── */}
      <div className="flex md:flex-row flex-col md:justify-between mt-4">
        <Button
          type="submit"
          disabled={!canSubmit || recordPayment.isPending}
        >
          {recordPayment.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording..
            </>
          ) : (
            "Record Payment"
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
