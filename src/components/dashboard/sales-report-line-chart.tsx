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

const compactPeso = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

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
    <div className="surface-card py-4 px-5">
      <div className="flex justify-between items-start">
        <h1 className="font-display font-bold text-xl tracking-tight">
          Sales Figures
        </h1>
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
            left: 0,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} stroke="#eceef1" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) =>
              `₱${compactPeso.format(Number(value) || 0)}`
            }
          />
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
            stroke="#f12924"
            strokeWidth={2}
            dot={false}
          />
          <Line
            dataKey="net"
            type="monotone"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
