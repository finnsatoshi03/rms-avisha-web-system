import { useState, useEffect } from "react";
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
import { useGenerateBillingStatement, useBillingStatements } from "./useBilling";
import { useBillingAccount } from "./useBilling";
import { supabase } from "../../services/supabase";
import { BillingStatement } from "../../lib/billing-types";

interface GenerateStatementPanelProps {
  accountId: string;
  onClose: () => void;
  onGenerated?: () => void;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getAutoperiod(
  cutoffDay: number,
  lastStatement?: BillingStatement
): { start: string; end: string } {
  const now = new Date();

  // If there's a last statement, start from the day after its period_end
  if (lastStatement?.period_end) {
    const lastEnd = new Date(lastStatement.period_end);
    const start = new Date(lastEnd);
    start.setDate(start.getDate() + 1);

    // End = cutoff day of next month or end of current month
    let end: Date;
    if (cutoffDay === 1) {
      end = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
    } else {
      end = new Date(now.getFullYear(), now.getMonth(), cutoffDay - 1);
    }
    // If end is before start, push to next month
    if (end <= start) {
      if (cutoffDay === 1) {
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else {
        end = new Date(now.getFullYear(), now.getMonth() + 1, cutoffDay - 1);
      }
    }

    return { start: toDateStr(start), end: toDateStr(end) };
  }

  // No previous statement - use previous month based on cutoff
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), cutoffDay);
  let end: Date;
  if (cutoffDay === 1) {
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    end = new Date(now.getFullYear(), now.getMonth(), cutoffDay - 1);
  }

  return { start: toDateStr(start), end: toDateStr(end) };
}

export default function GenerateStatementPanel({
  accountId,
  onClose,
  onGenerated,
}: GenerateStatementPanelProps) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  const generateStatement = useGenerateBillingStatement();
  const { data: account } = useBillingAccount(accountId);
  const { data: statements } = useBillingStatements(accountId);

  // Auto-populate dates
  useEffect(() => {
    if (!account) return;
    const cutoffDay = account.billing_cutoff_day || 1;
    const sortedStatements = [...(statements as BillingStatement[] || [])]
      .sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime());
    const lastStatement = sortedStatements[0];

    const { start, end } = getAutoperiod(cutoffDay, lastStatement);
    setPeriodStart(start);
    setPeriodEnd(end);
  }, [account, statements]);

  useEffect(() => {
    async function fetchBranches() {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .order("name");
      if (data) setBranches(data);
    }
    fetchBranches();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodStart || !periodEnd) return;

    generateStatement.mutate(
      {
        accountId,
        periodStart,
        periodEnd,
        branchFilter:
          branchFilter === "all" ? undefined : Number(branchFilter),
      },
      {
        onSuccess: () => {
          onClose();
          onGenerated?.();
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Statement Period ─────────────────────────────────── */}
      <div>
        <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
          Statement Period
        </h2>
        <p className="text-[11px] text-muted-foreground mb-2">
          Dates are auto-calculated based on billing cutoff day ({account?.billing_cutoff_day || 1}) and the last generated statement.
        </p>
        <div className="grid md:grid-cols-2 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Period Start *</p>
            <Input
              type="date"
              required
              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Period End *</p>
            <Input
              type="date"
              required
              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">Filters</h2>

        <div className="border-b py-2">
          <div className="space-y-0 flex justify-between items-center w-full">
            <p className="text-sm font-medium leading-none">Branch</p>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Actions ─ same layout as edit form ──────────────── */}
      <div className="flex md:flex-row flex-col md:justify-between mt-4">
        <Button
          type="submit"
          disabled={!periodStart || !periodEnd || generateStatement.isPending}
        >
          {generateStatement.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating..
            </>
          ) : (
            "Generate Statement"
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
