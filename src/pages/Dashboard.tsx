/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { endOfMonth, format, getYear, startOfMonth } from "date-fns";
import {
  AggregatedData,
  FinancialChartProps,
  GrossAndNetData,
  JobOrderData,
  Metrics,
  OverviewData,
} from "../lib/types";
import {
  calculateMetrics,
  allMonths,
  countJobOrdersByStatus,
} from "../lib/helpers";
import { Coins, CreditCard, Wallet, UsersRound } from "lucide-react";

import { TabsContent } from "../components/ui/tabs";
import HeaderText from "../components/ui/headerText";
import OverviewSection from "../components/dashboard/overview";
import BarChartSection from "../components/dashboard/bar-chart";
import RecentSalesSection from "../components/dashboard/recent-sales";
import DateRangePickerWithExport from "../components/dashboard/analytics-header-buttons";
import DashboardTabs from "../components/dashboard/dashboard-tabs";
import SalesGrowthChart from "../components/dashboard/sales-growth-chart";
import RevenuePerTechnicianPieChart from "../components/dashboard/pie-chart";
import PieChartComponent from "../components/dashboard/revenue-breakdown-chart";
import SalesByBranch from "../components/dashboard/sales-by-branch-chart";
import TechnicianPerformanceAnalytics from "../components/dashboard/heatmap-chart";
import { DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";
import { getJobOrders } from "../services/apiJobOrders";
import Loader from "../components/ui/loader";
import { useUser } from "../components/auth/useUser";
import { useExpenses } from "../components/expenses/useExpenses";
import ReportCard from "../components/dashboard/reports-card";
import OverviewCard from "../components/dashboard/overview-card";
import { DatePickerWithRange } from "../components/date-range-picker";
import SalesReportLineChart from "../components/dashboard/sales-report-line-chart";
import FinancialChart from "../components/dashboard/financial-chart";

export default function Dashboard() {
  const { isTaytay, isPasig } = useUser();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["job_orders"],
    queryFn: async () => {
      const jobOrders = await getJobOrders();
      return jobOrders.map((job) => ({
        ...job,
        created_at: job.created_at.split("T")[0],
      }));
    },
  });

  const job_orders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order: JobOrderData) =>
      isTaytay
        ? order.branches.location === "Taytay"
        : isPasig
        ? order.branches.location === "Pasig"
        : true
    );
  }, [orders, isTaytay, isPasig]);

  const { expenses, isLoading: isExpensesLoading } = useExpenses();

  const [reportsData, setReportsData] = useState<OverviewData[]>([]);
  const [overviewData, setOverviewData] = useState<OverviewData[]>([]);
  const [filteredMetrics, setFilteredMetrics] = useState<Metrics>({
    totalRevenue: 0,
    totalGross: 0,
    totalNet: 0,
    totalExpenses: 0,
    totalProfit: 0,
    metricsLastMonth: {},
    metricsThisMonth: {},
    numberOfClients: 0,
    numberOfSales: 0,
    averageOrderValue: 0,
    pcpRevenue: 0,
    pcpProfit: 0,
    pcpGross: 0,
    pcpNet: 0,
    pcpExpenses: 0,
    pcpSales: 0,
    pcpClients: 0,
    pcpAverageOrderValue: 0,
  });
  const [grossAndNetData, setGrossAndNetData] = useState<GrossAndNetData[]>([]);
  const [profitData, setProfitData] = useState<FinancialChartProps[]>([]);

  const [currentTab, setCurrentTab] = useState("overview");
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

  const defaultToDate = new Date();
  defaultToDate.setHours(23, 59, 59, 999);

  const [defaultFromDate, setDefaultFromDate] = useState<Date>(new Date());

  useEffect(() => {
    if (job_orders && job_orders.length > 0) {
      const earliestJobOrderDate = new Date(
        Math.min(
          ...job_orders.map((order) => new Date(order.created_at).getTime())
        )
      );

      // Check if expenses are available and find the earliest expense date
      const earliestExpenseDate =
        expenses && expenses.length > 0
          ? new Date(
              Math.min(
                ...expenses.map((expense) =>
                  new Date(expense.created_at).getTime()
                )
              )
            )
          : null;

      // Determine the overall earliest date
      const earliestDate = earliestExpenseDate
        ? new Date(
            Math.min(
              earliestJobOrderDate.getTime(),
              earliestExpenseDate.getTime()
            )
          )
        : earliestJobOrderDate;

      setDefaultFromDate(earliestDate);
      setDateRange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      });
    } else {
      const today = new Date();
      setDefaultFromDate(startOfMonth(today));
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    }
  }, [job_orders, expenses]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultFromDate || new Date(),
    to: defaultToDate,
  });

  useEffect(() => {
    if (job_orders && job_orders.length > 0) {
      const metrics = calculateMetrics(job_orders, expenses);

      setOverviewData([
        {
          header: "Total Revenue",
          value: metrics.totalRevenue,
          prefix: "₱",
          pcp:
            metrics.pcpRevenue >= 0
              ? `+${metrics.pcpRevenue.toFixed(2)}%`
              : `${metrics.pcpRevenue.toFixed(2)}%`,
          icon: Coins,
        },
        {
          header: "Total Profit",
          value: metrics.totalProfit,
          prefix: "₱",
          pcp:
            metrics.pcpProfit >= 0
              ? `+${metrics.pcpProfit.toFixed(2)}%`
              : `${metrics.pcpProfit.toFixed(2)}%`,
          icon: Wallet,
        },
        {
          header: "Clients",
          value: metrics.numberOfClients,
          prefix: "+",
          pcp:
            metrics.pcpClients >= 0
              ? `+${metrics.pcpClients}`
              : `${metrics.pcpClients}`,
          icon: UsersRound,
        },
        {
          header: "Sales",
          value: metrics.numberOfSales,
          prefix: "+",
          pcp:
            metrics.pcpSales >= 0
              ? `+${metrics.pcpSales}`
              : `${metrics.pcpSales}`,
          icon: CreditCard,
        },
      ]);
    }
  }, [job_orders, expenses]);

  useEffect(() => {
    if (job_orders && job_orders.length > 0) {
      const filteredOrders = job_orders.filter((order: JobOrderData) => {
        const orderDate =
          order.status === "Completed"
            ? new Date(order.completed_at!)
            : order.downpayment && order.downpayment > 0
            ? new Date(order.created_at)
            : null;

        if (!orderDate) return false;

        return (
          (!dateRange?.from || orderDate >= dateRange.from) &&
          (!dateRange?.to || orderDate <= dateRange.to)
        );
      });

      const metrics = calculateMetrics(filteredOrders, expenses, dateRange);

      // Create the formatted data for gross and net
      const formattedGrossAndNetData = metrics.monthlyMetrics.gross.map(
        (grossEntry, index) => ({
          month: grossEntry.month,
          gross: grossEntry.gross,
          net: metrics.monthlyMetrics.net[index]?.net || 0,
        })
      );

      // Set the formatted data in the state
      setGrossAndNetData(formattedGrossAndNetData);
      setProfitData(metrics.monthlyMetrics.profit);

      setReportsData([
        {
          header: "Total Profit",
          value: metrics.totalProfit,
          prefix: "₱",
          pcp:
            metrics.pcpProfit >= 0
              ? `+${metrics.pcpProfit.toFixed(2)}%`
              : `${metrics.pcpProfit.toFixed(2)}%`,
          icon: Wallet,
          monthlyMetrics: metrics.monthlyMetrics.profit,
          nameKey: "profit",
        },
        {
          header: "Total Gross",
          value: metrics.totalGross,
          prefix: "₱",
          pcp:
            metrics.pcpGross >= 0
              ? `+${metrics.pcpGross.toFixed(2)}%`
              : `${metrics.pcpGross.toFixed(2)}%`,
          icon: null,
          monthlyMetrics: metrics.monthlyMetrics.gross,
          weeklyMetrics: metrics.weeklyMetrics.map((week) => ({
            value: week?.gross,
            weekRange: week?.weekRange,
          })),
          nameKey: "gross",
        },
        {
          header: "Total Net",
          value: metrics.totalNet,
          prefix: "₱",
          pcp:
            metrics.pcpNet >= 0
              ? `+${metrics.pcpNet.toFixed(2)}%`
              : `${metrics.pcpNet.toFixed(2)}%`,
          icon: null,
          monthlyMetrics: metrics.monthlyMetrics.net,
          weeklyMetrics: metrics.weeklyMetrics.map((week) => ({
            value: week?.net,
            weekRange: week?.weekRange,
          })),
          nameKey: "net",
        },
        {
          header: "Total Expenses",
          value: metrics.totalExpenses,
          prefix: "₱",
          pcp:
            metrics.pcpExpenses >= 0
              ? `+${metrics.pcpExpenses.toFixed(2)}%`
              : `${metrics.pcpExpenses.toFixed(2)}%`,
          icon: null,
          monthlyMetrics: metrics.monthlyMetrics.expenses,
          weeklyMetrics: metrics.weeklyMetrics.map((week) => ({
            value: week?.expenses,
            weekRange: week?.weekRange,
          })),
          nameKey: "expenses",
        },
      ]);
    }
  }, [job_orders, expenses, dateRange]);

  const completedOrders = useMemo(() => {
    return job_orders
      ? job_orders
          .filter(
            (order: JobOrderData) =>
              order.status === "Completed" ||
              (order.downpayment && order.downpayment > 0)
          )
          .map((order: JobOrderData) => {
            let adjustedGrandTotal = order.grand_total ?? 0;

            if (order.materials) {
              const usedMaterialsTotal = order.materials.reduce(
                (total, material) => {
                  if (material.used) {
                    return total + material.quantity * material.unit_price;
                  }
                  return total;
                },
                0
              );

              adjustedGrandTotal -= usedMaterialsTotal;
            }

            if (order.downpayment) {
              adjustedGrandTotal += order.downpayment;
            }

            return { ...order, adjustedGrandTotal };
          })
      : [];
  }, [job_orders]);

  const filteredOrders = useMemo(() => {
    return job_orders
      ? job_orders
          .filter((order: JobOrderData) => {
            const orderDate =
              order.status === "Completed"
                ? new Date(order.completed_at!)
                : order.downpayment && order.downpayment > 0
                ? new Date(order.created_at)
                : null;

            if (!orderDate) return false;

            return (
              (!dateRange?.from || orderDate >= dateRange.from) &&
              (!dateRange?.to || orderDate <= dateRange.to)
            );
          })
          .map((order: JobOrderData) => {
            let adjustedGrandTotal = order.grand_total ?? 0;

            if (order.materials) {
              const usedMaterialsTotal = order.materials.reduce(
                (total, material) => {
                  if (material.used) {
                    return total + material.quantity * material.unit_price;
                  }
                  return total;
                },
                0
              );

              adjustedGrandTotal -= usedMaterialsTotal;
            }

            if (order.downpayment) {
              adjustedGrandTotal += order.downpayment;
            }

            return { ...order, adjustedGrandTotal };
          })
      : [];
  }, [job_orders, dateRange]);

  useEffect(() => {
    if (filteredOrders.length > 0) {
      const filteredMetrics = calculateMetrics(filteredOrders);
      setFilteredMetrics(filteredMetrics);
    }
  }, [filteredOrders]);

  const dataWithMonthNames = useMemo(
    () =>
      completedOrders.map((order: JobOrderData) => {
        const date = new Date(order.completed_at!);
        const monthName = date.toLocaleString("default", { month: "short" });
        return { ...order, monthName };
      }),
    [completedOrders]
  );

  const aggregatedData = useMemo(
    () =>
      dataWithMonthNames.reduce(
        (acc: Record<string, AggregatedData>, { monthName, grand_total }) => {
          if (!acc[monthName]) {
            acc[monthName] = { monthName, price: 0 };
          }
          acc[monthName].price += grand_total ?? 0;
          return acc;
        },
        {}
      ),
    [dataWithMonthNames]
  );

  const aggregatedDataArray: AggregatedData[] = useMemo(
    () =>
      allMonths.map((month) => ({
        monthName: month,
        price: aggregatedData[month]?.price || 0,
      })),
    [aggregatedData]
  );

  const currentDate = format(new Date(), "EEEE, MMMM do yyyy");

  const uniqueYears = useMemo(
    () =>
      job_orders
        ? Array.from(
            new Set(
              job_orders.map((order: JobOrderData) =>
                getYear(new Date(order.created_at))
              )
            )
          )
        : [],
    [job_orders]
  );

  const statusCounts = useMemo(() => {
    return job_orders ? countJobOrdersByStatus(job_orders) : {};
  }, [job_orders]);

  const salesReport = (
    <>
      <div className="grid xl:grid-cols-[1fr_0.8fr] grid-cols-1 gap-4">
        <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
          <OverviewCard data={reportsData[0]} />
          {reportsData &&
            reportsData
              .slice(1, 4)
              .map((reports) => (
                <ReportCard
                  header={reports.header}
                  value={reports.value}
                  prefix={reports.prefix}
                  pcp={reports.pcp}
                  monthlyMetrics={reports.monthlyMetrics}
                  weeklyMetrics={reports.weeklyMetrics}
                  nameKey={reports.nameKey}
                  viewReport
                />
              ))}
        </div>
        <FinancialChart data={profitData} />
      </div>
      <SalesReportLineChart grossAndNetData={grossAndNetData} />
    </>
  );

  if (isLoading || isExpensesLoading)
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="h-full">
      <div className="flex sm:flex-row flex-col justify-between">
        <HeaderText>Dashboard</HeaderText>
        {job_orders && job_orders.length > 0 ? (
          <DateRangePickerWithExport
            currentTab={currentTab}
            dateRange={dateRange}
            setDateRange={setDateRange}
            defaultFromDate={defaultFromDate}
            defaultToDate={defaultToDate}
            metrics={filteredMetrics}
          />
        ) : null}
        {currentTab === "report" && (
          <DatePickerWithRange
            isAnalytics
            defaultFromDate={defaultFromDate}
            defaultToDate={defaultToDate}
            value={dateRange}
            onChange={setDateRange}
          />
        )}
      </div>
      {currentTab === "overview" && (
        <h2 className="text-sm opacity-60">{currentDate}</h2>
      )}
      {!isTaytay && !isPasig ? (
        <DashboardTabs
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          statusCounts={statusCounts}
        >
          {job_orders && job_orders.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center">
              <p>
                No job orders found. Please create new job orders to see the
                dashboard data.
              </p>
            </div>
          ) : (
            <>
              <TabsContent value="overview" className="w-full pb-8">
                <div className="h-[calc(100%-1rem-0.5rem-2rem)] mt-4 flex flex-col gap-4">
                  <div className="grid xl:grid-cols-[0.7fr_1fr] lg:grid-cols-1 gap-4">
                    <OverviewSection overviewData={overviewData} />
                    <BarChartSection
                      data={aggregatedDataArray}
                      orders={completedOrders}
                    />
                  </div>
                  <div className="grid xl:grid-cols-[1fr_0.5fr] grid-cols-1 gap-4">
                    <RecentSalesSection completedOrders={completedOrders} />
                    <RevenuePerTechnicianPieChart orders={completedOrders} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent
                value="report"
                className="mt-4 w-full pb-8 space-y-4"
              >
                {salesReport}
                {/* <div className="grid grid-cols-[1fr_0.5fr] gap-4"> */}
                {/* </div> */}
              </TabsContent>
              <TabsContent value="analytics" className="mt-4">
                <h2 className="font-bold text-lg">
                  Sales and Revenue Insights
                </h2>
                <div className="grid lg:grid-cols-[1fr_0.5fr_0.5fr] grid-cols-2 gap-2 mt-2">
                  <SalesGrowthChart
                    data={filteredOrders}
                    metrics={filteredMetrics}
                  />
                  <PieChartComponent
                    data={filteredOrders}
                    metrics={filteredMetrics}
                  />
                  <SalesByBranch
                    data={filteredOrders}
                    metrics={filteredMetrics}
                  />
                </div>
                <h2 className="font-bold text-lg mt-8">
                  Technician Performance Analytics
                </h2>
                <div className="grid lg:grid-cols-[0.5fr_1fr] grid-cols-1 gap-2 mt-2">
                  <RevenuePerTechnicianPieChart
                    orders={filteredOrders}
                    isAnalytics
                  />
                  <TechnicianPerformanceAnalytics
                    completedOrders={filteredOrders}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    uniqueYears={uniqueYears}
                  />
                </div>
              </TabsContent>
            </>
          )}
        </DashboardTabs>
      ) : (
        <div className="mt-4 w-full pb-8 space-y-4">{salesReport}</div>
      )}
    </div>
  );
}
