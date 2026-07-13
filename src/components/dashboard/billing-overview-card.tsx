import { useNavigate } from "react-router-dom";
import { ReceiptText, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { useBillingDashboardSummary } from "../billing/useBilling";
import { formatNumberWithCommas } from "../../lib/helpers";

interface BillingOverviewCardProps {
  branchId?: number;
}

export default function BillingOverviewCard({ branchId }: BillingOverviewCardProps) {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useBillingDashboardSummary(branchId);

  if (isLoading) {
    return (
      <div className="surface-card p-6 flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!summary) return null;

  const hasOverdue = summary.overdue_accounts > 0;
  const totalBilled =
    Number(summary.total_collected) + Number(summary.total_receivables);
  const collectedPct =
    totalBilled > 0
      ? Math.round((Number(summary.total_collected) / totalBilled) * 100)
      : 0;

  return (
    <div
      className="surface-card p-6 flex flex-col gap-4 cursor-pointer h-full min-h-0"
      onClick={() => navigate("/billing")}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Billing Receivables
        </h1>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft">
          <ReceiptText
            size={15}
            strokeWidth={1.75}
            className="text-brand-deep"
          />
        </span>
      </div>

      <div>
        <p className="font-display text-3xl font-bold tracking-tight text-foreground leading-none">
          ₱{formatNumberWithCommas(Number(summary.total_receivables))}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Outstanding across all accounts
        </p>
      </div>

      {/* Collection progress (collected vs total billed) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Collected</span>
          <span className="font-semibold text-foreground">{collectedPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${collectedPct}%` }}
          />
        </div>
      </div>

      {/* Stat tiles expand to fill the row height beside the chart */}
      <div className="grid flex-1 min-h-0 grid-cols-1 content-stretch gap-3">
        <div className="flex flex-col justify-center rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-700/80">Collected</p>
          <p className="font-display text-lg font-bold tracking-tight text-emerald-700">
            ₱{formatNumberWithCommas(Number(summary.total_collected))}
          </p>
        </div>
        <div
          className={`flex flex-col justify-center rounded-xl px-4 py-3 ${
            hasOverdue ? "bg-brand-soft" : "bg-muted/60"
          }`}
        >
          <p
            className={`text-xs ${
              hasOverdue ? "text-brand-deep/80" : "text-muted-foreground"
            }`}
          >
            Overdue
          </p>
          <p
            className={`font-display text-lg font-bold tracking-tight ${
              hasOverdue ? "text-brand-deep" : "text-muted-foreground"
            }`}
          >
            ₱{formatNumberWithCommas(Number(summary.total_overdue))}
          </p>
        </div>
      </div>

      {hasOverdue && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1.5 border border-amber-200">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>
            {summary.overdue_accounts} account
            {summary.overdue_accounts > 1 ? "s" : ""} overdue
          </span>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="mt-auto w-full text-xs"
        onClick={(e) => {
          e.stopPropagation();
          navigate("/billing");
        }}
      >
        View All Accounts
      </Button>
    </div>
  );
}
