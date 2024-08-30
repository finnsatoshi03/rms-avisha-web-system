import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Package,
  Truck,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { TechnicianWithJobOrders } from "../../lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { formatTimeAgo, getStatusClass } from "../../lib/helpers";

const formatName = (name: string): string => {
  const [firstName, lastName] = name.split(" ");
  return `${firstName} ${lastName ? lastName[0].toUpperCase() + "." : ""}`;
};

export default function TechnicianDashboard({
  technician,
}: {
  technician: TechnicianWithJobOrders;
}) {
  const recentJobOrder = getRecentJobOrder(technician);

  return (
    <>
      <div className="flex gap-3">
        <Avatar className="size-12">
          <AvatarImage src={technician.avatar || ""} />
          <AvatarFallback>
            {technician.fullname
              ? technician.fullname[0].toUpperCase()
              : technician.email[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-md font-bold">
            {technician.fullname ? technician.fullname : technician.email}
          </h1>
          <p className="text-xs">Welcome back to RMS Avisha Enterprises 👋</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {recentJobOrder && (
          <div className="border rounded-lg px-4 py-3 flex flex-col">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Zap size={14} /> Recent Job Order
            </h2>
            <Separator className="my-3" />
            <h3 className="text-xs opacity-60 font-bold">Order Number</h3>
            <div className="my-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img src="RMS-icon.png" className="size-3" />
                <p className="text-sm font-semibold">
                  {recentJobOrder?.order_no}
                </p>
              </div>
              {recentJobOrder?.status && (
                <p
                  className={`cursor-pointer px-1 py-0.5 gap-0.5 rounded-full w-fit text-xs flex items-center font-bold ${getStatusClass(
                    recentJobOrder.status
                  )}`}
                >
                  {getStatusIconAndClass(recentJobOrder.status).icon}
                  {recentJobOrder.status}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <h3 className="text-xs opacity-60 font-bold">Receiver</h3>
                {recentJobOrder?.order_received_user ? (
                  <div className="mt-1 flex gap-2 items-center">
                    <Avatar className="size-6">
                      <AvatarImage
                        src={recentJobOrder?.order_received_user?.avatar || ""}
                      />
                      <AvatarFallback>
                        {recentJobOrder?.order_received_user?.fullname
                          ? recentJobOrder?.order_received_user?.fullname[0].toUpperCase()
                          : recentJobOrder?.order_received_user?.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm">
                      {recentJobOrder?.order_received_user?.fullname
                        ? formatName(
                            recentJobOrder.order_received_user.fullname
                          )
                        : recentJobOrder?.order_received_user?.email}
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
            <h3 className="text-xs opacity-60 font-bold">Created At</h3>
            <div className="my-2 flex items-center gap-2">
              <Calendar size={14} />
              <p className="text-sm font-semibold">
                {recentJobOrder?.created_at
                  ? formatTimeAgo(new Date(recentJobOrder.created_at))
                  : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function getRecentJobOrder(technician: TechnicianWithJobOrders) {
  if (!technician.joborders || technician.joborders.length === 0) {
    return null;
  }

  return technician.joborders.reduce((mostRecent, current) => {
    const mostRecentDate = new Date(
      mostRecent.completed_at || mostRecent.created_at
    );
    const currentDate = new Date(current.completed_at || current.created_at);

    return currentDate > mostRecentDate ? current : mostRecent;
  });
}

const getStatusIconAndClass = (status: string) => {
  switch (status) {
    case "Pending":
      return {
        icon: <Clock size={12} color="#5e4703" />,
      };
    case "For Approval":
      return {
        icon: <AlertCircle size={12} color="#5c3c00" />,
      };
    case "Repairing":
      return {
        icon: <Wrench size={12} color="#002144" />,
      };
    case "Waiting Parts":
      return {
        icon: <Package size={12} color="#490149" />,
      };
    case "Ready for Pickup":
      return {
        icon: <Truck size={12} color="#1c411d" />,
      };
    case "Completed":
      return {
        icon: <CheckCircle size={12} color="#414040" />,
      };
    default:
      return {
        icon: <XCircle size={12} color="#41120f" />,
      };
  }
};
