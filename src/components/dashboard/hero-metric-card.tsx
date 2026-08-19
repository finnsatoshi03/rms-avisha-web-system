import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import CountUp from "react-countup";
import { cn } from "../../lib/utils";

interface OverviewData {
  header: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  /** Percent change vs last month. Omit where no period-over-period figure
   *  exists — the trend pill is hidden instead of showing a fabricated 0%. */
  pcp?: string;
  icon: LucideIcon | null;
  /** Replaces the trend row when there is no pcp (e.g. "Completed rentals +
   *  billing payments"). Ignored when pcp is present. */
  caption?: string;
}

/**
 * Large-format stat card anchoring the dashboard bento grid. Renders the same
 * OverviewData shape as OverviewCard, just at hero scale on an ink surface.
 */
export default function HeroMetricCard({
  data,
  className,
}: {
  data: OverviewData;
  className?: string;
}) {
  if (!data) return null;

  const pcpValue = parseFloat(data.pcp ?? "");
  const isUp = pcpValue > 0;
  const isFlat = pcpValue === 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gray-950 p-6 text-white shadow-card flex flex-col justify-between gap-6",
        className
      )}
    >
      {/* brand red glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primaryRed/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-primaryRed/10 blur-3xl"
      />

      <div className="relative flex items-center justify-between">
        <h1 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
          {data.header}
        </h1>
        {data.icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <data.icon size={18} strokeWidth={1.5} className="text-white/90" />
          </span>
        )}
      </div>

      <div className="relative flex flex-col gap-3">
        <p className="font-display text-4xl font-bold tracking-tight xl:text-[2.75rem] xl:leading-none">
          <CountUp
            start={0}
            end={data.value as number}
            duration={1.2}
            separator=","
            decimals={2}
            decimal="."
            prefix={data.prefix}
          />
          {data.suffix || ""}
        </p>
        {data.pcp !== undefined ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold",
                isFlat
                  ? "bg-white/10 text-white/80"
                  : isUp
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "bg-primaryRed/20 text-red-300"
              )}
            >
              {!isFlat &&
                (isUp ? (
                  <TrendingUp size={12} strokeWidth={2} />
                ) : (
                  <TrendingDown size={12} strokeWidth={2} />
                ))}
              {isFlat ? "0%" : data.pcp.replace(/[+-]/g, "")}
            </span>
            <span className="text-white/60">from last month</span>
          </div>
        ) : data.caption ? (
          <p className="text-xs text-white/60">{data.caption}</p>
        ) : null}
      </div>
    </div>
  );
}
