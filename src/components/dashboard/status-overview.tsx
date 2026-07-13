import { Badge } from "../ui/badge";
import { getStatusClass } from "../../lib/helpers";
import { Activity } from "lucide-react";

interface StatusOverviewProps {
  statusCounts: Record<string, number>;
}

export default function StatusOverview({ statusCounts }: StatusOverviewProps) {
  // Filter out statuses with 0 count
  const activeStatuses = Object.entries(statusCounts).filter(
    ([, count]) => count > 0,
  );

  // Calculate total orders
  const totalOrders = Object.values(statusCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <div className="surface-card flex flex-col gap-3 px-5 py-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold tracking-tight">
          Order Status
        </h1>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft">
          <Activity size={15} strokeWidth={1.75} className="text-brand-deep" />
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {totalOrders} total orders
      </p>

      <div className="space-y-3.5 min-h-0 flex-1">
        {activeStatuses.map(([status, count]) => (
          <div key={status} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/80">
                {status}
              </span>
              <Badge
                variant="outline"
                className={`font-bold ${getStatusClass(status)}`}
              >
                {count}
              </Badge>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primaryRed/70 transition-all duration-500"
                style={{
                  width: `${
                    totalOrders > 0
                      ? Math.max((count / totalOrders) * 100, 3)
                      : 0
                  }%`,
                }}
              />
            </div>
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
