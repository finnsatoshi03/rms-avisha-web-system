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
    [technician]
  );

  const getTechnicianWeeklyRevenueForMonth = (
    weekIndex: number,
    year: number,
    completedOrders: JobOrderData[],
    selectedMonth: number
  ) => {
    // Get the first day of the selected month
    const firstDayOfMonth = new Date(year, selectedMonth - 1, 1);
    // Get the start of the week for the first day of the month
    const startOfFirstWeek = new Date(firstDayOfMonth);
    startOfFirstWeek.setDate(
      firstDayOfMonth.getDate() - firstDayOfMonth.getDay()
    );

    // Calculate the start of the week based on the weekIndex
    const startOfWeek = new Date(startOfFirstWeek);
    startOfWeek.setDate(startOfFirstWeek.getDate() + weekIndex * 7);

    // Calculate the end of the week
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // If the week ends after the current month, limit the end date to the last day of the month
    const lastDayOfMonth = new Date(year, selectedMonth, 0);
    if (endOfWeek > lastDayOfMonth) {
      endOfWeek.setDate(lastDayOfMonth.getDate());
    }

    // Check if the week falls within the selected month
    if (
      startOfWeek.getMonth() + 1 !== selectedMonth &&
      endOfWeek.getMonth() + 1 !== selectedMonth
    ) {
      return null;
    }

    const weeklyCompletedOrders = completedOrders.filter((order) => {
      const orderDate = new Date(order.completed_at!);
      return orderDate >= startOfWeek && orderDate <= endOfWeek;
    });

    const weeklyRevenue = weeklyCompletedOrders.reduce(
      (sum, order) => sum + (order.grand_total ?? 0),
      0
    );

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    const startOfWeekFormatted = new Intl.DateTimeFormat(
      "en-US",
      options
    ).format(startOfWeek);
    const endOfWeekFormatted = new Intl.DateTimeFormat("en-US", options).format(
      endOfWeek
    );
    const weekRange = `${startOfWeekFormatted} - ${endOfWeekFormatted}`;

    return {
      weekIndex: weekIndex + 1,
      weekRange,
      revenue: weeklyRevenue,
    };
  };

  // Calculate weekly metrics for the current month
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
  const numberOfWeeksInMonth = Math.ceil(lastDayOfMonth / 7);
  const weeklyRevenueMetrics = Array.from(
    { length: numberOfWeeksInMonth },
    (_, index) => {
      const weekData = getTechnicianWeeklyRevenueForMonth(
        index,
        currentYear,
        completedOrders,
        currentMonth
      );

      return (
        weekData || {
          weekIndex: index + 1,
          weekRange: `Week ${index + 1}`,
          revenue: 0,
        }
      );
    }
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
              <h2 className="font-bold">
                Weekly Revenue Report for{" "}
                {new Intl.DateTimeFormat("en-US", { month: "long" }).format(
                  new Date()
                )}
              </h2>
              <div className="grid md:grid-cols-5 grid-cols-1 w-full gap-1 mt-1">
                {weeklyRevenueMetrics.map(
                  (
                    week: { revenue: number; weekRange: string },
                    index: number
                  ) => (
                    <div
                      className="px-2 py-3 rounded-lg border flex flex-col items-center justify-center"
                      key={index}
                    >
                      <p className="font-bold text-xl">
                        ₱{formatNumberWithCommas(week.revenue)}
                      </p>
                      <h1 className="text-xs opacity-80">Week {index + 1}</h1>
                      <h1 className="text-xs opacity-80">{week.weekRange}</h1>
                    </div>
                  )
                )}
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
