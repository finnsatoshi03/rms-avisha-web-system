/* eslint-disable @typescript-eslint/no-explicit-any */
import { format, startOfMonth, startOfWeek } from "date-fns";
import { Expenses, JobOrderData } from "./types";
import { DateRange } from "react-day-picker";

export function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case "pending":
      return "status-pending";
    case "for approval":
      return "status-for-approval";
    case "repairing":
      return "status-repairing";
    case "waiting parts":
      return "status-waiting-parts";
    case "ready for pickup":
    case "ready to pickup":
      return "status-ready-for-pickup";
    case "completed":
      return "status-completed";
    case "canceled":
      return "status-canceled";
    default:
      return "";
  }
}

export function formatNumberWithCommas(value: number): string {
  return value?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function calculateMetrics(
  orders: JobOrderData[],
  expenses: Expenses[] = [],
  dateRange?: DateRange
) {
  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  );

  const ordersWithDownpayment = orders.filter(
    (order) => order.downpayment && order.downpayment > 0
  );

  const totalRevenueIncludingDownpayments =
    completedOrders.reduce((sum, order) => {
      let adjustedGrandTotal = order.grand_total ?? 0;

      if (order.materials) {
        const usedMaterialsTotal = order.materials.reduce((total, material) => {
          if (material.used) {
            return total + material.quantity * material.unit_price;
          }
          return total;
        }, 0);

        adjustedGrandTotal -= usedMaterialsTotal;
      }

      return sum + adjustedGrandTotal;
    }, 0) +
    ordersWithDownpayment.reduce(
      (sum, order) => sum + (order.downpayment ?? 0),
      0
    );

  const totalNetIncludingDownpayments =
    completedOrders.reduce((sum, order) => {
      let adjustedNetSales: number =
        typeof order.net_sales === "number" ? order.net_sales : 0;

      if (order.materials) {
        const usedMaterialsTotal = order.materials.reduce((total, material) => {
          if (material.used) {
            return total + material.quantity * material.unit_price;
          }
          return total;
        }, 0);

        adjustedNetSales -= usedMaterialsTotal;
      }

      return sum + adjustedNetSales;
    }, 0) +
    ordersWithDownpayment.reduce(
      (sum, order) => sum + (order.downpayment ?? 0),
      0
    );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + (expense.amount ?? 0),
    0
  );

  const totalProfit = totalNetIncludingDownpayments - totalExpenses;

  const numberOfClients = new Set(orders.map((order) => order.clients.name))
    .size;
  const numberOfSales = completedOrders.length;
  const averageOrderValue = numberOfSales
    ? totalNetIncludingDownpayments / numberOfSales
    : 0;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const getWeeklyMetrics = (
    weekNumber: number,
    year: number,
    allExpenses: Expenses[],
    dateRange?: DateRange
  ) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const startOfFirstWeek = new Date(firstDayOfYear);
    startOfFirstWeek.setDate(
      startOfFirstWeek.getDate() - startOfFirstWeek.getDay()
    );

    const startOfWeek = new Date(startOfFirstWeek);
    startOfWeek.setDate(startOfFirstWeek.getDate() + (weekNumber - 1) * 7);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    if (
      dateRange &&
      (endOfWeek < dateRange.from! || startOfWeek > dateRange.to!)
    ) {
      return null;
    }

    const weeklyCompletedOrders = completedOrders.filter((order) => {
      const orderDate = new Date(order.completed_at!);
      return orderDate >= startOfWeek && orderDate <= endOfWeek;
    });

    const weeklyExpenses = allExpenses.filter((expense) => {
      const expenseDate = new Date(expense.created_at);
      return expenseDate >= startOfWeek && expenseDate <= endOfWeek;
    });

    const weeklyOrdersWithDownpayment = ordersWithDownpayment.filter(
      (order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startOfWeek && orderDate <= endOfWeek;
      }
    );

    const weeklyGross =
      weeklyCompletedOrders.reduce(
        (sum, order) => sum + (order.grand_total ?? 0),
        0
      ) +
      weeklyOrdersWithDownpayment.reduce(
        (sum, order) => sum + (order.downpayment ?? 0),
        0
      );

    const weeklyNet =
      weeklyCompletedOrders.reduce((sum, order) => {
        let adjustedNetSales = order.net_sales ?? 0;

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

          adjustedNetSales -= usedMaterialsTotal;
        }

        return sum + adjustedNetSales;
      }, 0) +
      weeklyOrdersWithDownpayment.reduce(
        (sum, order) => sum + (order.downpayment ?? 0),
        0
      );

    const weeklyExpensesTotal = weeklyExpenses.reduce(
      (sum, expense) => sum + (expense.amount ?? 0),
      0
    );

    // Format weekRange as "Aug 28 - Sept 4"
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
      weekNumber,
      weekRange,
      gross: weeklyGross,
      net: weeklyNet,
      expenses: weeklyExpensesTotal,
    };
  };

  const weeklyMetrics = Array.from({ length: 52 }, (_, index) => {
    const weekNumber = index + 1;
    return getWeeklyMetrics(weekNumber, currentYear, expenses, dateRange);
  }).filter(Boolean); // Filter out null values

  const getMonthlyMetrics = (
    month: number,
    year: number,
    // allOrders: JobOrderData[],
    allExpenses: Expenses[]
  ) => {
    const monthlyCompletedOrders = completedOrders.filter((order) => {
      const orderDate = new Date(order.completed_at!);
      return (
        orderDate.getMonth() + 1 === month && orderDate.getFullYear() === year
      );
    });

    const monthlyOrdersWithDownpayment = ordersWithDownpayment.filter(
      (order) => {
        const orderDate = new Date(order.created_at);
        return (
          orderDate.getMonth() + 1 === month && orderDate.getFullYear() === year
        );
      }
    );

    const monthlyExpenses = allExpenses.filter((expense) => {
      const expenseDate = new Date(expense.created_at);
      return (
        expenseDate.getMonth() + 1 === month &&
        expenseDate.getFullYear() === year
      );
    });

    const monthlyGross =
      monthlyCompletedOrders.reduce(
        (sum, order) => sum + (order.grand_total ?? 0),
        0
      ) +
      monthlyOrdersWithDownpayment.reduce(
        (sum, order) => sum + (order.downpayment ?? 0),
        0
      );

    const monthlyNet =
      monthlyCompletedOrders.reduce((sum, order) => {
        let adjustedNetSales = order.net_sales ?? 0;

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

          adjustedNetSales -= usedMaterialsTotal;
        }

        return sum + adjustedNetSales;
      }, 0) +
      monthlyOrdersWithDownpayment.reduce(
        (sum, order) => sum + (order.downpayment ?? 0),
        0
      );

    const monthlyExpensesTotal = monthlyExpenses.reduce(
      (sum, expense) => sum + (expense.amount ?? 0),
      0
    );

    const monthlyProfit = monthlyNet - monthlyExpensesTotal;

    const monthlySales = monthlyCompletedOrders.length;

    // Calculate unique clients per month
    const monthlyClients = new Set(
      monthlyCompletedOrders.map((order) => order.clients.name)
    ).size;

    const monthlyAverageOrderValue = monthlySales
      ? monthlyNet / monthlySales
      : 0;

    return {
      month: allMonths[month - 1],
      gross: monthlyGross,
      revenue: monthlyGross,
      net: monthlyNet,
      expenses: monthlyExpensesTotal,
      profit: monthlyProfit,
      sales: monthlySales,
      clients: monthlyClients,
      averageOrderValue: monthlyAverageOrderValue,
    };
  };

  // Generate metrics for each month
  const monthlyMetrics = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return getMonthlyMetrics(
      month,
      currentYear,
      // orders,
      expenses
    );
  });

  const calculatePcp = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const metricsThisMonth = getMonthlyMetrics(
    currentMonth,
    currentYear,
    // orders,
    expenses
  );
  const metricsLastMonth = getMonthlyMetrics(
    previousMonth,
    previousYear,
    // orders,
    expenses
  );

  const pcpProfit = calculatePcp(
    metricsThisMonth.profit,
    metricsLastMonth.profit
  );
  const pcpRevenue = calculatePcp(
    metricsThisMonth.revenue,
    metricsLastMonth.revenue
  );
  const pcpGross = calculatePcp(metricsThisMonth.gross, metricsLastMonth.gross);
  const pcpNet = calculatePcp(metricsThisMonth.net, metricsLastMonth.net);
  const pcpExpenses = calculatePcp(
    metricsThisMonth.expenses,
    metricsLastMonth.expenses
  );
  const pcpSales = metricsThisMonth.sales - metricsLastMonth.sales;
  const pcpClients = metricsThisMonth.clients - metricsLastMonth.clients;
  const pcpAverageOrderValue = calculatePcp(
    metricsThisMonth.averageOrderValue,
    metricsLastMonth.averageOrderValue
  );

  // Organize metrics into separate arrays
  const organizedMetrics = {
    gross: monthlyMetrics.map((metric) => ({
      month: metric.month,
      gross: metric.gross,
    })),
    revenue: monthlyMetrics.map((metric) => ({
      month: metric.month,
      revenue: metric.revenue,
    })),
    net: monthlyMetrics.map((metric) => ({
      month: metric.month,
      net: metric.net,
    })),
    expenses: monthlyMetrics.map((metric) => ({
      month: metric.month,
      expenses: metric.expenses,
    })),
    profit: monthlyMetrics.map((metric) => ({
      month: metric.month,
      profit: metric.profit,
    })),
    sales: monthlyMetrics.map((metric) => ({
      month: metric.month,
      sales: metric.sales,
    })),
    clients: monthlyMetrics.map((metric) => ({
      month: metric.month,
      clients: metric.clients,
    })),
    averageOrderValue: monthlyMetrics.map((metric) => ({
      month: metric.month,
      averageOrderValue: metric.averageOrderValue,
    })),
  };

  return {
    totalRevenue: totalRevenueIncludingDownpayments,
    totalGross: totalRevenueIncludingDownpayments,
    totalNet: totalNetIncludingDownpayments,
    totalExpenses: totalExpenses,
    totalProfit: totalProfit,
    numberOfClients: numberOfClients,
    numberOfSales: numberOfSales,
    averageOrderValue: averageOrderValue,
    metricsThisMonth,
    metricsLastMonth,
    pcpRevenue,
    pcpProfit,
    pcpGross,
    pcpNet,
    pcpExpenses,
    pcpSales,
    pcpClients,
    pcpAverageOrderValue,
    monthlyMetrics: organizedMetrics,
    weeklyMetrics,
  };
}

export const generateMonths = (startDate: Date, endDate: Date) => {
  let start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const months = [];

  while (start <= end) {
    months.push(start.toLocaleString("default", { month: "short" }));
    start = new Date(start.setMonth(start.getMonth() + 1));
  }

  return months;
};

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.slice(1), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = ((num >> 8) & 0x00ff) + amt,
    B = (num & 0x0000ff) + amt;

  const newR = Math.min(255, Math.max(0, R));
  const newG = Math.min(255, Math.max(0, G));
  const newB = Math.min(255, Math.max(0, B));

  return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

export function generateMonochromaticColors(
  baseColor: string,
  numberOfColors: number
): string[] {
  const colors = [];
  const step = 50 / (numberOfColors + 1); // Reduce the step to avoid getting too light
  for (let i = 1; i <= numberOfColors; i++) {
    colors.push(lightenColor(baseColor, step * i));
  }
  return colors;
}

export const aggregateByWeek = (orders: JobOrderData[]) => {
  const aggregatedData = orders.reduce((acc: any, order: JobOrderData) => {
    // Use completed_at for the week start if status is "Completed"
    const dateToUse =
      order.status === "Completed" ? order.completed_at! : order.created_at;
    const weekStart = format(startOfWeek(new Date(dateToUse)), "yyyy-MM-dd");

    if (!acc[weekStart]) {
      acc[weekStart] = { date: weekStart, revenue: 0 };
    }

    // Adjust revenue calculation based on status
    if (order.status === "Completed") {
      acc[weekStart].revenue += order.adjustedGrandTotal ?? 0;
    } else {
      acc[weekStart].revenue += order.downpayment ?? 0;
    }

    return acc;
  }, {});

  return Object.values(aggregatedData).sort(
    (a: any, b: any) => Number(new Date(a.date)) - Number(new Date(b.date))
  );
};

export const aggregateByMonth = (orders: JobOrderData[]) => {
  const aggregatedData = orders.reduce((acc: any, order: JobOrderData) => {
    const monthStart =
      order.status === "Completed"
        ? format(startOfMonth(new Date(order.completed_at!)), "yyyy-MM-dd")
        : format(startOfMonth(new Date(order.created_at)), "yyyy-MM-dd");

    if (!acc[monthStart]) {
      acc[monthStart] = { date: monthStart, revenue: 0 };
    }

    if (order.status === "Completed") {
      acc[monthStart].revenue += order.adjustedGrandTotal ?? 0;
    } else {
      acc[monthStart].revenue += order.downpayment ?? 0;
    }

    return acc;
  }, {});

  return Object.values(aggregatedData).sort(
    (a: any, b: any) => Number(new Date(a.date)) - Number(new Date(b.date))
  );
};

export const allMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatMachineType(machineType: string): string {
  const replacements: { [key: string]: string } = {
    desktop_pc: "Desktop/PC",
    electric_typewriter: "Electric Typewriter",
  };

  return (
    replacements[machineType] ||
    machineType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export function formatReadableDate(
  dateString: string,
  locale: string = "en-US"
): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat(locale, options);
  return formatter.format(date);
}

export function calculateWarrantyDays(warrantyDate: string): number {
  const today = new Date();
  const warrantyEnd = new Date(warrantyDate);
  const diffTime = warrantyEnd.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export const renderWarrantyInfo = (warrantyDate: string | null) => {
  if (!warrantyDate) return "No Warranty";
  const daysLeft = calculateWarrantyDays(warrantyDate);
  if (daysLeft <= 0) return "Warranty expired";
  return `${daysLeft} days left`;
};

export const formatTimeAgo = (date: Date) => {
  const now = new Date().getTime();
  const diffInSeconds = Math.floor((now - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec${diffInSeconds === 1 ? "" : "s"} ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } else if (diffInSeconds < 31104000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  } else if (diffInSeconds < 311040000) {
    const years = Math.floor(diffInSeconds / 31104000);
    return `${years} yr${years === 1 ? "" : "s"} ago`;
  } else {
    const decades = Math.floor(diffInSeconds / 311040000);
    return `${decades} decade${decades === 1 ? "" : "s"} ago`;
  }
};

export const countJobOrdersByStatus = (jobOrders: JobOrderData[]) => {
  const statusCounts: any = {
    Pending: 0,
    Repairing: 0,
    "Ready for Pickup": 0,
    Completed: 0,
    Canceled: 0,
  };

  jobOrders.forEach((order) => {
    if (statusCounts[order.status] !== undefined) {
      statusCounts[order.status]++;
    }
  });

  return statusCounts;
};
