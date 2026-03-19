import { Badge } from "../ui/badge";
import { getStatusClass } from "../../lib/helpers";
import { Activity } from "lucide-react";

interface StatusOverviewProps {
  statusCounts: Record<string, number>;
}

export default function StatusOverview({ statusCounts }: StatusOverviewProps) {
  // Filter out statuses with 0 count
  const activeStatuses = Object.entries(statusCounts).filter(
    ([, count]) => count > 0
  );

  // Calculate total orders
  const totalOrders = Object.values(statusCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="border border-slate-200 flex flex-col gap-3 rounded-xl bg-white hover:shadow-sm transition-shadow duration-200 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-700 tracking-tight">Order Status</h1>
        <Activity size={16} strokeWidth={1.5} className="text-gray-400" />
      </div>
      <p className="text-xs text-muted-foreground">
        {totalOrders} total orders
      </p>

      <div className="space-y-3 min-h-0 flex-1">
        {activeStatuses.map(([status, count]) => (
          <div key={status} className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{status}</span>
            <Badge
              variant="outline"
              className={`font-bold ${getStatusClass(status)}`}
            >
              {count}
            </Badge>
          </div>
        ))}

        {activeStatuses.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No active orders</p>
          </div>
        )}
      </div>
    </div>
  );
}
