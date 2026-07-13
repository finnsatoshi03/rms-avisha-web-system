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
    <div className="surface-card flex flex-col overflow-hidden">
      <div className="py-4 px-5 space-y-2 flex-grow">
        <h1 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {header}
        </h1>
        <div>
          <p className="font-display font-bold tracking-tight lg:text-3xl text-xl">
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
            data={(monthlyMetrics ?? []).filter(
              (data: any) => data[nameKey!] !== 0
            )}
          >
            <Line
              type="monotone"
              strokeWidth={2}
              dataKey={nameKey}
              dot={{ strokeWidth: 0 }}
              stroke="#f12924"
              fill="#f12924"
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
              <button className="w-full bg-muted/70 text-foreground px-4 py-3 font-semibold text-xs hover:bg-muted transition-colors flex justify-between items-center">
                View Report
                <ArrowRight size={14} />
              </button>
            </DialogTrigger>
            <DialogContent className="w-[94vw] sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl">
              {(() => {
                // Brand-anchored week palette (red → orange → amber → green → blue)
                const WEEK_COLORS = [
                  "#f12924",
                  "#fb6514",
                  "#f79009",
                  "#12b76a",
                  "#2e90fa",
                ];
                const metricLabel = nameKey
                  ? nameKey.charAt(0).toUpperCase() + nameKey.slice(1)
                  : "";
                const weeks: { value: number; weekRange: string }[] =
                  weeklyMetrics ?? [];
                const totalValue = weeks.reduce(
                  (sum, week) => sum + (week.value || 0),
                  0
                );

                return (
                  <>
                    <DialogHeader>
                      <DialogTitle className="font-display text-xl tracking-tight">
                        {metricLabel} — Weekly Report
                      </DialogTitle>
                    </DialogHeader>

                    {/* Total */}
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total {metricLabel} this period
                      </p>
                      <p className="font-display text-4xl font-bold tracking-tight">
                        {prefix}
                        {formatNumberWithCommas(Number(value))}
                      </p>
                    </div>

                    {/* Week share bar */}
                    {totalValue > 0 && (
                      <div className="flex w-full gap-1">
                        {weeks.map((week, index) => {
                          if (week.value === 0) return null;
                          const percentage = (week.value / totalValue) * 100;
                          return (
                            <div
                              key={index}
                              className="h-2.5 rounded-full"
                              style={{
                                flex: `${percentage} 0 0`,
                                minWidth: "12px",
                                backgroundColor:
                                  WEEK_COLORS[index % WEEK_COLORS.length],
                              }}
                              title={`Week ${index + 1} (${
                                week.weekRange
                              }): ${formatNumberWithCommas(
                                week.value
                              )} — ${percentage.toFixed(1)}%`}
                            ></div>
                          );
                        })}
                      </div>
                    )}

                    {/* Week-by-week list */}
                    <div className="divide-y divide-border rounded-xl border">
                      {weeks.map((week, index) => {
                        const percentage =
                          totalValue > 0
                            ? (week.value / totalValue) * 100
                            : 0;
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className="size-2.5 flex-shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    WEEK_COLORS[index % WEEK_COLORS.length],
                                }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                  Week {index + 1}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {week.weekRange}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-display text-base font-bold tracking-tight">
                                {prefix}
                                {formatNumberWithCommas(week.value)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {percentage.toFixed(1)}% of total
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default ReportCard;
