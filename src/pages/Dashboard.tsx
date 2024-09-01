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
import TechnicianDashboard from "../components/dashboard/technician-page";
import { getTechnicians } from "../services/apiTechnicians";

const matchedTechnicianData: any = {
  id: "tech123",
  email: "technician@example.com",
  fullname: "John Doe",
  avatar: "https://example.com/avatar.jpg",
  role: "Technician",
  joborders: [
    {
      id: 1,
      order_no: "JO-1001",
      client_id: 1,
      branch_id: 1,
      order_received: "2024-08-01T08:00:00Z",
      machine_type: "Printer",
      status: "Pending",
      created_at: "2024-08-01T08:00:00Z",
      amount: 500.0,
      labor_description: "Printer repair",
      labor_total: 150.0,
      material_total: 350.0,
      grand_total: 500.0,
      technician_id: "tech123",
      brand_model: "HP LaserJet Pro",
      serial_number: "SN123456789",
      problem_statement: "Paper jam issue",
      warranty: "6 months",
      date_of_approval: "2024-08-02T08:00:00Z",
      completed_at: "2024-08-03T08:00:00Z",
      order_received_user: {
        id: "user456",
        email: "receiver@example.com",
        fullname: "Jane Smith",
        avatar: "https://example.com/avatar-receiver.jpg",
        role: "Receiver",
      },
      clients: {
        id: 1,
        name: "ABC Corporation",
        email: "contact@abccorp.com",
        contact_number: "123-456-7890",
        created_at: "2023-01-01T08:00:00Z",
      },
      branches: {
        id: 1,
        location: "Main Office",
      },
      materials: [
        {
          id: 1,
          material_description: "Replacement paper tray",
          material_id: 101,
          quantity: 1,
          unit_price: 50.0,
          total_amount: 50.0,
        },
      ],
    },
    {
      id: 2,
      order_no: "JO-1002",
      client_id: 2,
      branch_id: 2,
      order_received: "2024-08-05T08:00:00Z",
      machine_type: "Scanner",
      status: "In Progress",
      created_at: "2024-08-05T08:00:00Z",
      amount: 300.0,
      labor_description: "Scanner maintenance",
      labor_total: 100.0,
      material_total: 200.0,
      grand_total: 300.0,
      technician_id: "tech123",
      brand_model: "Canon ScanPro",
      serial_number: "SN987654321",
      problem_statement: "Scanner not working",
      warranty: "1 year",
      date_of_approval: "2024-08-06T08:00:00Z",
      completed_at: "2024-08-07T08:00:00Z",
      order_received_user: {
        id: "user457",
        email: "receiver2@example.com",
        fullname: "Bob Brown",
        avatar: "https://example.com/avatar-receiver2.jpg",
        role: "Receiver",
      },
      clients: {
        id: 2,
        name: "XYZ Inc.",
        email: "contact@xyzinc.com",
        contact_number: "987-654-3210",
        created_at: "2023-02-01T08:00:00Z",
      },
      branches: {
        id: 2,
        location: "Branch Office",
      },
      materials: [
        {
          id: 2,
          material_description: "Replacement scanner bulb",
          material_id: 102,
          quantity: 1,
          unit_price: 100.0,
          total_amount: 100.0,
        },
      ],
    },
    {
      id: 3,
      order_no: "JO-1003",
      client_id: 3,
      branch_id: 3,
      order_received: "2024-08-10T08:00:00Z",
      machine_type: "Copier",
      status: "Completed",
      created_at: "2024-08-10T08:00:00Z",
      amount: 700.0,
      labor_description: "Copier setup",
      labor_total: 200.0,
      material_total: 500.0,
      grand_total: 700.0,
      technician_id: "tech123",
      brand_model: "Xerox WorkCentre",
      serial_number: "SN1122334455",
      problem_statement: "Initial setup required",
      warranty: "2 years",
      date_of_approval: "2024-08-11T08:00:00Z",
      completed_at: "2024-08-12T08:00:00Z",
      order_received_user: {
        id: "user458",
        email: "receiver3@example.com",
        fullname: "Sara White",
        avatar: "https://example.com/avatar-receiver3.jpg",
        role: "Receiver",
      },
      clients: {
        id: 3,
        name: "LMN Ltd.",
        email: "contact@lmnltd.com",
        contact_number: "555-123-4567",
        created_at: "2023-03-01T08:00:00Z",
      },
      branches: {
        id: 3,
        location: "Headquarters",
      },
      materials: [
        {
          id: 3,
          material_description: "Replacement toner cartridge",
          material_id: 103,
          quantity: 1,
          unit_price: 200.0,
          total_amount: 200.0,
        },
      ],
    },
    {
      id: 4,
      order_no: "JO-1004",
      client_id: 4,
      branch_id: 4,
      order_received: "2024-08-15T08:00:00Z",
      machine_type: "Fax Machine",
      status: "Pending",
      created_at: "2024-08-15T08:00:00Z",
      amount: 200.0,
      labor_description: "Fax machine repair",
      labor_total: 50.0,
      material_total: 150.0,
      grand_total: 200.0,
      technician_id: "tech123",
      brand_model: "Brother Fax",
      serial_number: "SN4455667788",
      problem_statement: "Not sending faxes",
      warranty: "3 months",
      date_of_approval: "2024-08-16T08:00:00Z",
      completed_at: "2024-08-17T08:00:00Z",
      order_received_user: {
        id: "user459",
        email: "receiver4@example.com",
        fullname: "Tom Green",
        avatar: "https://example.com/avatar-receiver4.jpg",
        role: "Receiver",
      },
      clients: {
        id: 4,
        name: "OPQ Enterprises",
        email: "contact@opqenterprises.com",
        contact_number: "444-555-6666",
        created_at: "2023-04-01T08:00:00Z",
      },
      branches: {
        id: 4,
        location: "Regional Office",
      },
      materials: [
        {
          id: 4,
          material_description: "Replacement fax toner",
          material_id: 104,
          quantity: 1,
          unit_price: 150.0,
          total_amount: 150.0,
        },
      ],
    },
    {
      id: 5,
      order_no: "JO-1005",
      client_id: 5,
      branch_id: 5,
      order_received: "2024-08-20T08:00:00Z",
      machine_type: "Projector",
      status: "In Progress",
      created_at: "2024-08-20T08:00:00Z",
      amount: 400.0,
      labor_description: "Projector maintenance",
      labor_total: 100.0,
      material_total: 300.0,
      grand_total: 400.0,
      technician_id: "tech123",
      brand_model: "Epson Projector",
      serial_number: "SN5566778899",
      problem_statement: "Image not clear",
      warranty: "1 year",
      date_of_approval: "2024-08-21T08:00:00Z",
      completed_at: "2024-08-22T08:00:00Z",
      order_received_user: {
        id: "user460",
        email: "receiver5@example.com",
        fullname: "Lucy Black",
        avatar: "https://example.com/avatar-receiver5.jpg",
        role: "Receiver",
      },
      clients: {
        id: 5,
        name: "RST Solutions",
        email: "contact@rstsolutions.com",
        contact_number: "777-888-9999",
        created_at: "2023-05-01T08:00:00Z",
      },
      branches: {
        id: 5,
        location: "Satellite Office",
      },
      materials: [
        {
          id: 5,
          material_description: "Replacement projector bulb",
          material_id: 105,
          quantity: 1,
          unit_price: 300.0,
          total_amount: 300.0,
        },
      ],
    },
    {
      id: 6,
      order_no: "JO-1001",
      client_id: 1,
      branch_id: 1,
      order_received: "2024-08-01T08:00:00Z",
      machine_type: "Printer",
      status: "Pending",
      created_at: "2024-08-01T08:00:00Z",
      amount: 500.0,
      labor_description: "Printer repair",
      labor_total: 150.0,
      material_total: 350.0,
      grand_total: 500.0,
      technician_id: "tech123",
      brand_model: "HP LaserJet Pro",
      serial_number: "SN123456789",
      problem_statement: "Paper jam issue",
      warranty: "6 months",
      date_of_approval: "2024-08-02T08:00:00Z",
      completed_at: "2024-08-03T08:00:00Z",
      order_received_user: {
        id: "user456",
        email: "receiver@example.com",
        fullname: "Jane Smith",
        avatar: "https://example.com/avatar-receiver.jpg",
        role: "Receiver",
      },
      clients: {
        id: 1,
        name: "ABC Corporation",
        email: "contact@abccorp.com",
        contact_number: "123-456-7890",
        created_at: "2023-01-01T08:00:00Z",
      },
      branches: {
        id: 1,
        location: "Main Office",
      },
      materials: [
        {
          id: 1,
          material_description: "Replacement paper tray",
          material_id: 101,
          quantity: 1,
          unit_price: 50.0,
          total_amount: 50.0,
        },
      ],
    },
    {
      id: 7,
      order_no: "JO-1002",
      client_id: 2,
      branch_id: 2,
      order_received: "2024-08-05T08:00:00Z",
      machine_type: "Scanner",
      status: "In Progress",
      created_at: "2024-08-05T08:00:00Z",
      amount: 300.0,
      labor_description: "Scanner maintenance",
      labor_total: 100.0,
      material_total: 200.0,
      grand_total: 300.0,
      technician_id: "tech123",
      brand_model: "Canon ScanPro",
      serial_number: "SN987654321",
      problem_statement: "Scanner not working",
      warranty: "1 year",
      date_of_approval: "2024-08-06T08:00:00Z",
      completed_at: "2024-08-07T08:00:00Z",
      order_received_user: {
        id: "user457",
        email: "receiver2@example.com",
        fullname: "Bob Brown",
        avatar: "https://example.com/avatar-receiver2.jpg",
        role: "Receiver",
      },
      clients: {
        id: 2,
        name: "XYZ Inc.",
        email: "contact@xyzinc.com",
        contact_number: "987-654-3210",
        created_at: "2023-02-01T08:00:00Z",
      },
      branches: {
        id: 2,
        location: "Branch Office",
      },
      materials: [
        {
          id: 2,
          material_description: "Replacement scanner bulb",
          material_id: 102,
          quantity: 1,
          unit_price: 100.0,
          total_amount: 100.0,
        },
      ],
    },
    {
      id: 8,
      order_no: "JO-1003",
      client_id: 3,
      branch_id: 3,
      order_received: "2024-08-10T08:00:00Z",
      machine_type: "Copier",
      status: "Completed",
      created_at: "2024-08-10T08:00:00Z",
      amount: 700.0,
      labor_description: "Copier setup",
      labor_total: 200.0,
      material_total: 500.0,
      grand_total: 700.0,
      technician_id: "tech123",
      brand_model: "Xerox WorkCentre",
      serial_number: "SN1122334455",
      problem_statement: "Initial setup required",
      warranty: "2 years",
      date_of_approval: "2024-08-11T08:00:00Z",
      completed_at: "2024-08-12T08:00:00Z",
      order_received_user: {
        id: "user458",
        email: "receiver3@example.com",
        fullname: "Sara White",
        avatar: "https://example.com/avatar-receiver3.jpg",
        role: "Receiver",
      },
      clients: {
        id: 3,
        name: "LMN Ltd.",
        email: "contact@lmnltd.com",
        contact_number: "555-123-4567",
        created_at: "2023-03-01T08:00:00Z",
      },
      branches: {
        id: 3,
        location: "Headquarters",
      },
      materials: [
        {
          id: 3,
          material_description: "Replacement toner cartridge",
          material_id: 103,
          quantity: 1,
          unit_price: 200.0,
          total_amount: 200.0,
        },
      ],
    },
    {
      id: 9,
      order_no: "JO-1004",
      client_id: 4,
      branch_id: 4,
      order_received: "2024-08-15T08:00:00Z",
      machine_type: "Fax Machine",
      status: "Pending",
      created_at: "2024-08-15T08:00:00Z",
      amount: 200.0,
      labor_description: "Fax machine repair",
      labor_total: 50.0,
      material_total: 150.0,
      grand_total: 200.0,
      technician_id: "tech123",
      brand_model: "Brother Fax",
      serial_number: "SN4455667788",
      problem_statement: "Not sending faxes",
      warranty: "3 months",
      date_of_approval: "2024-08-16T08:00:00Z",
      completed_at: "2024-08-17T08:00:00Z",
      order_received_user: {
        id: "user459",
        email: "receiver4@example.com",
        fullname: "Tom Green",
        avatar: "https://example.com/avatar-receiver4.jpg",
        role: "Receiver",
      },
      clients: {
        id: 4,
        name: "OPQ Enterprises",
        email: "contact@opqenterprises.com",
        contact_number: "444-555-6666",
        created_at: "2023-04-01T08:00:00Z",
      },
      branches: {
        id: 4,
        location: "Regional Office",
      },
      materials: [
        {
          id: 4,
          material_description: "Replacement fax toner",
          material_id: 104,
          quantity: 1,
          unit_price: 150.0,
          total_amount: 150.0,
        },
      ],
    },
    {
      id: 10,
      order_no: "JO-1005",
      client_id: 5,
      branch_id: 5,
      order_received: "2024-08-20T08:00:00Z",
      machine_type: "Projector",
      status: "In Progress",
      created_at: "2024-08-20T08:00:00Z",
      amount: 400.0,
      labor_description: "Projector maintenance",
      labor_total: 100.0,
      material_total: 300.0,
      grand_total: 400.0,
      technician_id: "tech123",
      brand_model: "Epson Projector",
      serial_number: "SN5566778899",
      problem_statement: "Image not clear",
      warranty: "1 year",
      date_of_approval: "2024-08-21T08:00:00Z",
      completed_at: "2024-08-22T08:00:00Z",
      order_received_user: {
        id: "user460",
        email: "receiver5@example.com",
        fullname: "Lucy Black",
        avatar: "https://example.com/avatar-receiver5.jpg",
        role: "Receiver",
      },
      clients: {
        id: 5,
        name: "RST Solutions",
        email: "contact@rstsolutions.com",
        contact_number: "777-888-9999",
        created_at: "2023-05-01T08:00:00Z",
      },
      branches: {
        id: 5,
        location: "Satellite Office",
      },
      materials: [
        {
          id: 5,
          material_description: "Replacement projector bulb",
          material_id: 105,
          quantity: 1,
          unit_price: 300.0,
          total_amount: 300.0,
        },
      ],
    },
  ],
};

export default function Dashboard() {
  const { isTaytay, isPasig, isUser, user } = useUser();
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

  const { data: technicians, isLoading: isTechniciansLoading } = useQuery({
    queryKey: ["technicians", { fetchAll: true }],
    queryFn: () => getTechnicians({ fetchAll: true }),
  });

  // const matchedTechnicianData = useMemo(() => {
  //   if (!technicians || !user) return null;

  //   return technicians.find((tech) => tech.id === user.id);
  // }, [technicians, user]);

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
      // Filter job orders by date range
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

      // Filter expenses by date range
      const filteredExpenses = expenses?.filter((expense) => {
        const expenseDate = new Date(expense.created_at);
        return (
          (!dateRange?.from || expenseDate >= dateRange.from) &&
          (!dateRange?.to || expenseDate <= dateRange.to)
        );
      });

      // Calculate metrics based on filtered data
      const metrics = calculateMetrics(
        filteredOrders,
        filteredExpenses,
        dateRange
      );

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
          icon: Wallet || null,
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

  if (isLoading || isExpensesLoading || isTechniciansLoading)
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
      {!isTaytay && !isPasig && !isUser ? (
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
      ) : isUser ? (
        <div className="mt-4 w-full pb-8">
          <TechnicianDashboard technician={matchedTechnicianData} />
        </div>
      ) : (
        <div className="mt-4 w-full pb-8 space-y-4">{salesReport}</div>
      )}
    </div>
  );
}
