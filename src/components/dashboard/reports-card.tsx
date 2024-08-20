/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { formatNumberWithCommas } from "../../lib/helpers";
import { Line, LineChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

interface ReportCardProps {
  header: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  pcp: string;
  monthlyMetrics?: any;
  weeklyMetrics?: any;
  nameKey?: string;
  viewReport?: boolean;
}

const ReportCard = ({
  header,
  value,
  prefix,
  pcp,
  monthlyMetrics,
  weeklyMetrics,
  nameKey,
  viewReport = false,
}: ReportCardProps) => {
  const chartConfig = {};

  const getClassNames = (pcp: string, nameKey: string | undefined) => {
    if (nameKey === "expenses") {
      return pcp === "0" || pcp === "-0" || pcp === "+0"
        ? "bg-yellow-200 text-yellow-600"
        : pcp.includes("-")
        ? "bg-green-200 text-green-600"
        : "bg-red-200 text-red-600";
    } else {
      return pcp === "0" || pcp === "-0" || pcp === "+0"
        ? "bg-yellow-200 text-yellow-600"
        : pcp.includes("-")
        ? "bg-red-200 text-red-600"
        : "bg-green-200 text-green-600";
    }
  };

  const getIcon = (pcp: string, nameKey: string | undefined) => {
    if (nameKey === "expenses") {
      return pcp === "0" || pcp === "-0" || pcp === "+0" ? (
        "~ "
      ) : pcp.includes("-") ? (
        <TrendingDown size={12} strokeWidth={1.5} />
      ) : (
        <TrendingUp size={12} strokeWidth={1.5} />
      );
    } else {
      return pcp === "0" || pcp === "-0" || pcp === "+0" ? (
        "~ "
      ) : pcp.includes("-") ? (
        <TrendingDown size={12} strokeWidth={1.5} />
      ) : (
        <TrendingUp size={12} strokeWidth={1.5} />
      );
    }
  };

  return (
    <div className="border border-slate-300 rounded-lg flex flex-col">
      <div className="py-4 px-5 space-y-2 flex-grow">
        <h1 className="text-xs font-bold">{header}</h1>
        <div>
          <p className="font-bold text-3xl">
            {prefix}
            {formatNumberWithCommas(Number(value))}
          </p>
          <div className="text-xs opacity-70 flex items-center flex-wrap gap-1">
            <p
              className={`flex text-xs items-center justify-center gap-1 w-fit px-2 py-0.5 rounded-full font-bold font-mono ${getClassNames(
                pcp,
                nameKey
              )}`}
            >
              {getIcon(pcp, nameKey)}
              {pcp === "0"
                ? pcp.replace(/[+-]/g, "")
                : pcp.replace(/[+-]/g, "")}{" "}
            </p>
            <p>from last month</p>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[80px] w-full">
          <LineChart
            data={monthlyMetrics.filter((data: any) => data[nameKey!] !== 0)}
          >
            <Line
              type="monotone"
              strokeWidth={2}
              dataKey={nameKey}
              dot={{ strokeWidth: 0 }}
              stroke="#282828"
              fill="#646464"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelKey="month" />}
            />
          </LineChart>
        </ChartContainer>
      </div>
      {viewReport && (
        <div className="w-full">
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full bg-slate-100 text-black px-4 py-3 font-bold text-xs rounded-b-lg hover:bg-slate-200 flex justify-between items-center">
                View Report
                <ArrowRight size={14} />
              </button>
            </DialogTrigger>
            <DialogContent className="w-[400px]">
              <DialogHeader>
                <DialogTitle>
                  {nameKey
                    ? nameKey.charAt(0).toUpperCase() + nameKey.slice(1)
                    : ""}{" "}
                  Weekly Reports
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                <div className="flex gap-2">
                  <p className="text-4xl font-bold">
                    {prefix}
                    {formatNumberWithCommas(Number(value))}
                  </p>
                  <p className="text-xs font-bold mt-1 leading-3 opacity-60">
                    Total
                    <br />
                    {nameKey
                      ? nameKey.charAt(0).toUpperCase() + nameKey.slice(1)
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center -mt-2">
                <div className="flex w-full space-x-2">
                  {weeklyMetrics &&
                    weeklyMetrics.map((weekValue: number, index: number) => {
                      if (weekValue === 0) return null;

                      const totalValue = weeklyMetrics.reduce(
                        (sum: number, val: number) => sum + val,
                        0
                      );
                      const percentage = (weekValue / totalValue) * 100;

                      // Assign different colors for each week (up to 5)
                      const weekColors = [
                        "bg-red-500",
                        "bg-yellow-500",
                        "bg-green-500",
                        "bg-blue-500",
                        "bg-purple-500",
                      ];

                      return (
                        <div
                          key={index}
                          // className="text-center"
                          style={{ flex: `${percentage} 0 0` }}
                        >
                          {/* Individual week bar */}
                          <div
                            // style={{ height: "100%" }}
                            className={`h-2 rounded-full ${
                              weekColors[index % weekColors.length]
                            }`}
                            title={`Week ${index + 1}: ${formatNumberWithCommas(
                              weekValue
                            )} (${percentage.toFixed(1)}%)`}
                          ></div>
                          {/* Label underneath the bar */}
                          <p className="text-xs mt-1">
                            {formatNumberWithCommas(weekValue)}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="grid grid-cols-3 w-full gap-1 mt-1">
                {weeklyMetrics &&
                  weeklyMetrics.map((weekValue: number, index: number) => {
                    return (
                      <div
                        className="px-2 py-3 rounded-xl bg-slate-200 flex flex-col items-center justify-center"
                        key={index}
                      >
                        <p className="font-bold text-xl">
                          {prefix}
                          {formatNumberWithCommas(weekValue)}
                        </p>
                        <h1 className="text-xs opacity-80">Week {index + 1}</h1>
                      </div>
                    );
                  })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default ReportCard;
