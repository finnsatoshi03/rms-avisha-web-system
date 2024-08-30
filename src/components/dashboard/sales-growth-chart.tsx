/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { HandCoins, TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { aggregateByMonth, aggregateByWeek } from "../../lib/helpers";
import CustomToolTip from "./custom-tooltip";
import { JobOrderData, Metrics } from "../../lib/types";
import {
  Tooltip as TipTool,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import CountUp from "react-countup";
import { format, subDays } from "date-fns";

interface SalesGrowthChartProps {
  data: JobOrderData[];
  metrics: Metrics;
}

const SalesGrowthChart: React.FC<SalesGrowthChartProps> = ({
  data,
  metrics,
}) => {
  const [currentTab, setCurrentTab] = useState("day");
  const [currentMetrics, setCurrentMetrics] =
    useState<Partial<Metrics>>(metrics);
  const [tabStatus, setTabStatus] = useState({
    day: true,
    week: true,
    month: true,
  });

  const aggregateByDay = (data: JobOrderData[]) => {
    const result: { [key: string]: number } = {};

    data.forEach((order) => {
      let date: string | null = null;

      if (order.status === "Completed") {
        if (order.completed_at) {
          date = new Date(order.completed_at).toISOString().split("T")[0];
        } else {
          console.error(`Completed order missing completed_at date: ${order}`);
        }
      } else if (order.downpayment && order.downpayment > 0) {
        if (order.created_at) {
          date = new Date(order.created_at).toISOString().split("T")[0];
        } else {
          console.error(`Downpayment order missing created_at date: ${order}`);
        }
      }

      if (date) {
        if (!result[date]) {
          result[date] = 0;
        }
        const revenueAmount =
          order.status === "Completed"
            ? order.adjustedGrandTotal ?? 0
            : order.downpayment ?? 0;
        result[date] += revenueAmount;
      } else {
        console.warn(`Invalid date encountered: ${order}`);
      }
    });

    return Object.keys(result).map((date) => ({
      date,
      revenue: result[date],
    }));
  };

  const formattedData = aggregateByDay(data)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter((item) => {
      const date = new Date(item.date);
      const currentDate = new Date();
      return (
        date.getMonth() === currentDate.getMonth() &&
        date.getFullYear() === currentDate.getFullYear()
      );
    });

  const weeklyData = aggregateByWeek(data).filter((item: any) => {
    const date = new Date(item.date);
    const currentDate = new Date();
    return (
      date.getMonth() === currentDate.getMonth() &&
      date.getFullYear() === currentDate.getFullYear()
    );
  });

  const monthlyData = aggregateByMonth(data);

  const calculateMetrics = (tab: string) => {
    let filteredData: any[] = formattedData;
    let previousPeriodData: any[] = [];

    if (tab === "week") {
      filteredData = weeklyData.slice(-1); // current week
      previousPeriodData = weeklyData.slice(-2, -1); // last week
    } else if (tab === "month") {
      filteredData = monthlyData.slice(-1); // current month
      previousPeriodData = monthlyData.slice(-2, -1); // last month
    } else {
      const today = format(new Date(), "yyyy-MM-dd");
      filteredData = formattedData.filter((item) => item.date === today);
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
      previousPeriodData = formattedData.filter(
        (item) => item.date === yesterday
      );
    }

    const totalSales = filteredData.reduce(
      (acc, item) => acc + item.revenue,
      0
    );
    const previousPeriodSales = previousPeriodData.reduce(
      (acc, item) => acc + item.revenue,
      0
    );
    const pcpRevenue =
      previousPeriodSales !== 0
        ? ((totalSales - previousPeriodSales) / previousPeriodSales) * 100
        : 0;

    return {
      totalRevenue: totalSales,
      pcpRevenue,
    };
  };

  const currentMonth = new Date().toLocaleString("default", { month: "long" });

  useEffect(() => {
    const newMetricsDay = calculateMetrics("day");
    const newMetricsWeek = calculateMetrics("week");
    const newMetricsMonth = calculateMetrics("month");

    setCurrentMetrics(newMetricsDay);

    setTabStatus({
      day: newMetricsDay.totalRevenue !== 0,
      week: newMetricsWeek.totalRevenue !== 0,
      month: newMetricsMonth.totalRevenue !== 0,
    });

    if (!newMetricsDay.totalRevenue) {
      setCurrentTab("month");
    }
  }, [data]);

  useEffect(() => {
    const newMetrics = calculateMetrics(currentTab);
    setCurrentMetrics(newMetrics);
  }, [currentTab, data]);

  return (
    <Tabs
      defaultValue="day"
      className="sales-growth-chart border border-slate-300 py-4 px-5 rounded-xl h-[50vh] lg:col-span-1 col-span-2"
      value={currentTab}
      onValueChange={setCurrentTab}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold flex items-center gap-1">
          <HandCoins
            size={18}
            strokeWidth={1.5}
            color="#f12924"
            className="size-8 p-1.5 bg-slate-50 rounded-lg"
          />
          Sales Growth Over Time
          <TooltipProvider>
            <TipTool delayDuration={100}>
              <TooltipTrigger>
                <span className="p-0.5 ml-1 size-4 bg-gray-300 rounded-full text-white flex items-center justify-center">
                  i
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs w-[250px]">
                View detailed sales growth over time through an interactive line
                chart. The chart displays total revenue trends by day, week, and
                month, with dates on the X-axis for easy tracking of company
                performance periods.
              </TooltipContent>
            </TipTool>
          </TooltipProvider>
        </h3>
        <TabsList>
          <TabsTrigger
            value="day"
            className="w-fit font-bold text-xs"
            disabled={!tabStatus.day}
          >
            Day
          </TabsTrigger>
          <TabsTrigger
            value="week"
            className="w-fit font-bold text-xs"
            disabled={!tabStatus.week}
          >
            Week
          </TabsTrigger>
          <TabsTrigger
            value="month"
            className="w-fit font-bold text-xs"
            disabled={!tabStatus.month}
          >
            Month
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="my-1 ml-2 flex justify-between">
        <div className="text-sm font-bold flex flex-col">
          <div className="flex gap-2 items-start">
            <p className="text-3xl">
              ₱
              <CountUp
                start={0}
                end={Number(currentMetrics.totalRevenue)}
                duration={1}
                separator=","
                decimals={2}
                decimal="."
                prefix=""
              />
            </p>
            <div>
              <span
                className={`flex text-xs items-center justify-center gap-2 w-fit mt-1 px-2 py-0.5 rounded-full font-bold font-mono ${
                  currentMetrics.pcpRevenue === 0
                    ? "bg-yellow-200 text-yellow-600"
                    : (currentMetrics?.pcpRevenue ?? 0) < 0
                    ? "bg-red-200 text-red-600"
                    : "bg-green-200 text-green-600"
                }`}
              >
                {currentMetrics.pcpRevenue === 0 ? (
                  "~ "
                ) : (currentMetrics?.pcpRevenue ?? 0) < 0 ? (
                  <TrendingDown size={20} />
                ) : (
                  <TrendingUp size={20} />
                )}
                {(currentMetrics?.pcpRevenue ?? 0)
                  .toFixed(2)
                  .replace(/[+-]/g, "")}
                %
              </span>
              <span className="opacity-60 font-normal text-xs">
                {currentTab === "day"
                  ? "from yesterday"
                  : currentTab === "week"
                  ? "from last week"
                  : "from last month"}
              </span>
            </div>
          </div>
        </div>
        <div className="text-xs self-end font-semibold">
          {currentTab === "day" || currentTab === "week" ? (
            <p>
              {currentTab === "day"
                ? `Today's total sales for ${currentMonth}`
                : `Total sales for ${currentMonth} this week`}
            </p>
          ) : null}
        </div>
      </div>
      <TabsContent value="day" className="w-full h-[34vh]">
        <ResponsiveContainer className="overflow-hidden">
          <LineChart
            data={formattedData}
            margin={{ top: 10, left: -20, bottom: 5 }}
          >
            <Legend
              iconType="circle"
              iconSize={5}
              wrapperStyle={{ fontSize: "12px" }}
            />
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={10}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip content={<CustomToolTip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#f12924"
              activeDot={{ r: 8 }}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>
      <TabsContent value="week" className="w-full h-[34vh]">
        <ResponsiveContainer className="overflow-hidden">
          <LineChart
            data={weeklyData}
            margin={{ top: 10, left: -20, bottom: 5 }}
          >
            <Legend
              iconType="circle"
              iconSize={5}
              wrapperStyle={{ fontSize: "12px" }}
            />
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={10}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip content={<CustomToolTip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#f12924"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>
      <TabsContent value="month" className="w-full h-[34vh]">
        <ResponsiveContainer className="overflow-hidden">
          <LineChart
            data={monthlyData}
            margin={{ top: 10, left: -20, bottom: 5 }}
          >
            <Legend
              iconType="circle"
              iconSize={5}
              wrapperStyle={{ fontSize: "12px" }}
            />
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={10}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip content={<CustomToolTip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#f12924"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>
    </Tabs>
  );
};

export default SalesGrowthChart;
