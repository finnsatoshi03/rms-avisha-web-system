import { useMemo } from "react";
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

const compactCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatAxisValue = (value: number | string) => {
  const amount = typeof value === "number" ? value : Number(value) || 0;
  const sign = amount < 0 ? "-" : "";
  return `${sign}₱${compactCurrencyFormatter.format(Math.abs(amount))}`;
};

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

  const normalizedData = useMemo(
    () =>
      data.map((entry) => ({
        ...entry,
        profit: Number(entry.profit) || 0,
      })),
    [data]
  );

  const yDomain = useMemo<[number, number]>(() => {
    if (!normalizedData.length) return [-1, 1];

    const min = Math.min(0, ...normalizedData.map((item) => item.profit));
    const max = Math.max(0, ...normalizedData.map((item) => item.profit));
    const maxAbs = Math.max(Math.abs(min), Math.abs(max));
    const padding = Math.max(maxAbs * 0.1, 1);

    return [min - padding, max + padding];
  }, [normalizedData]);

  // const legendData = [
  //   { value: "Gain", color: "#5bbe80" }, // Color for positive profit
  //   { value: "Loss", color: "#d64846" }, // Color for negative profit
  // ];

  return (
    <div className="border border-slate-300 py-4 px-5 rounded-xl">
      <h1 className="font-bold text-xl">Financial Analysis</h1>
      <ChartContainer
        config={chartConfig}
        className="mt-4 h-[260px] sm:h-[300px] w-full aspect-auto min-w-0"
      >
        <BarChart
          accessibilityLayer
          data={normalizedData}
          margin={{
            top: 12,
            left: 12,
            right: 12,
            bottom: 0,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={16}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={84}
            tickMargin={8}
            tickCount={6}
            allowDecimals={false}
            domain={yDomain}
            tickFormatter={formatAxisValue}
          />
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
          <Bar dataKey="profit" radius={4} minPointSize={3}>
            {normalizedData.map((entry, index) => (
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
