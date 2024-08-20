import { FinancialChartProps } from "../../lib/types";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  Cell,
  // Legend,
  YAxis,
} from "recharts";

export default function FinancialChart({
  data,
}: {
  data: FinancialChartProps[];
}) {
  const chartConfig = {
    // gross: {
    //   label: "Gross Sales",
    // },
    // net: {
    //   label: "Net Sales",
    // },
  } satisfies ChartConfig;

  // const legendData = [
  //   { value: "Gain", color: "#5bbe80" }, // Color for positive profit
  //   { value: "Loss", color: "#d64846" }, // Color for negative profit
  // ];

  return (
    <div className="border border-slate-300 py-4 px-5 rounded-xl">
      <h1 className="font-bold text-xl">Financial Analysis</h1>
      <ChartContainer config={chartConfig}>
        <BarChart
          accessibilityLayer
          data={data}
          margin={{
            top: 20,
            left: -20,
            right: 12,
            // bottom: -40,
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
          {/* <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            content={() => (
              <div className="flex gap-4 justify-center mt-4">
                {legendData.map((item, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-full inline-block"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          /> */}
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="profit" radius={4}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.profit < 0 ? "#d64846" : "#5bbe80"} // Red if profit is negative, green otherwise
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
