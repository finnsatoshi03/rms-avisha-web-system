import { GrossAndNetData, JobOrderData, Expenses } from "../../lib/types";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import DeductionsDialog from "./deductions-dialog";
import { DateRange } from "react-day-picker";

interface SalesReportLineChartProps {
  grossAndNetData: GrossAndNetData[];
  filteredOrders: JobOrderData[];
  expenses: Expenses[];
  dateRange?: DateRange;
}

export default function SalesReportLineChart({
  grossAndNetData,
  filteredOrders,
  expenses,
  dateRange,
}: SalesReportLineChartProps) {
  const chartConfig = {
    // gross: {
    //   label: "Gross Sales",
    // },
    // net: {
    //   label: "Net Sales",
    // },
  } satisfies ChartConfig;

  return (
    <div className="border border-slate-200 py-4 px-5 rounded-xl">
      <div className="flex justify-between items-start">
        <h1 className="font-bold text-xl">Sales Figures</h1>
        <DeductionsDialog
          orders={filteredOrders}
          expenses={expenses}
          dateRange={
            dateRange && dateRange.from && dateRange.to
              ? { from: dateRange.from, to: dateRange.to }
              : undefined
          }
        />
      </div>
      <ChartContainer config={chartConfig} className="h-[30vh] w-full">
        <LineChart
          accessibilityLayer
          data={grossAndNetData}
          margin={{
            top: 20,
            left: -20,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis tickLine={false} axisLine={false} />
          <ChartLegend
            verticalAlign="top"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              paddingBottom: "20px",
            }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            dataKey="gross"
            type="monotone"
            // stroke="red"
            stroke="#d64846"
            strokeWidth={2}
            dot={false}
          />
          <Line
            dataKey="net"
            type="monotone"
            stroke="#5bbe80"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
