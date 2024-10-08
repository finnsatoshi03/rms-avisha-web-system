import { useState, useMemo } from "react";
import {
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { JobOrderData } from "../../lib/types";
import { generateMonochromaticColors } from "../../lib/helpers";
import CustomToolTip from "./custom-tooltip";
import {
  Tooltip as Hint,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { DatePickerWithRange } from "../date-range-picker";
import { DateRange } from "react-day-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Briefcase, ChevronsUpDown } from "lucide-react";

function formatDateRange(start: Date | undefined, end: Date | undefined) {
  const options = { year: "numeric", month: "short", day: "numeric" } as const;
  if (!start || !end) {
    return "Invalid date range";
  }
  return `${start.toLocaleDateString(
    undefined,
    options
  )} - ${end.toLocaleDateString(undefined, options)}`;
}

export default function RevenuePerTechnicianPieChart({
  orders,
  isAnalytics,
}: {
  orders: JobOrderData[];
  isAnalytics?: boolean;
}) {
  const [selectedFilter, setSelectedFilter] = useState("All Time");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(
    undefined
  );

  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastQuarterStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const lastQuarterEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  function aggregateRevenueByTechnician(orders: JobOrderData[]) {
    const revenueByTechnician: { [key: string]: number } = {};

    orders.forEach((order) => {
      const technicianName =
        order.users?.fullname ||
        order.users?.email ||
        order.order_received_user?.fullname ||
        order.order_received_user?.email ||
        "Unassigned";

      const revenueAmount =
        order.status === "Completed" ||
        order.status.toLowerCase() === "pull out"
          ? order.adjustedGrandTotal ?? 0
          : order.downpayment ?? 0;

      if (revenueByTechnician[technicianName]) {
        revenueByTechnician[technicianName] += revenueAmount;
      } else {
        revenueByTechnician[technicianName] = revenueAmount;
      }
    });

    return Object.keys(revenueByTechnician).map((technicianName) => ({
      name: technicianName,
      value: revenueByTechnician[technicianName],
    }));
  }

  function filterOrders(orders: JobOrderData[]) {
    let filteredOrders = orders;

    switch (selectedFilter) {
      case "Last Month":
        filteredOrders = orders.filter(
          (order) =>
            new Date(order.created_at) >= lastMonthStart &&
            new Date(order.created_at) <= lastMonthEnd
        );
        break;
      case "Last Quarter":
        filteredOrders = orders.filter(
          (order) =>
            new Date(order.created_at) >= lastQuarterStart &&
            new Date(order.created_at) <= lastQuarterEnd
        );
        break;
      case "Year to Date":
        filteredOrders = orders.filter(
          (order) => new Date(order.created_at) >= startOfYear
        );
        break;
      case "Custom":
        if (customDateRange?.from && customDateRange?.to) {
          filteredOrders = orders.filter(
            (order) =>
              new Date(order.created_at) >=
                (customDateRange?.from ?? new Date(0)) &&
              new Date(order.created_at) <= (customDateRange?.to ?? new Date())
          );
        }
        break;
      default:
        break;
    }

    return filteredOrders;
  }

  const filteredOrders = useMemo(
    () => filterOrders(orders),
    [orders, selectedFilter, customDateRange]
  );
  const data = useMemo(
    () => aggregateRevenueByTechnician(filteredOrders),
    [filteredOrders]
  );

  const maxRevenue = Math.max(...data.map((d) => d.value));
  const baseColor = "#f12924";
  const colors = generateMonochromaticColors("#2e2e2e", data.length);

  return (
    <div className="revenue-per-tech-chart border border-slate-300 rounded-lg py-4 px-5 h-[50vh]">
      <div className="flex justify-between mb-4">
        {isAnalytics ? (
          <h1 className="text-sm font-bold flex items-center gap-1">
            <Briefcase
              size={18}
              strokeWidth={1.5}
              color="#f12924"
              className="size-8 p-1.5 bg-slate-50 rounded-lg"
            />
            Revenue Generated per Technician
            <TooltipProvider>
              <Hint delayDuration={100}>
                <TooltipTrigger>
                  <span className="p-0.5 ml-1 size-4 bg-gray-300 rounded-full text-white flex items-center justify-center">
                    i
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs w-[250px]">
                  Hover over each segment of the pie chart to view the revenue
                  generated by each technician. This chart provides a visual
                  breakdown of individual performance. Use the selector to
                  filter the data by All Time, Last Month, Last Quarter, Year to
                  Date, or a Custom Range for more specific insights.
                </TooltipContent>
              </Hint>
            </TooltipProvider>
          </h1>
        ) : (
          <>
            <h1 className="text-lg font-bold">
              Revenue Generated per Technician
            </h1>
            <DropdownMenu>
              <DropdownMenuTrigger className="h-fit w-fit mt-1.5 justify-self-end z-10 text-left text-xs flex items-center gap-1">
                {/* <Button>What the fuck?</Button> */}
                {selectedFilter === "Custom" && customDateRange ? (
                  <div>
                    <p className="font-bold">Custom:</p>{" "}
                    {customDateRange.from && customDateRange.to
                      ? formatDateRange(
                          customDateRange.from,
                          customDateRange.to
                        )
                      : "Select a date range"}
                  </div>
                ) : (
                  selectedFilter.replace("-", " ")
                )}
                <ChevronsUpDown size={10} strokeWidth={1.5} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <TooltipProvider>
                  <Hint>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("All Time")}
                      >
                        All Time
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      sideOffset={10}
                      className="w-[250px] text-xs"
                    >
                      Display the total revenue generated by each technician
                      from the beginning of recorded data to the current date.
                    </TooltipContent>
                  </Hint>
                  <Hint>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("Last Month")}
                      >
                        Last Month
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      sideOffset={10}
                      className="w-[250px] text-xs"
                    >
                      Show the revenue generated by each technician in the most
                      recent month (
                      {formatDateRange(lastMonthStart, lastMonthEnd)}
                      ).
                    </TooltipContent>
                  </Hint>
                  <Hint>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("Last Quarter")}
                      >
                        Last Quarter
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      sideOffset={10}
                      className="w-[250px] text-xs"
                    >
                      Display the revenue generated by each technician over the
                      last three months (
                      {formatDateRange(lastQuarterStart, lastQuarterEnd)}).
                    </TooltipContent>
                  </Hint>
                  <Hint>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("Year to Date")}
                      >
                        Year to Date
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      sideOffset={10}
                      className="w-[250px] text-xs"
                    >
                      Show the revenue generated by each technician from January
                      1, {now.getFullYear()}, to the current date.
                    </TooltipContent>
                  </Hint>
                  <Hint>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        className="custom-datepicker flex flex-col items-start"
                        asChild
                      >
                        <DropdownMenuItem
                          className="custom-datepicker flex flex-col items-start"
                          asChild
                        >
                          <DatePickerWithRange
                            value={customDateRange}
                            onChange={(range) => {
                              setCustomDateRange(range);
                              if (range?.from && range?.to) {
                                setSelectedFilter("Custom");
                              }
                            }}
                          />
                        </DropdownMenuItem>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      sideOffset={10}
                      className="w-[250px] text-xs"
                    >
                      Allow users to specify a start and end date to view the
                      revenue generated by each technician within that range.
                    </TooltipContent>
                  </Hint>
                </TooltipProvider>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      <ResponsiveContainer>
        <PieChart margin={{ top: 30, bottom: 40 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            label={(entry) => `₱${entry.value.toLocaleString()}`}
            fontSize={12}
            fontWeight={900}
            innerRadius={"40%"}
            outerRadius={"80%"}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value === maxRevenue ? baseColor : colors[index]}
              />
            ))}
          </Pie>
          <Legend
            formatter={(value) => (
              <span className={`text-xs text-black`}>{value}</span>
            )}
            iconType="circle"
            iconSize={5}
            wrapperStyle={{
              paddingTop: "20px",
              paddingBottom: "50px",
            }}
          />
          <Tooltip content={<CustomToolTip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
