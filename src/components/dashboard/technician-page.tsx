import { TechnicianWithJobOrders } from "../../lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CurrentJobOrderCard from "./current-job-order-card";
import JobOrdersList from "./job-order-list";

export default function TechnicianDashboard({
  technician,
}: {
  technician: TechnicianWithJobOrders;
}) {
  const recentJobOrder = getRecentJobOrder(technician);
  const jobOrders = technician.joborders || [];

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
          <div className="flex flex-col">
            <CurrentJobOrderCard
              jobOrder={recentJobOrder}
              technician={technician}
            />
          </div>
        )}
        {jobOrders.length > 0 && (
          <div className="flex flex-col">
            <JobOrdersList jobOrders={jobOrders} />
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
