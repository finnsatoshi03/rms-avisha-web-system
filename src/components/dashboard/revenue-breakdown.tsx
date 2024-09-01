import { useMemo } from "react";
import { PhilippinePeso } from "lucide-react";
import { Separator } from "../ui/separator";
import { formatNumberWithCommas } from "../../lib/helpers";
import OverviewCard from "../technicians/overview-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { JobOrderData } from "../../lib/types";

// const gradientBackgrounds = [
//   "bg-gradient-to-b from-red-300 to-white",
//   "bg-gradient-to-b from-blue-300 to-white",
//   "bg-gradient-to-b from-purple-300 to-white",
//   "bg-gradient-to-b from-teal-300 to-white",
//   "bg-gradient-to-b from-green-300 to-white",
// ];

interface RevenueBreakdownProps {
  completedOrders: JobOrderData[];
  totalRevenue: number;
  monthlyRevenue: number[]; // Add this prop
}

export default function RevenueBreakdown({
  completedOrders,
  totalRevenue,
  monthlyRevenue, // Receive the monthly revenue
}: RevenueBreakdownProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
  const numberOfWeeksInMonth = Math.ceil(lastDayOfMonth / 7);

  const weeklyRevenueMetrics = useMemo(() => {
    return Array.from({ length: numberOfWeeksInMonth }, (_, index) => {
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
    });
  }, [completedOrders, currentMonth, currentYear, numberOfWeeksInMonth]);

  return (
    <div className="border border-gray-300 rounded-lg px-4 py-3 flex flex-col">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <PhilippinePeso size={14} />
        Revenue Breakdown
      </h2>
      <Separator className="my-3" />
      <h3 className="text-sm font-semibold text-center mb-2 p-2 rounded-lg bg-gray-100">
        {new Intl.DateTimeFormat("en-US", {
          month: "long",
          year: "numeric",
        }).format(new Date())}
      </h3>
      <OverviewCard
        label="Total Revenue"
        value={`₱${formatNumberWithCommas(totalRevenue)}`}
        description="Completed jobs"
      />
      <Tabs defaultValue="weekly" className="mt-4 mb-2">
        <TabsList className="w-full">
          <TabsTrigger value="weekly" className="w-full">
            Weekly
          </TabsTrigger>
          <TabsTrigger value="monthly" className="w-full">
            Monthly
          </TabsTrigger>
          <TabsTrigger value="yearly" className="w-full">
            Yearly
          </TabsTrigger>
        </TabsList>
        <TabsContent value="weekly" asChild>
          <div className="grid md:grid-cols-2 grid-cols-1 gap-1 mt-2">
            {weeklyRevenueMetrics.map(
              (week: { revenue: number; weekRange: string }, index: number) => (
                <div
                  className={`px-2 py-3 rounded-lg border flex flex-col items-center justify-center`}
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
        </TabsContent>
        <TabsContent value="monthly" asChild>
          <div className="grid md:grid-cols-3 grid-cols-1 gap-1 mt-2">
            {monthlyRevenue.map((revenue, index) => (
              <div
                className={`px-2 py-3 rounded-lg border flex flex-col items-center justify-center`}
                key={index}
              >
                <p className="font-bold text-xl">
                  ₱{formatNumberWithCommas(revenue)}
                </p>
                <h1 className="text-xs opacity-80">
                  {new Intl.DateTimeFormat("en-US", { month: "long" }).format(
                    new Date(0, index)
                  )}
                </h1>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="yearly" asChild>
          <div className="flex flex-col items-center mt-2">
            <div
              className={`px-2 py-3 rounded-lg border flex flex-col items-center justify-center`}
            >
              <p className="font-bold text-xl">
                ₱{formatNumberWithCommas(totalRevenue)}
              </p>
              <h1 className="text-xs opacity-80">Total Yearly Revenue</h1>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getTechnicianWeeklyRevenueForMonth(
  weekIndex: number,
  year: number,
  completedOrders: JobOrderData[],
  selectedMonth: number
) {
  const firstDayOfMonth = new Date(year, selectedMonth - 1, 1);
  const startOfFirstWeek = new Date(firstDayOfMonth);
  startOfFirstWeek.setDate(
    firstDayOfMonth.getDate() - firstDayOfMonth.getDay()
  );

  const startOfWeek = new Date(startOfFirstWeek);
  startOfWeek.setDate(startOfFirstWeek.getDate() + weekIndex * 7);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const lastDayOfMonth = new Date(year, selectedMonth, 0);
  if (endOfWeek > lastDayOfMonth) {
    endOfWeek.setDate(lastDayOfMonth.getDate());
  }

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
  const startOfWeekFormatted = new Intl.DateTimeFormat("en-US", options).format(
    startOfWeek
  );
  const endOfWeekFormatted = new Intl.DateTimeFormat("en-US", options).format(
    endOfWeek
  );
  const weekRange = `${startOfWeekFormatted} - ${endOfWeekFormatted}`;

  return {
    weekIndex: weekIndex + 1,
    weekRange,
    revenue: weeklyRevenue,
  };
}
