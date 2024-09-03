import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Tooltip as TipTool,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { MonitorCheck } from "lucide-react";
import { JobOrderData, Metrics } from "../../lib/types";
import {
  formatMachineType,
  formatNumberWithCommas,
  generateMonochromaticColors,
} from "../../lib/helpers";
import CustomToolTip from "./custom-tooltip";

interface PieChartComponentProps {
  data: JobOrderData[];
  metrics: Metrics;
}

const PieChartComponent: React.FC<PieChartComponentProps> = ({
  data,
  metrics,
}) => {
  const tooltipText =
    "Explore the revenue distribution across different machine types through this interactive pie chart. Each segment represents the percentage of total revenue generated from machine types like Laptops, Printers, etc., providing insights into the most profitable categories.";

  const aggregatedData = data.reduce(
    (
      acc: Record<string, { name: string; value: number; orders: number }>,
      order
    ) => {
      if (!acc[order.machine_type]) {
        acc[order.machine_type] = {
          name: order.machine_type,
          value: 0,
          orders: 0,
        };
      }

      const revenue =
        order.downpayment && order.downpayment > 0
          ? order.downpayment
          : order.adjustedGrandTotal ?? 0;

      // Always add the revenue
      acc[order.machine_type].value += revenue;

      // Only increment the order count if the status is "Completed" or "pull out"
      if (
        order.status.toLowerCase() === "completed" ||
        order.status.toLowerCase() === "pull out"
      ) {
        acc[order.machine_type].orders += 1;
      }

      return acc;
    },
    {}
  );

  const aggregatedDataArray = Object.values(aggregatedData);
  const totalRevenue = aggregatedDataArray.reduce(
    (acc, item) => acc + item.value,
    0
  );
  const sortedData = [...aggregatedDataArray].sort((a, b) => b.value - a.value);
  const maxRevenueMachineType = sortedData[0];
  // const minRevenueMachineType = sortedData[sortedData.length - 1];

  const colors = generateMonochromaticColors(
    "#2e2e2e",
    aggregatedDataArray.length
  );

  return (
    <div className="revenue-breakdown-chart border border-slate-300 p-5 rounded-xl h-[50vh] flex flex-col justify-between">
      <h3 className="text-sm font-bold flex items-center gap-1">
        <MonitorCheck
          size={18}
          strokeWidth={1.5}
          color="#f12924"
          className="size-8 p-1.5 bg-slate-50 rounded-lg"
        />
        Revenue Breakdown
        <TooltipProvider>
          <TipTool delayDuration={100}>
            <TooltipTrigger>
              <span className="p-0.5 ml-1 size-4 bg-gray-300 rounded-full text-white flex items-center justify-center">
                i
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs w-[250px]">
              {tooltipText}
            </TooltipContent>
          </TipTool>
        </TooltipProvider>
      </h3>
      <ResponsiveContainer height="60%">
        <PieChart>
          <Tooltip content={<CustomToolTip />} />
          <Pie
            dataKey="value"
            data={aggregatedDataArray}
            innerRadius="45%"
            startAngle={90}
            endAngle={450}
            fill="#8884d8"
          >
            {aggregatedDataArray.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.value === maxRevenueMachineType.value
                    ? "#f12924"
                    : colors[index]
                }
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col text-center gap-4">
        <div>
          <p className="font-bold text-black text-2xl">
            {formatNumberWithCommas(metrics.numberOfSales)}
          </p>
          <p className="text-xs text-gray-400">Total Sales</p>
        </div>
        <div>
          {aggregatedDataArray.map((item, index) => {
            const isMax = item.name === maxRevenueMachineType.name;
            const color = isMax ? "#f12924" : colors[index];
            return (
              <div
                key={item.name}
                className="text-xs flex items-center justify-between gap-2"
              >
                <p className="flex items-center gap-2 text-gray-400">
                  <span
                    className="inline-block w-5 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  ></span>
                  {formatMachineType(item.name)}
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-bold font-mono">
                    {((item.value / totalRevenue) * 100).toFixed(2)}%
                  </p>
                  <p>({item.orders} sales)</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PieChartComponent;
