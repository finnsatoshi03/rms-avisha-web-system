import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";
import CountUp from "react-countup";
import AutoSizeText from "../ui/auto-size-text";

interface OverviewData {
  header: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  /** Percent change vs last month. Omit on surfaces that have no
   *  period-over-period figure (e.g. the rental dashboard) — the trend pill is
   *  hidden rather than showing a fabricated 0%. */
  pcp?: string;
  icon: LucideIcon | null;
}

export default function OverviewCard({
  data,
  className,
  valueClassName,
  decimals,
}: {
  data: OverviewData;
  className?: string;
  /** Tints the main figure — used for alert states like overdue counts. */
  valueClassName?: string;
  /** Overrides the default header-name inference below. */
  decimals?: number;
}) {
  if (!data) {
    return null;
  }

  const getPcpColor = (pcp: string) => {
    const value = parseFloat(pcp);
    if (value === 0) return "bg-muted text-muted-foreground";
    if (value > 100) return "bg-blue-50 text-blue-700";
    if (value > 0) return "bg-emerald-50 text-emerald-700";
    if (value > -100) return "bg-red-50 text-brand-deep";
    return "bg-purple-50 text-purple-700";
  };

  const getPcpIcon = (pcp: string) => {
    const value = parseFloat(pcp);
    if (value === 0) return null;
    if (value > 0) {
      return (
        <TrendingUp
          size={12}
          strokeWidth={2}
          className={value > 100 ? "text-blue-700" : "text-emerald-700"}
        />
      );
    }
    return (
      <TrendingDown size={12} strokeWidth={2} className="text-brand-deep" />
    );
  };

  return (
    <div
      className={cn(
        "surface-card p-6 flex flex-col gap-4",
        className
      )}
    >
      {/* Header with Icon */}
      <div className="flex items-center justify-between">
        <h1 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {data.header}
        </h1>
        {data.icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft">
            <data.icon
              size={15}
              strokeWidth={1.75}
              className="text-brand-deep"
            />
          </span>
        )}
      </div>

      {/* Main Value */}
      <div className="flex flex-col flex-1 justify-between gap-3">
        <AutoSizeText
          className={cn(
            "font-display font-bold tracking-tight text-foreground",
            valueClassName
          )}
          minSize={16}
          maxSize={28}
        >
          <CountUp
            start={0}
            end={data.value as number}
            duration={1.2}
            separator=","
            decimals={
              decimals ??
              (data.header === "Clients" || data.header === "Sales" ? 0 : 2)
            }
            decimal="."
            prefix={data.prefix}
          />
          {data.suffix || ""}
        </AutoSizeText>

        {/* Percentage Change — omitted entirely when there is no pcp to show */}
        {data.pcp !== undefined && (
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold flex-shrink-0",
                getPcpColor(data.pcp)
              )}
            >
              {getPcpIcon(data.pcp)}
              <span>
                {parseFloat(data.pcp) === 0
                  ? "0%"
                  : data.pcp.replace(/[+-]/g, "")}
              </span>
            </div>
            <span className="text-muted-foreground">from last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
