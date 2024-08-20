import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Tooltip as TipTool,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { MapPinned, TrendingDown, TrendingUp } from "lucide-react";
import { formatNumberWithCommas } from "../../lib/helpers";
import { JobOrderData, Metrics } from "../../lib/types";
import CustomToolTip from "./custom-tooltip";
import { Separator } from "../ui/separator";

interface SalesByBranchProps {
  data: JobOrderData[];
  metrics: Metrics;
}

const SalesByBranch: React.FC<SalesByBranchProps> = ({ data, metrics }) => {
  const aggregatedData = data.reduce((acc: Record<string, number>, order) => {
    if (!acc[order.branches.location]) {
      acc[order.branches.location] = 0;
    }
    acc[order.branches.location] += order.adjustedGrandTotal ?? 0;
    return acc;
  }, {});

  const chartData = Object.entries(aggregatedData).map(([location, sales]) => ({
    location,
    sales,
  }));

  return (
    <div className="sales-by-region-chart border border-slate-300 p-5 rounded-xl h-[50vh] flex flex-col justify-between">
      <h3 className="text-sm font-bold flex items-center gap-1">
        <MapPinned
          size={18}
          strokeWidth={1.5}
          color="#f12924"
          className="size-8 p-1.5 bg-slate-50 rounded-lg"
        />
        Sales by Region/Branch
        <TooltipProvider>
          <TipTool delayDuration={100}>
            <TooltipTrigger>
              <span className="p-0.5 ml-1 size-4 bg-gray-300 rounded-full text-white flex items-center justify-center">
                i
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs w-[250px]">
              Hover over the bar chart to see detailed sales figures for each
              region or branch. This visualization helps identify high and
              low-performing areas at a glance.
            </TooltipContent>
          </TipTool>
        </TooltipProvider>
      </h3>
      <div className="my-2">
        <p className="text-xs opacity-70">Total Revenue: </p>
        <h1 className="text-2xl font-bold">
          ₱{formatNumberWithCommas(metrics.totalRevenue)}
        </h1>
        <div className="text-xs opacity-70 flex items-center flex-wrap gap-1">
          <p
            className={`flex text-xs items-center justify-center gap-1 w-fit px-2 py-0.5 rounded-full font-bold font-mono ${
              metrics.pcpRevenue === 0
                ? "bg-yellow-200 text-yellow-600"
                : metrics.pcpRevenue < 0
                ? "bg-red-200 text-red-600"
                : "bg-green-200 text-green-600"
            }`}
          >
            {metrics.pcpRevenue === 0 ? (
              "~ "
            ) : metrics.pcpRevenue < 0 ? (
              <TrendingDown size={12} strokeWidth={1.5} />
            ) : (
              <TrendingUp size={12} strokeWidth={1.5} />
            )}
            {Math.abs(metrics.pcpRevenue).toFixed(2)}%{" "}
          </p>
          <p>from last month</p>
        </div>
      </div>
      <Separator className="mt-4 mb-2" />
      <ResponsiveContainer height="20%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ left: -10, right: 10 }}
        >
          <Tooltip content={<CustomToolTip />} />
          <YAxis
            dataKey="location"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            type="category"
          />
          <XAxis
            type="number"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            hide
          />
          <Bar dataKey="sales" radius={15} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.location === "Pasig"
                    ? "#f12924"
                    : entry.location === "Taytay"
                    ? "#24F265"
                    : "#2d9c3f"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex justify-between">
        {chartData.map((branch) => (
          <div key={branch.location}>
            <div className="text-xs flex items-center gap-1">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  branch.location === "Pasig" ? "bg-primaryRed" : "bg-[#24F265]"
                }`}
              ></span>
              <p className="opacity-60">{branch.location} Branch</p>
            </div>
            <p className="text-lg font-bold">
              ₱{formatNumberWithCommas(branch.sales)}
            </p>
            <p className="text-xs opacity-60">
              Percentage:{" "}
              <span className="font-bold font-mono">
                {((branch.sales / metrics.totalRevenue) * 100).toFixed(2)}%
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesByBranch;
