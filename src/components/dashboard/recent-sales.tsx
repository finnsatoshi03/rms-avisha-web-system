import { Link } from "react-router-dom";
import { JobOrderData } from "../../lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export default function RecentSalesSection({
  completedOrders,
}: {
  completedOrders: JobOrderData[];
}) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const completedThisMonth = completedOrders.filter((order) => {
    // Use completed_at for completed or pull out orders
    const orderCompletionDate =
      order.status === "Completed" || order.status.toLowerCase() === "pull out"
        ? new Date(order.completed_at!)
        : new Date(order.created_at);

    return (
      orderCompletionDate.getMonth() === currentMonth &&
      orderCompletionDate.getFullYear() === currentYear
    );
  });

  const numberOfSales = completedThisMonth.length;

  const getBadgeVariant = (isFullyPaid: boolean, isPullout: boolean) => {
    if (isFullyPaid) return "secondary";
    if (isPullout) return "destructive";
    return "outline";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white h-[50vh] overflow-y-auto relative">
      <div className="sticky top-0 bg-white z-10 pt-4 px-5">
        <div className="flex justify-between w-full">
          <div>
            <h1 className="text-lg font-bold">Recent Sales</h1>
            <p className="text-xs opacity-60">
              You made {numberOfSales} sales this month
            </p>
          </div>
          <div className="self-start justify-self-start">
            <Link to={"/job-orders"} className="p-0">
              <Button
                className="text-xs bg-white text-black h-fit p-0"
                variant={"link"}
              >
                View All
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="py-4 px-5">
        {completedThisMonth.length > 0 ? (
          completedThisMonth.map((order: JobOrderData) => {
            // Determine the amount to display and payment status
            const isFullyPaid = order.status === "Completed";
            const isPullout = order.status.toLowerCase() === "pull out";
            const displayAmount = isFullyPaid
              ? order.adjustedGrandTotal
              : isPullout
              ? order.rate // Assuming 'rate' is the amount to display for pull out
              : order.downpayment ?? 0;

            const paymentStatus = isFullyPaid
              ? "Fully Paid"
              : isPullout
              ? "Pull Out"
              : "Downpayment";

            return (
              <div
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                key={order.order_no}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h1 className="font-bold truncate pr-2">
                      {order.clients.name}
                    </h1>
                    <Badge
                      variant={getBadgeVariant(isFullyPaid, isPullout)}
                      className={`flex-shrink-0 ${
                        isFullyPaid
                          ? "bg-green-100 text-green-700 border-green-200"
                          : isPullout
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                      }`}
                    >
                      {paymentStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs opacity-60 font-mono">
                      {order.order_no}
                    </p>
                    <p className="font-bold text-sm">
                      {formatCurrency(displayAmount ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-gray-500">No sales this month</p>
          </div>
        )}
      </div>
    </div>
  );
}
