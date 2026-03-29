import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import { Search, AlertTriangle } from "lucide-react";
import {
  useEligibleRentals,
  useTransferRentalToBilling,
  useBillingAccount,
  useBillingAccountBalance,
} from "./useBilling";
import { formatNumberWithCommas } from "../../lib/helpers";
import toast from "react-hot-toast";

interface AttachRentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  clientId: number;
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

export default function AttachRentalDialog({
  open,
  onOpenChange,
  accountId,
  clientId,
}: AttachRentalDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [transferring, setTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState({ current: 0, total: 0 });

  const { data: rentals, isLoading: rentalsLoading } = useEligibleRentals(clientId);
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

  const creditLimit = (account as { credit_limit?: number })?.credit_limit ?? 0;
  const currentBalance = (balance as { total_balance?: number })?.total_balance ?? 0;
  const exceedsCreditLimit =
    creditLimit > 0 && currentBalance + selectedTotal > creditLimit;

  function handleToggle(rentalId: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(rentalId);
      } else {
        next.delete(rentalId);
      }
      return next;
    });
  }

  function handleClose(value: boolean) {
    if (transferring) return;
    if (!value) {
      setSearch("");
      setSelectedIds(new Set());
      setTransferProgress({ current: 0, total: 0 });
    }
    onOpenChange(value);
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
        // Error toast is handled by the mutation hook
      }
    }

    setTransferring(false);

    if (successCount > 0) {
      toast.success(
        `Successfully transferred ${successCount} rental${successCount > 1 ? "s" : ""} to billing`
      );
      handleClose(false);
    }
  }

  function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attach Rentals</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by rental number, asset, or branch..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Credit Limit Warning */}
          {exceedsCreditLimit && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Credit limit will be exceeded</p>
                <p className="text-xs mt-0.5">
                  Current balance: ₱{formatNumberWithCommas(Math.round(currentBalance * 100) / 100)}
                  {" + "}
                  Transfer: ₱{formatNumberWithCommas(Math.round(selectedTotal * 100) / 100)}
                  {" = "}
                  ₱{formatNumberWithCommas(Math.round((currentBalance + selectedTotal) * 100) / 100)}
                  {" / "}
                  Limit: ₱{formatNumberWithCommas(Math.round(creditLimit * 100) / 100)}
                </p>
              </div>
            </div>
          )}

          {/* Rentals List */}
          {rentalsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredRentals.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No rentals match your search."
                  : "No eligible rentals found for this client."}
              </p>
              {!search && (
                <p className="text-xs text-muted-foreground/70">
                  A rental needs a grand total greater than zero and must not already be transferred to billing.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-2">
              {filteredRentals.map((rental) => {
                const remaining = remainingBalance(rental);
                const isSelected = selectedIds.has(rental.id);

                return (
                  <div
                    key={rental.id}
                    className={`flex items-start gap-3 p-3 rounded-md border transition-colors cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                    onClick={() => handleToggle(rental.id, !isSelected)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleToggle(rental.id, !!checked)
                      }
                      className="mt-1"
                      disabled={transferring}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {rental.rental_no}
                        </span>
                        <Badge variant={getStatusVariant(rental.status)}>
                          {rental.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {rental.rental_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {rental.branches?.name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {rental.rental_assets?.unit_name}
                        {rental.rental_assets?.model ? ` ${rental.rental_assets.model}` : ""}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          Rental Fee: ₱{formatNumberWithCommas(rental.rate_amount || 0)}
                        </span>
                        {(rental.consumables_total || 0) > 0 && (
                          <span>
                            Consumables: ₱{formatNumberWithCommas(rental.consumables_total || 0)}
                          </span>
                        )}
                        <span>
                          DP: ₱{formatNumberWithCommas(rental.downpayment || 0)}
                        </span>
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

          <Separator />

          {/* Summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedIds.size} rental{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <span className="font-semibold text-base">
              Total to transfer: ₱{formatNumberWithCommas(Math.round(selectedTotal * 100) / 100)}
            </span>
          </div>

          {/* Transfer Progress */}
          {transferring && (
            <div className="text-sm text-muted-foreground text-center">
              Transferring {transferProgress.current}/{transferProgress.total}...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={transferring}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={selectedIds.size === 0 || transferring}
          >
            {transferring
              ? `Transferring ${transferProgress.current}/${transferProgress.total}...`
              : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
