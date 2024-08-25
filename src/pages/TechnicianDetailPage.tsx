import { BadgeCheck, Briefcase, ChevronLeft, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import OverviewCard from "../components/technicians/overview-card";
import { JobOrderData } from "../lib/types";
import { formatNumberWithCommas, getStatusClass } from "../lib/helpers";
import { useMemo, useState } from "react";
import TechnicianPerformanceAnalytics from "../components/dashboard/heatmap-chart";

export default function TechnicianDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Assume technician details are passed via state
  const technician = location.state?.technician;

  // Calculate stats based on job orders
  const totalRevenue =
    technician?.joborders
      .filter((job: JobOrderData) => job.status === "Completed")
      .reduce(
        (acc: number, job: JobOrderData) => acc + Number(job.grand_total),
        0
      ) || 0;

  const totalRepairs = technician?.joborders.filter(
    (job: JobOrderData) => job.status === "Completed"
  ).length;

  const activeJobs = technician?.joborders.filter(
    (job: JobOrderData) =>
      job.status !== "Completed" && job.status !== "Cancelled"
  ).length;

  const formatDate = (
    timestamp: string,
    options: Intl.DateTimeFormatOptions
  ) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", options);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Define state to manage selected year for the heatmap
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

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

  // Filter completed orders for the heatmap component
  const completedOrders = useMemo(
    () =>
      technician?.joborders
        .filter((job: JobOrderData) => job.status === "Completed")
        .map((job: JobOrderData) => ({
          ...job,
          users: technician, // Add the technician object to each job order
        })),
    [technician?.joborders, technician]
  );

  return (
    <div className="h-screen space-y-8 overflow-hidden">
      <header className="flex items-center space-x-4">
        <button onClick={handleGoBack}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold">Technician Profile</h1>
      </header>
      {technician ? (
        <div className="grid md:grid-cols-[0.3fr_1fr] grid-cols-1 gap-6 h-full">
          <div className="flex flex-col gap-4">
            <Avatar className="h-56 w-full self-center rounded-lg">
              <AvatarImage
                src={`${technician.avatar}`}
                alt={`@${technician.fullname?.replace(/\s+/g, "")}`}
              />
              <AvatarFallback className="rounded-lg">
                {technician.fullname?.[0]}
              </AvatarFallback>
            </Avatar>
            <h2 className="font-bold text-lg flex items-center">
              {technician.fullname}
              <BadgeCheck className="ml-1 text-white fill-green-400" />
            </h2>
            <div>
              <p className="text-xs flex items-center gap-1">
                <Mail size={13} /> {technician.email}
              </p>
              <p className="text-xs flex items-center gap-1">
                <Briefcase size={13} /> {technician.role}
              </p>
            </div>
          </div>
          {/* right */}
          <div className="space-y-4 overflow-y-auto">
            <div>
              <h2 className="font-bold">Overview</h2>
              <div className="grid grid-cols-3 gap-4">
                <OverviewCard
                  label="Total Revenue"
                  value={`₱${formatNumberWithCommas(totalRevenue)}`}
                  description="Completed jobs"
                />
                <OverviewCard
                  label="Total Repaired"
                  value={totalRepairs}
                  description="Completed repairs"
                />
                <OverviewCard
                  label="Active Jobs"
                  value={activeJobs}
                  description="Pending, Repairing, Ready for Pickup"
                />
              </div>
            </div>

            <div>
              <h2 className="font-bold">Job Orders</h2>
              <div className="border rounded-lg p-4">
                {technician.joborders.map(
                  (job: JobOrderData, index: number) => (
                    <div
                      key={job.id}
                      className={`py-3 grid grid-cols-[auto_1fr_0.5fr_auto] gap-8 ${
                        index !== 0 ? "mt-2" : ""
                      } ${
                        index !== technician.joborders.length - 1
                          ? "border-b"
                          : ""
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-bold text-lg leading-4">
                          {formatDate(job.created_at, { day: "numeric" })}
                        </p>
                        <p className="text-xs opacity-60">
                          {formatDate(job.created_at, { month: "short" })}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-lg leading-4">
                          {job.clients.name}
                        </p>
                        <p className="text-xs opacity-60">{job.order_no}</p>
                      </div>
                      <p
                        className={`cursor-pointer px-2 py-0.5 h-fit text-xs rounded-lg w-fit flex items-center font-bold ${getStatusClass(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </p>
                      <div className="text-right">
                        <p className="font-semibold text-sm leading-4">
                          ₱{formatNumberWithCommas(job.grand_total ?? 0)}
                        </p>
                        <p className="text-xs opacity-60">Grand Total</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="sm:block hidden">
              <TechnicianPerformanceAnalytics
                completedOrders={completedOrders}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                uniqueYears={uniqueYears as number[]}
                techPage
              />
            </div>
          </div>
        </div>
      ) : (
        <p>Technician details not available.</p>
      )}
    </div>
  );
}
