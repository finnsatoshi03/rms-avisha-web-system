import { formatNumberWithCommas } from "../../lib/helpers";
import { Link } from "react-router-dom";
import { JobOrderData } from "../../lib/types";
import { Button } from "../ui/button";

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

  return (
    <div className="border border-slate-300 rounded-lg h-[50vh] overflow-y-auto relative">
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
        {completedThisMonth.map((order: JobOrderData) => {
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
              className="flex items-center justify-between mt-2"
              key={order.order_no}
            >
              <div>
                <h1 className="text-sm font-bold">{order.clients.name}</h1>
                <p className="text-xs opacity-60">{order.order_no}</p>
              </div>
              <div className="grid grid-cols-[auto_1fr] space-x-4">
                <div
                  className={`px-3 py-0 h-fit self-center rounded-full text-xs ${
                    isFullyPaid
                      ? "bg-green-300"
                      : isPullout
                      ? "bg-red-300"
                      : "bg-yellow-300"
                  } flex items-center`}
                >
                  {paymentStatus}
                </div>
                <p className="font-bold text-right">
                  ₱{formatNumberWithCommas(displayAmount ?? 0)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
