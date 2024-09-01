import { useMemo, useState } from "react";
import { TechnicianWithJobOrders, JobOrderData } from "../../lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CurrentJobOrderCard from "./current-job-order-card";
import RevenueBreakdown from "./revenue-breakdown";
import JobOrdersList from "./job-order-list";
import TechnicianPerformanceAnalytics from "./heatmap-chart";

export default function TechnicianDashboard({
  technician,
}: {
  technician: TechnicianWithJobOrders;
}) {
  const recentJobOrder = getRecentJobOrder(technician);
  const [currentJobOrder, setCurrentJobOrder] = useState<JobOrderData | null>(
    recentJobOrder
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const jobOrders = technician.joborders || [];

  const handleJobOrderClick = (jobOrder: JobOrderData) => {
    setCurrentJobOrder(jobOrder);
  };

  const isRecent = currentJobOrder?.id === recentJobOrder?.id;

  const completedOrders = useMemo(
    () =>
      technician?.joborders
        .filter((job: JobOrderData) => job.status.toLowerCase() === "completed")
        .map((job: JobOrderData) => ({
          ...job,
          users: technician,
        })),
    [technician]
  );

  const totalRevenue =
    technician?.joborders
      .filter((job: JobOrderData) => job.status === "Completed")
      .reduce(
        (acc: number, job: JobOrderData) => acc + Number(job.grand_total),
        0
      ) || 0;

  const monthlyRevenue = useMemo(() => {
    const months = Array(12).fill(0); // Initialize an array for 12 months with 0
    technician?.joborders.forEach((job: JobOrderData) => {
      if (job.status === "Completed") {
        const jobDate = new Date(job.completed_at || job.created_at);
        const monthIndex = jobDate.getMonth(); // Get month (0-11)
        months[monthIndex] += Number(job.grand_total); // Accumulate revenue for the month
      }
    });
    return months;
  }, [technician]);

  // Extract unique years from job orders for heatmap component
  const uniqueYears = useMemo(
    () =>
      technician?.joborders
        ? Array.from(
            new Set(
              technician.joborders.map((job: JobOrderData) =>
                new Date(job.created_at).getFullYear()
              )
            )
          )
        : [],
    [technician?.joborders]
  );

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
      <div className="grid xl:grid-cols-3 md:grid-cols-2 grid-cols-1 grid-rows-[auto_auto] gap-4 mt-4">
        {currentJobOrder && (
          <div className="flex flex-col">
            <CurrentJobOrderCard
              jobOrder={currentJobOrder}
              technician={technician}
              isRecent={isRecent}
            />
          </div>
        )}
        {jobOrders && jobOrders.length > 0 && (
          <div className="flex flex-col">
            <JobOrdersList
              jobOrders={jobOrders}
              onJobOrderClick={handleJobOrderClick}
            />
          </div>
        )}
        <div className="md:row-span-2 xl:col-span-1 md:col-span-2 col-span-1">
          <RevenueBreakdown
            totalRevenue={totalRevenue}
            completedOrders={completedOrders}
            monthlyRevenue={monthlyRevenue}
          />
        </div>
        <div className="md:col-span-2 md:block hidden">
          <TechnicianPerformanceAnalytics
            completedOrders={completedOrders}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            uniqueYears={uniqueYears as number[]}
            techPage
          />
        </div>
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
