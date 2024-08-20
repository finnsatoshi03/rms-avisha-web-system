import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Bar,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import CustomToolTip from "./custom-tooltip";
import { AggregatedData, JobOrderData } from "../../lib/types";
import { allMonths, calculateMetrics } from "../../lib/helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { TrendingDown, TrendingUp } from "lucide-react";

export default function BarChartSection({
  data,
  orders,
}: {
  data: AggregatedData[];
  orders: JobOrderData[];
}) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const barColors = ["#f12924", "#2e2e2e"];

  const years = Array.from(
    new Set(orders.map((order) => new Date(order.created_at).getFullYear()))
  );

  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
  const [filteredData, setFilteredData] = useState<AggregatedData[]>([]);
  const [currentMonthTotal, setCurrentMonthTotal] = useState<number>(0);
  const [comparisonPCP, setComparisonPCP] = useState<number>(0);

  useEffect(() => {
    if (selectedYear) {
      const filteredOrders = orders.filter((order) => {
        const orderYear = new Date(order.created_at).getFullYear();
        return orderYear === selectedYear;
      });

      const aggregatedData = allMonths.map((month) => {
        const monthOrders = filteredOrders.filter((order) => {
          const orderMonth = new Date(order.created_at).getMonth();
          return orderMonth === allMonths.indexOf(month);
        });

        const monthTotalPrice = monthOrders.reduce(
          (total, order) => total + (order.adjustedGrandTotal ?? 0),
          0
        );

        return {
          monthName: month,
          price: monthTotalPrice,
        };
      });

      setFilteredData(aggregatedData);

      // Calculate metrics for the current month and previous month
      const metrics = calculateMetrics(filteredOrders);
      setCurrentMonthTotal(metrics.metricsThisMonth.revenue);
      setComparisonPCP(metrics.pcpRevenue);
    } else {
      setFilteredData(data);
    }
  }, [selectedYear, data, orders]);

  return (
    <div className="border border-slate-300 rounded-lg pt-4 px-5 h-[45vh]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Overview</h1>
        <Select
          onValueChange={(value) => setSelectedYear(parseInt(value))}
          value={selectedYear?.toString() || ""}
        >
          <SelectTrigger className="w-fit h-fit p-0 border-0 focus:ring-0 focus:ring-transparent">
            <SelectValue placeholder={currentYear.toString()} />
          </SelectTrigger>
          <SelectContent align="end">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <div>
          <p className="opacity-60 text-xs">Sales this month</p>
          <h1 className="font-bold text-4xl">
            ₱
            <span className="text-primaryRed">
              {currentMonthTotal.toLocaleString()}
            </span>
          </h1>
        </div>{" "}
        <div>
          <p className="opacity-60 flex items-center gap-1 text-xs mt-3 font-mono font-bold">
            {comparisonPCP.toString().includes("-") ? (
              <TrendingDown size={12} strokeWidth={1.5} />
            ) : (
              <TrendingUp size={12} strokeWidth={1.5} />
            )}
            {Math.abs(comparisonPCP).toFixed(2)}%{" "}
          </p>
          <p className="opacity-60 text-xs">
            <span className="font-bold">vs</span> last month
          </p>
        </div>
      </div>
      <ResponsiveContainer>
        <BarChart data={filteredData} margin={{ bottom: 90, top: 20 }}>
          <Tooltip content={<CustomToolTip />} />
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="monthName"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₱${value}`}
          />
          <Bar dataKey="price" radius={[4, 4, 0, 0]}>
            {filteredData.map((entry, index) => {
              const entryMonthIndex = allMonths.indexOf(entry.monthName);
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entryMonthIndex === currentMonth
                      ? barColors[0]
                      : barColors[1]
                  }
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
