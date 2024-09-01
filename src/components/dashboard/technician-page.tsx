import { useState } from "react";
import { TechnicianWithJobOrders, JobOrderData } from "../../lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CurrentJobOrderCard from "./current-job-order-card";
import JobOrdersList from "./job-order-list";

export default function TechnicianDashboard({
  technician,
}: {
  technician: TechnicianWithJobOrders;
}) {
  const recentJobOrder = getRecentJobOrder(technician);
  const [currentJobOrder, setCurrentJobOrder] = useState<JobOrderData | null>(
    recentJobOrder
  );
  const jobOrders = technician.joborders || [];

  const handleJobOrderClick = (jobOrder: JobOrderData) => {
    setCurrentJobOrder(jobOrder);
  };

  const isRecent = currentJobOrder?.id === recentJobOrder?.id;

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
      <div className="grid grid-cols-3 grid-rows-2 gap-4 mt-4">
        {currentJobOrder && (
          <div className="flex flex-col">
            <CurrentJobOrderCard
              jobOrder={currentJobOrder}
              technician={technician}
              isRecent={isRecent}
            />
          </div>
        )}
        {jobOrders.length > 0 && (
          <div className="flex flex-col">
            <JobOrdersList
              jobOrders={jobOrders}
              onJobOrderClick={handleJobOrderClick}
            />
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
