import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";
import CountUp from "react-countup";

interface OverviewData {
  header: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  pcp: string;
  icon: LucideIcon | null;
}

export default function OverviewCard({
  data,
  className,
}: {
  data: OverviewData;
  className?: string;
}) {
  if (!data) {
    return null;
  }

  const getPcpColor = (pcp: string) => {
    const value = parseFloat(pcp);
    if (value === 0) return " text-gray-600";
    if (value > 100) return "text-blue-700 border-blue-200";
    if (value > 0) return "text-green-700 border-green-200";
    if (value > -100) return "text-red-700 border-red-200";
    return "text-purple-700 border-purple-200";
  };

  const getPcpIcon = (pcp: string) => {
    const value = parseFloat(pcp);
    if (value === 0) return null;
    if (value > 0) {
      return (
        <TrendingUp
          size={12}
          strokeWidth={2}
          className={value > 100 ? "text-blue-700" : "text-green-700"}
        />
      );
    }
    return <TrendingDown size={12} strokeWidth={2} className="text-red-700" />;
  };

  return (
    <div
      className={cn(
        "border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-shadow duration-200 p-6 flex flex-col gap-4",
        className
      )}
    >
      {/* Header with Icon */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-700 tracking-tight">
          {data.header}
        </h1>
        {data.icon && (
          <data.icon size={16} strokeWidth={1.5} className="text-gray-400" />
        )}
      </div>

      {/* Main Value */}
      <div className="flex flex-col flex-1 justify-between gap-3">
        <p className="font-bold text-2xl text-gray-900 leading-none break-all">
          <CountUp
            start={0}
            end={data.value as number}
            duration={1.2}
            separator=","
            decimals={
              data.header === "Clients" || data.header === "Sales" ? 0 : 2
            }
            decimal="."
            prefix={data.prefix}
          />
          {data.suffix || ""}
        </p>

        {/* Percentage Change */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div
            className={cn(
              "inline-flex items-center gap-1 font-medium flex-shrink-0",
              getPcpColor(data.pcp)
            )}
          >
            {getPcpIcon(data.pcp)}
            <span className="font-mono">
              {parseFloat(data.pcp) === 0
                ? "0%"
                : data.pcp.replace(/[+-]/g, "")}
            </span>
          </div>
          <span className="text-gray-500">from last month</span>
        </div>
      </div>
    </div>
  );
}
