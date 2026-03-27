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
import { useGenerateBillingStatement } from "./useBilling";
import { supabase } from "../../services/supabase";

interface GenerateStatementPanelProps {
  accountId: string;
  onClose: () => void;
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export default function GenerateStatementPanel({
  accountId,
  onClose,
}: GenerateStatementPanelProps) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState(todayString());
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  const generateStatement = useGenerateBillingStatement();

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
