import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
import { useGenerateBillingStatement } from "./useBilling";
import { supabase } from "../../services/supabase";
import { useTransactionHandler } from "../../hooks/useTransactionHandler";
import { markSoaStep } from "../../lib/soa-progress";
import { getServerNow } from "../../lib/server-time";

interface GenerateStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  clientId: number;
}

function todayString() {
  return getServerNow().toISOString().split("T")[0];
}

export default function GenerateStatementDialog({
  open,
  onOpenChange,
  accountId,
}: GenerateStatementDialogProps) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState(todayString());
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  const generateStatement = useGenerateBillingStatement();
  const transaction = useTransactionHandler();
  const isProcessing = transaction.isLoading;

  // Fetch branches
  useEffect(() => {
    async function fetchBranches() {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .order("name");
      if (data) setBranches(data);
    }
    if (open) {
      fetchBranches();
    }
  }, [open]);

  function resetForm() {
    setPeriodStart("");
    setPeriodEnd(todayString());
    setBranchFilter("all");
    transaction.reset();
  }

  function handleDialogChange(nextOpen: boolean) {
    if (!nextOpen && isProcessing) return;
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodStart || !periodEnd) return;

    void transaction.run(
      async () => {
        await generateStatement.mutateAsync({
          accountId,
          periodStart,
          periodEnd,
          branchFilter: branchFilter === "all" ? undefined : Number(branchFilter),
        });
      },
      {
        errorMessage: "Failed to generate statement. Please try again.",
        successMessage: "Statement generated successfully.",
      }
    ).then((success) => {
      if (!success) return;
      markSoaStep("generate_statement");
      resetForm();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        className="sm:max-w-md"
        closeDisabled={isProcessing}
        onEscapeKeyDown={(event) => {
          if (isProcessing) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isProcessing) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Generate Statement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="period-start">Period Start</Label>
            <Input
              id="period-start"
              type="date"
              required
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period-end">Period End</Label>
            <Input
              id="period-end"
              type="date"
              required
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <Label>Branch</Label>
            <Select
              value={branchFilter}
              onValueChange={setBranchFilter}
              disabled={isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isProcessing && (
            <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Loader2 size={16} className="animate-spin" />
                <span>Generating Statement...</span>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!periodStart || !periodEnd || isProcessing}
            >
              {isProcessing ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
