import { useState, useMemo, useCallback } from "react";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import {
  useEligibleJobOrders,
  useTransferJobOrderToBilling,
  useBillingAccount,
  useBillingAccountBalance,
} from "./useBilling";
import { formatNumberWithCommas } from "../../lib/helpers";
import toast from "react-hot-toast";
import TransactionDateDialog from "./transaction-date-dialog";
import { normalizeDateOnly, TransactionDateMode } from "../../lib/transaction-date";

interface AttachJobOrderPanelProps {
  accountId: string;
  clientId: number;
  onClose: () => void;
}

interface EligibleJobOrder {
  id: number;
  order_no: string;
  status: string;
  grand_total: number;
  downpayment: number;
  created_at: string;
  branch_id: number;
  labor_description: string;
  branches: { name: string };
}

export default function AttachJobOrderPanel({
  accountId,
  clientId,
  onClose,
}: AttachJobOrderPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [transferring, setTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState({
    current: 0,
    total: 0,
  });
  const [transactionDateDialogOpen, setTransactionDateDialogOpen] =
    useState(false);

  const { data: jobOrders, isLoading: josLoading } =
    useEligibleJobOrders(clientId);
  const { data: account } = useBillingAccount(accountId);
  const { data: balance } = useBillingAccountBalance(accountId);
  const transferMutation = useTransferJobOrderToBilling();

  const eligibleJOs = useMemo(
    () => (jobOrders ?? []) as EligibleJobOrder[],
    [jobOrders]
  );

  const filteredJOs = useMemo(() => {
    if (!search.trim()) return eligibleJOs;
    const q = search.toLowerCase();
    return eligibleJOs.filter(
      (jo) =>
        jo.order_no?.toLowerCase().includes(q) ||
        jo.labor_description?.toLowerCase().includes(q) ||
        jo.branches?.name?.toLowerCase().includes(q)
    );
  }, [eligibleJOs, search]);

  const remainingBalance = useCallback(
    (jo: EligibleJobOrder) => (jo.grand_total || 0) - (jo.downpayment || 0),
    []
  );

  const selectedTotal = useMemo(
    () =>
      eligibleJOs
        .filter((jo) => selectedIds.has(jo.id))
        .reduce((sum, jo) => sum + remainingBalance(jo), 0),
    [eligibleJOs, selectedIds, remainingBalance]
  );
  const selectedJobOrders = useMemo(
    () => eligibleJOs.filter((jo) => selectedIds.has(jo.id)),
    [eligibleJOs, selectedIds]
  );
  const previewSourceDate = useMemo(
    () => normalizeDateOnly(selectedJobOrders[0]?.created_at) || null,
    [selectedJobOrders]
  );

  const creditLimit =
    (account as { credit_limit?: number })?.credit_limit ?? 0;
  const currentBalance =
    (balance as { total_balance?: number })?.total_balance ?? 0;
  const exceedsCreditLimit =
    creditLimit > 0 && currentBalance + selectedTotal > creditLimit;

  function handleToggle(joId: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(joId);
      else next.delete(joId);
      return next;
    });
  }

  async function handleTransferWithDate(selection: {
    mode: TransactionDateMode;
    transactionDate: string;
  }) {
    const selected = selectedJobOrders;
    if (selected.length === 0) return;

    setTransferring(true);
    setTransferProgress({ current: 0, total: selected.length });

    let successCount = 0;

    for (let i = 0; i < selected.length; i++) {
      setTransferProgress({ current: i + 1, total: selected.length });
      try {
        const sourceDate = normalizeDateOnly(selected[i].created_at);
        const transactionDate =
          selection.mode === "source" ? sourceDate : selection.transactionDate;

        if (!transactionDate) {
          throw new Error(
            `Source date is unavailable for ${selected[i].order_no || `JO #${selected[i].id}`}.`
          );
        }

        await transferMutation.mutateAsync({
          joId: selected[i].id,
          accountId,
          transactionDate,
        });
        successCount++;
      } catch (error) {
        // Error toast handled by mutation hook
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes("source date is unavailable")
        ) {
          toast.error(error.message);
        }
      }
    }

    setTransferring(false);

    if (successCount > 0) {
      toast.success(
        `Transferred ${successCount} job order${successCount > 1 ? "s" : ""}`
      );
      onClose();
      return;
    }

    throw new Error("No job orders were transferred.");
  }

  function getStatusVariant(
    status: string
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status?.toLowerCase()) {
      case "completed":
        return "default";
      case "in_progress":
      case "ongoing":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  }

  return (
    <div>
      {/* ── Search ───────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
          Search Job Orders
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search JO number, description..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Credit Limit Warning */}
      {exceedsCreditLimit && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 mt-3">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Credit limit will be exceeded</p>
            <p className="text-[10px] mt-0.5">
              Balance + Transfer = ₱
              {formatNumberWithCommas(
                Math.round((currentBalance + selectedTotal) * 100) / 100
              )}{" "}
              / Limit: ₱{formatNumberWithCommas(Math.round(creditLimit * 100) / 100)}
            </p>
          </div>
        </div>
      )}

      {/* ── Available Job Orders ─────────────────────────────── */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
          Available Job Orders
        </h2>

        {josLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Loading job orders...</span>
          </div>
        ) : filteredJOs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {search
              ? "No job orders match your search."
              : "No eligible job orders found."}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {filteredJOs.map((jo) => {
              const remaining = remainingBalance(jo);
              const isSelected = selectedIds.has(jo.id);

              return (
                <div
                  key={jo.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 hover:bg-muted/50"
                  }`}
                  onClick={() => handleToggle(jo.id, !isSelected)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleToggle(jo.id, !!checked)
                    }
                    className="mt-0.5"
                    disabled={transferring}
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold">
                        {jo.order_no}
                      </span>
                      <Badge
                        variant={getStatusVariant(jo.status)}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {jo.status?.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {jo.branches?.name}
                      </span>
                    </div>
                    {jo.labor_description && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {jo.labor_description}
                      </p>
                    )}
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>Total: ₱{formatNumberWithCommas(jo.grand_total || 0)}</span>
                      <span className="font-bold text-foreground">
                        Balance: ₱{formatNumberWithCommas(remaining)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Summary ──────────────────────────────────────────── */}
      <div className="border-b py-2 mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <span className="font-semibold">
            Total: ₱
            {formatNumberWithCommas(
              Math.round(selectedTotal * 100) / 100
            )}
          </span>
        </div>
      </div>

      {transferring && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Transferring {transferProgress.current}/{transferProgress.total}...
        </p>
      )}

      {/* ── Actions ─ same layout as edit form ──────────────── */}
      <div className="flex md:flex-row flex-col md:justify-between mt-4">
        <Button
          type="button"
          onClick={() => setTransactionDateDialogOpen(true)}
          disabled={selectedIds.size === 0 || transferring}
        >
          {transferring ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {transferProgress.current}/{transferProgress.total}..
            </>
          ) : (
            "Transfer"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={transferring}
        >
          Cancel
        </Button>
      </div>

      <TransactionDateDialog
        open={transactionDateDialogOpen}
        onOpenChange={setTransactionDateDialogOpen}
        sourceLabel="Job Order"
        sourceDate={previewSourceDate}
        itemCount={selectedJobOrders.length}
        defaultMode="source"
        pending={transferring}
        onConfirm={async ({ mode, transactionDate }) => {
          await handleTransferWithDate({ mode, transactionDate });
        }}
      />
    </div>
  );
}
