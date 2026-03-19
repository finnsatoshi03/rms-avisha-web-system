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
      <div className="border border-slate-200 rounded-xl bg-white p-6 flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!summary) return null;

  const hasOverdue = summary.overdue_accounts > 0;

  return (
    <div
      className="border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-shadow duration-200 p-6 flex flex-col gap-3 cursor-pointer h-full"
      onClick={() => navigate("/billing")}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xs font-semibold text-gray-700 tracking-tight">
          Billing Receivables
        </h1>
        <ReceiptText size={16} strokeWidth={1.5} className="text-gray-400" />
      </div>

      <p className="text-2xl font-bold text-gray-900 leading-none">
        ₱{formatNumberWithCommas(Number(summary.total_receivables))}
      </p>
      <p className="text-xs text-muted-foreground">Outstanding across all accounts</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Collected</p>
          <p className="font-medium text-green-600">
            ₱{formatNumberWithCommas(Number(summary.total_collected))}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Overdue</p>
          <p className={`font-medium ${hasOverdue ? "text-red-600" : "text-muted-foreground"}`}>
            ₱{formatNumberWithCommas(Number(summary.total_overdue))}
          </p>
        </div>
      </div>

      {hasOverdue && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1.5 border border-amber-200">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>
            {summary.overdue_accounts} account{summary.overdue_accounts > 1 ? "s" : ""} overdue
          </span>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={(e) => { e.stopPropagation(); navigate("/billing"); }}
      >
        View All Accounts
      </Button>
    </div>
  );
}
