import { useState, useMemo, useCallback } from "react";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import {
  useEligibleRentals,
  useTransferRentalToBilling,
  useBillingAccount,
  useBillingAccountBalance,
} from "./useBilling";
import { formatNumberWithCommas } from "../../lib/helpers";
import toast from "react-hot-toast";

interface AttachRentalPanelProps {
  accountId: string;
  clientId: number;
  onClose: () => void;
}

interface EligibleRental {
  id: number;
  rental_no: string;
  status: string;
  grand_total: number;
  downpayment: number;
  branch_id: number;
  rate_amount: number;
  consumables_total: number;
  discount: number;
  rental_type: string;
  branches: { name: string };
  rental_assets: { unit_name: string; model: string | null };
}

export default function AttachRentalPanel({
  accountId,
  clientId,
  onClose,
}: AttachRentalPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [transferring, setTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState({
    current: 0,
    total: 0,
  });

  const { data: rentals, isLoading: rentalsLoading } =
    useEligibleRentals(clientId);
  const { data: account } = useBillingAccount(accountId);
  const { data: balance } = useBillingAccountBalance(accountId);
  const transferMutation = useTransferRentalToBilling();

  const eligibleRentals = useMemo(
    () => (rentals ?? []) as EligibleRental[],
    [rentals]
  );

  const filteredRentals = useMemo(() => {
    if (!search.trim()) return eligibleRentals;
    const q = search.toLowerCase();
    return eligibleRentals.filter(
      (r) =>
        r.rental_no?.toLowerCase().includes(q) ||
        r.rental_assets?.unit_name?.toLowerCase().includes(q) ||
        r.rental_assets?.model?.toLowerCase().includes(q) ||
        r.branches?.name?.toLowerCase().includes(q)
    );
  }, [eligibleRentals, search]);

  const remainingBalance = useCallback(
    (r: EligibleRental) => (r.grand_total || 0) - (r.downpayment || 0),
    []
  );

  const selectedTotal = useMemo(
    () =>
      eligibleRentals
        .filter((r) => selectedIds.has(r.id))
        .reduce((sum, r) => sum + remainingBalance(r), 0),
    [eligibleRentals, selectedIds, remainingBalance]
  );

  const creditLimit =
    (account as { credit_limit?: number })?.credit_limit ?? 0;
  const currentBalance =
    (balance as { total_balance?: number })?.total_balance ?? 0;
  const exceedsCreditLimit =
    creditLimit > 0 && currentBalance + selectedTotal > creditLimit;

  function handleToggle(rentalId: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(rentalId);
      else next.delete(rentalId);
      return next;
    });
  }

  async function handleTransfer() {
    const selected = eligibleRentals.filter((r) => selectedIds.has(r.id));
    if (selected.length === 0) return;

    setTransferring(true);
    setTransferProgress({ current: 0, total: selected.length });

    let successCount = 0;

    for (let i = 0; i < selected.length; i++) {
      setTransferProgress({ current: i + 1, total: selected.length });
      try {
        await transferMutation.mutateAsync({
          rentalId: selected[i].id,
          accountId,
        });
        successCount++;
      } catch {
        // Error toast handled by mutation hook
      }
    }

    setTransferring(false);

    if (successCount > 0) {
      toast.success(
        `Transferred ${successCount} rental${successCount > 1 ? "s" : ""}`
      );
      onClose();
    }
  }

  function getStatusVariant(
    status: string
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status?.toLowerCase()) {
      case "completed":
        return "default";
      case "released":
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
          Search Rentals
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rental number, asset..."
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

      {/* ── Available Rentals ─────────────────────────────── */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
          Available Rentals
        </h2>

        {rentalsLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Loading rentals...</span>
          </div>
        ) : filteredRentals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {search
              ? "No rentals match your search."
              : "No eligible rentals found."}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {filteredRentals.map((rental) => {
              const remaining = remainingBalance(rental);
              const isSelected = selectedIds.has(rental.id);

              return (
                <div
                  key={rental.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 hover:bg-muted/50"
                  }`}
                  onClick={() => handleToggle(rental.id, !isSelected)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleToggle(rental.id, !!checked)
                    }
                    className="mt-0.5"
                    disabled={transferring}
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold">
                        {rental.rental_no}
                      </span>
                      <Badge
                        variant={getStatusVariant(rental.status)}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {rental.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {rental.rental_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {rental.branches?.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {rental.rental_assets?.unit_name}
                      {rental.rental_assets?.model ? ` ${rental.rental_assets.model}` : ""}
                    </p>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>Fee: ₱{formatNumberWithCommas(rental.rate_amount || 0)}</span>
                      {(rental.consumables_total || 0) > 0 && (
                        <span>Consumables: ₱{formatNumberWithCommas(rental.consumables_total || 0)}</span>
                      )}
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
          onClick={handleTransfer}
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
    </div>
  );
}
