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
    <div className="border border-slate-300 flex flex-col gap-2 rounded-lg h-[45vh] p-5 overflow-y-auto">
      <div>
        <h1 className="text-lg font-bold">Order Status</h1>
        <p className="text-xs opacity-60 flex items-center gap-1">
          <Activity className="size-3" />
          {totalOrders} total orders
        </p>
      </div>

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
