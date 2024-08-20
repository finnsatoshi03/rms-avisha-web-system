/* eslint-disable @typescript-eslint/no-explicit-any */
import { differenceInDays, parseISO } from "date-fns";
import { formatMachineType, formatNumberWithCommas } from "../../lib/helpers";
import { JobOrderData, User } from "../../lib/types";
import { useState } from "react";
import { Button } from "../ui/button";
import JobOrderForm from "../job-order/job-order-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Separator } from "../ui/separator";

export default function CollapsibleRows({
  visibleColumns,
  client,
}: {
  visibleColumns: any[];
  client: any;
}) {
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [viewJobOrder, setViewJobOrder] = useState<JobOrderData | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);

  // Sort job orders by creation date
  const sortedJobOrders = (client.joborders as JobOrderData[]).sort(
    (a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at))
  );

  // Check if the most recent order is "Pending" and change its status to "New"
  if (
    sortedJobOrders.length > 0 &&
    sortedJobOrders[0].status === "Pending" &&
    differenceInDays(new Date(), parseISO(sortedJobOrders[0].created_at)) <= 3
  ) {
    sortedJobOrders[0].status = "New";
  }

  const displayedOrders = showAllOrders
    ? sortedJobOrders
    : sortedJobOrders.slice(0, 5);
  const remainingOrdersCount = sortedJobOrders.length - displayedOrders.length;

  const handleViewDetails = (order: JobOrderData) => {
    setViewJobOrder(order);
    setTechnicians([order.users]); // Assuming `order.users` contains the technician data
    setIsViewSheetOpen(true);
  };

  return (
    <>
      <tr className="px-4 pt-2">
        <td colSpan={visibleColumns.length + 4} className="border-b border-x">
          <div className="mx-14 mb-2 flex gap-10">
            <div className="flex flex-col gap-1">
              <h2 className="font-bold ml-4 relative">
                <span className="size-4 border-l-2 absolute -left-4 -top-2"></span>
                Orders
              </h2>
              {displayedOrders.map((order) => (
                <div key={order.order_no} className="flex ml-4 relative">
                  <span className="size-3 border-l-2 border-t-2 -rotate-90 absolute -left-4 -top-1"></span>
                  <span className="size-4 border-l-2 absolute -left-4 -top-4"></span>
                  <div className="text-xs grid grid-cols-4 gap-8 w-full">
                    <Button
                      className="text-xs items-start text-left w-fit h-fit p-0 group/modal-btn relative overflow-hidden"
                      variant={"link"}
                      onClick={() => handleViewDetails(order)}
                    >
                      <span className="group-hover/modal-btn:translate-x-40 text-center transition duration-500">
                        {`Order #${order.order_no}`}
                      </span>
                      <div className="-translate-x-40 group-hover/modal-btn:translate-x-0 flex absolute inset-0 transition duration-500 z-20">
                        View Details
                      </div>
                    </Button>
                    <p
                      className={`font-bold ${
                        order.status === "New"
                          ? "text-blue-600"
                          : order.status === "Pending"
                          ? "text-yellow-500"
                          : order.status === "For Approval"
                          ? "text-orange-400"
                          : order.status === "Repairing"
                          ? "text-orange-500"
                          : order.status === "Waiting Parts"
                          ? "text-purple-500"
                          : order.status.toLowerCase() === "ready for pickup"
                          ? "text-purple-600"
                          : order.status === "Completed"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {order.status}
                    </p>
                    <p>
                      <span className="font-semibold">₱</span>
                      {formatNumberWithCommas(order.grand_total ?? 0)}
                    </p>
                    <p>
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "Asia/Singapore",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {sortedJobOrders.length > 5 && (
                <Button
                  className="mt-2 text-xs font-bold items-start text-left w-fit h-fit p-0"
                  variant={"link"}
                  onClick={() => setShowAllOrders(!showAllOrders)}
                >
                  {showAllOrders
                    ? "Show Less"
                    : `Show ${remainingOrdersCount} remaining job order(s)`}
                </Button>
              )}
            </div>
            <div className="w-fit">
              <h3 className="font-bold">Repaired Items:</h3>
              <p className="text-xs">
                {sortedJobOrders
                  .map((order) => formatMachineType(order.machine_type))
                  .join(", ")}
              </p>
            </div>
          </div>
        </td>
      </tr>
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent className="min-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold">View Job Order</SheetTitle>
            <Separator className="my-2" />
            <JobOrderForm
              jobOrderToEdit={viewJobOrder ? viewJobOrder : undefined}
              readonly={true}
              technicians={technicians}
            />
          </SheetHeader>
          <SheetDescription></SheetDescription>
        </SheetContent>
      </Sheet>
    </>
  );
}
