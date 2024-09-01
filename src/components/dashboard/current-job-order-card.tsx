import { Calendar, PhilippinePeso, Zap } from "lucide-react";
import { JobOrderData, User } from "../../lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { formatTimeAgo, getStatusClass } from "../../lib/helpers";
import { getStatusIconAndClass } from "../utils";

const formatName = (name: string): string => {
  const [firstName, lastName] = name.split(" ");
  return `${firstName} ${lastName ? lastName[0].toUpperCase() + "." : ""}`;
};

interface CurrentJobOrderCardProps {
  jobOrder: JobOrderData;
  technician: User;
  isRecent: boolean;
}

export default function CurrentJobOrderCard({
  jobOrder,
  technician,
  isRecent,
}: CurrentJobOrderCardProps) {
  return (
    <div className="border border-gray-300 rounded-lg px-4 py-3 flex flex-col">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <Zap size={14} />{" "}
        {isRecent ? "Recent Job Order" : `Job Order ${jobOrder?.order_no}`}
      </h2>
      <Separator className="my-3" />
      <h3 className="text-xs opacity-60 font-bold">Order Number</h3>
      <div className="my-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img src="RMS-icon.png" className="size-3" />
          <p className="text-sm font-semibold">{jobOrder?.order_no}</p>
        </div>
        {jobOrder?.status && (
          <p
            className={`cursor-pointer px-1 py-0.5 gap-0.5 rounded-full w-fit text-xs flex items-center font-bold ${getStatusClass(
              jobOrder.status
            )}`}
          >
            {getStatusIconAndClass(jobOrder.status).icon}
            {jobOrder.status}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <h3 className="text-xs opacity-60 font-bold">Receiver</h3>
          {jobOrder?.order_received_user ? (
            <div className="mt-1 flex gap-2 items-center">
              <Avatar className="size-6">
                <AvatarImage
                  src={jobOrder?.order_received_user?.avatar || ""}
                />
                <AvatarFallback>
                  {jobOrder?.order_received_user?.fullname
                    ? jobOrder?.order_received_user?.fullname[0].toUpperCase()
                    : jobOrder?.order_received_user?.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm">
                {jobOrder?.order_received_user?.fullname
                  ? formatName(jobOrder.order_received_user.fullname)
                  : jobOrder?.order_received_user?.email}
              </p>
            </div>
          ) : (
            <p className="text-sm">---</p>
          )}
        </div>
        <div>
          <h3 className="text-xs opacity-60 font-bold">Technician</h3>
          <div className="mt-1 flex gap-2 items-center">
            <Avatar className="size-6">
              <AvatarImage src={technician.avatar || ""} />
              <AvatarFallback>
                {technician.fullname
                  ? technician.fullname[0].toUpperCase()
                  : technician.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm">
              {technician.fullname
                ? formatName(technician.fullname)
                : technician.email}
            </p>
          </div>
        </div>
      </div>
      <h3 className="text-xs mt-2 opacity-60 font-bold">Client Name</h3>
      <p className="my-2 text-sm font-semibold">
        {jobOrder?.clients.name || "---"}
      </p>
      <h3 className="text-xs opacity-60 font-bold">Created At</h3>
      <div className="my-2 flex items-center gap-2">
        <Calendar size={14} />
        <p className="text-sm font-semibold">
          {jobOrder?.created_at
            ? formatTimeAgo(new Date(jobOrder.created_at))
            : ""}
        </p>
      </div>
      <h3 className="text-xs opacity-60 font-bold">Job Order Amount</h3>
      <div className="my-2 flex items-center gap-2">
        <PhilippinePeso size={14} />
        <p className="text-sm font-semibold">{jobOrder?.grand_total}</p>
      </div>
    </div>
  );
}
