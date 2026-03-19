import { useState, useEffect } from "react";
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="period-start" className="text-xs">
          Period Start *
        </Label>
        <Input
          id="period-start"
          type="date"
          required
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="period-end" className="text-xs">
          Period End *
        </Label>
        <Input
          id="period-end"
          type="date"
          required
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Branch</Label>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
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

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!periodStart || !periodEnd || generateStatement.isPending}
          className="flex-1"
        >
          {generateStatement.isPending ? "Generating..." : "Generate"}
        </Button>
      </div>
    </form>
  );
}
