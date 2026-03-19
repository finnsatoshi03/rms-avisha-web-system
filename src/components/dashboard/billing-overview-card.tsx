import { useNavigate } from "react-router-dom";
import { ReceiptText, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const hasOverdue = summary.overdue_accounts > 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate("/billing")}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ReceiptText size={16} />
          Billing Receivables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-2xl font-bold">
            ₱{formatNumberWithCommas(Number(summary.total_receivables))}
          </p>
          <p className="text-xs text-muted-foreground">Outstanding balance across all billing accounts</p>
        </div>

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
              {summary.overdue_accounts} account{summary.overdue_accounts > 1 ? "s" : ""} with overdue balances
            </span>
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full text-xs" onClick={(e) => { e.stopPropagation(); navigate("/billing"); }}>
          View All Accounts
        </Button>
      </CardContent>
    </Card>
  );
}
