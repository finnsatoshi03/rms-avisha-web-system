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
  // const valueAsString =
  //   data.header === "Average Order Value"
  //     ? Number(data.value).toFixed(2)
  //     : data.value.toString();
  // const formattedValue = formatNumberWithCommas(Number(valueAsString));

  return (
    <div
      className={cn(
        "border border-slate-300 rounded-lg py-4 px-5 flex flex-col justify-between",
        className
      )}
    >
      {data.icon && (
        <div className="flex items-center justify-between mb-2">
          <data.icon size={16} strokeWidth={1.5} />
        </div>
      )}
      <div>
        <h1 className="text-xs font-bold">{data.header}</h1>
        <p className="font-bold lg:text-3xl text-xl">
          <CountUp
            start={0}
            end={data.value as number}
            duration={1}
            separator=","
            decimals={
              data.header === "Clients" || data.header === "Sales" ? 0 : 2
            }
            decimal="."
            prefix={data.prefix}
          />
          {data.suffix || ""}
        </p>
        <div className="text-xs opacity-70 flex items-center flex-wrap gap-1">
          <p
            className={`flex text-xs items-center justify-center gap-1 w-fit px-2 py-0.5 rounded-full font-bold font-mono ${
              parseFloat(data.pcp) > 100
                ? "bg-blue-200 text-blue-600" // Significant increase from a positive base
                : parseFloat(data.pcp) > 0
                ? "bg-green-200 text-green-600" // Increase from a positive base
                : parseFloat(data.pcp) > -100
                ? "bg-red-200 text-red-600" // Decrease from a positive base
                : "bg-purple-200 text-purple-600" // Significant increase from a negative base
            }`}
          >
            {parseFloat(data.pcp) === 0 ? (
              "~ "
            ) : parseFloat(data.pcp) > 100 ? (
              <TrendingUp
                size={12}
                strokeWidth={1.5}
                className="text-blue-600"
              />
            ) : parseFloat(data.pcp) > 0 ? (
              <TrendingUp
                size={12}
                strokeWidth={1.5}
                className="text-green-600"
              />
            ) : parseFloat(data.pcp) > -100 ? (
              <TrendingDown
                size={12}
                strokeWidth={1.5}
                className="text-red-600"
              />
            ) : (
              <TrendingUp
                size={12}
                strokeWidth={1.5}
                className="text-purple-600"
              />
            )}
            {data.pcp === "0"
              ? ""
              : data.header !== "Clients"
              ? data.pcp.replace(/[+-]/g, "")
              : data.pcp.replace(/[+-]/g, "")}{" "}
          </p>
          <p>from last month</p>
        </div>
      </div>
    </div>
  );
}
