import { ReceiptText } from "lucide-react";
import { JobOrderData } from "../../lib/types";
import { Separator } from "../ui/separator";
import { getStatusClass } from "../../lib/helpers";
import { getStatusIconAndClass } from "../utils";

interface JobOrdersListProps {
  jobOrders: JobOrderData[];
  onJobOrderClick: (jobOrder: JobOrderData) => void;
}

export default function JobOrdersList({
  jobOrders,
  onJobOrderClick,
}: JobOrdersListProps) {
  return (
    <div className="border border-gray-300 rounded-lg px-4 py-3 flex flex-col h-[20.6rem]">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <ReceiptText size={14} />
        Job Orders
      </h2>
      <Separator className="my-3" />
      <div className="mt-2 overflow-y-auto">
        {jobOrders.map((jobOrder, index) => (
          <div
            key={jobOrder.id}
            onClick={() => onJobOrderClick(jobOrder)}
            className={`grid grid-cols-[auto_1fr] justify-between pb-2 border-b border-gray-300 cursor-pointer mr-2 ${
              index !== 0 ? "mt-2" : ""
            }`}
          >
            <div className="flex gap-2">
              <div className="space-x-1 flex items-center">
                {getStatusIconAndClass(jobOrder.status).icon}
                <h3 className="text-sm font-bold">{jobOrder.clients.name}</h3>
              </div>
              <p className="text-xs opacity-60 self-end">
                ({jobOrder.order_no})
              </p>
            </div>
            <div className="justify-self-end">
              {jobOrder?.status && (
                <p
                  className={`cursor-pointer px-1 py-0.5 gap-0.5 rounded-full w-fit text-xs flex items-center font-bold ${getStatusClass(
                    jobOrder.status
                  )}`}
                >
                  {jobOrder.status}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
