import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Tooltip } from "react-tooltip";

import { JobOrderData } from "../../lib/types";
import CalendarHeatmapComponent from "../calendar-heatmap";
import { formatNumberWithCommas } from "../../lib/helpers";
import { Flame } from "lucide-react";
import {
  Tooltip as TipTool,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface Props {
  completedOrders: JobOrderData[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  uniqueYears: number[];
  techPage?: boolean;
}

const TechnicianPerformanceAnalytics = ({
  completedOrders = [],
  selectedYear,
  setSelectedYear,
  uniqueYears = [],
  techPage = false,
}: Props) => {
  const aggregatedTechnicianData = useMemo(
    () =>
      completedOrders.reduce((acc: Record<string, number>, order) => {
        // Check if order.users exists before accessing fullname or email
        const technicianName = order.users?.fullname || order.users?.email;
        const price = order.adjustedGrandTotal || 0;
        if (technicianName) {
          acc[technicianName] = (acc[technicianName] || 0) + price;
        }
        return acc;
      }, {}),
    [completedOrders]
  );

  const sortedTechnicians = useMemo(
    () =>
      Object.keys(aggregatedTechnicianData).sort(
        (a, b) => aggregatedTechnicianData[b] - aggregatedTechnicianData[a]
      ),
    [aggregatedTechnicianData]
  );

  const topTechnician = sortedTechnicians[0];
  const otherTechnicians = sortedTechnicians.slice(1);

  const [selectedTechnician, setSelectedTechnician] = useState<string>(
    sortedTechnicians[0] || ""
  );

  const technicianData = useMemo(
    () =>
      completedOrders
        .filter(
          (order) =>
            // Again, check if order.users exists before accessing fullname or email
            (order.users?.fullname || order.users?.email) === selectedTechnician
        )
        .reduce((acc: Record<string, number>, order) => {
          const orderDate = new Date(order.completed_at!);
          if (!isNaN(orderDate.getTime())) {
            const date = format(orderDate, "yyyy-MM-dd");
            acc[date] = (acc[date] || 0) + 1;
          }
          return acc;
        }, {}),
    [completedOrders, selectedTechnician]
  );

  const technicianDataArray = useMemo(
    () =>
      Object.entries(technicianData).map(([date, count]) => ({
        date,
        count,
      })),
    [technicianData]
  );

  const values = useMemo(
    () =>
      Array.from({ length: 365 }, (_, i) => {
        const date = new Date(selectedYear, 0, i + 1);
        const dateString = format(date, "yyyy-MM-dd");
        const count = technicianDataArray.reduce(
          (acc, { date: d, count }) => (d === dateString ? acc + count : acc),
          0
        );
        return { date: dateString, count };
      }),
    [selectedYear, technicianDataArray]
  );

  const totalRepairs = useMemo(
    () => values.reduce((acc, { count }) => acc + count, 0),
    [values]
  );

  return (
    <div
      className={`tech-performance-chart border p-5 rounded-xl ${
        !techPage ? "lg:h-[50vh] h-fit border-slate-300" : ""
      }`}
    >
      {!techPage && (
        <h3 className="text-sm font-bold flex items-center gap-1">
          <Flame
            size={18}
            strokeWidth={1.5}
            color="#f12924"
            className="size-8 p-1.5 bg-slate-50 rounded-lg"
          />
          Daily Repairs Heatmap
          <TooltipProvider>
            <TipTool delayDuration={100}>
              <TooltipTrigger>
                <span className="p-0.5 ml-1 size-4 bg-gray-300 rounded-full text-white flex items-center justify-center">
                  i
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs w-[250px]">
                This heatmap visualizes the daily number of repairs completed by
                technicians. Darker shades indicate higher repair activity.
                Select a technician to see their specific performance.
              </TooltipContent>
            </TipTool>
          </TooltipProvider>
        </h3>
      )}
      <div className={`flex gap-4 ${!techPage && "mt-2"}`}>
        <div className="w-full">
          <h1 className="font-bold text-sm mb-2">
            {totalRepairs} repairs in {selectedYear}
          </h1>
          <CalendarHeatmapComponent
            values={values}
            selectedYear={selectedYear}
          />
          <div className="w-full flex items-center justify-between text-xs mt-2">
            <p className="ml-10">Learn how RMS Avisha count repairs</p>
            <div className="flex items-center gap-1">
              <p>Less</p>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, index) => (
                  <span
                    key={index}
                    className="inline-block size-2.5 rounded-[2px]"
                    style={{
                      backgroundColor:
                        index === 0
                          ? "#e8f2eb"
                          : index === 1
                          ? "#a2edb9"
                          : index === 2
                          ? "#62e478"
                          : index === 3
                          ? "#54db7f"
                          : "#24f265",
                    }}
                  ></span>
                ))}
              </div>
              <p>More</p>
            </div>
          </div>
          <Tooltip
            id="my-tooltip"
            style={{
              borderRadius: "10px",
              fontSize: "12px",
            }}
          />
        </div>
        <div className="flex flex-col gap-2 mt-1">
          {uniqueYears
            .sort((a, b) => Number(b) - Number(a))
            .map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`rounded-md px-2 py-0.5 text-xs ${
                  year === selectedYear ? "bg-primaryRed text-white" : ""
                }`}
              >
                {year}
              </button>
            ))}
        </div>
      </div>
      {!techPage && (
        <div className="flex flex-col mt-3">
          <div
            className="flex flex-col"
            onClick={() => setSelectedTechnician(topTechnician)}
          >
            <span className="mr-2 font-bold text-sm">🔥 Top Technician:</span>
            <div
              className={`cursor-pointer text-xs border border-gray-300 rounded px-5 py-1 w-fit flex flex-col items-center mt-1 ${
                topTechnician === selectedTechnician ? "bg-gray-300" : ""
              }`}
            >
              <p>{topTechnician}</p>
              <p>
                ₱
                {formatNumberWithCommas(
                  aggregatedTechnicianData[topTechnician]
                )}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm font-bold">Other Technicians:</p>
          <div className="flex flex-wrap items-center justify-start gap-2 text-xs">
            {otherTechnicians.map((tech) => (
              <button
                key={tech}
                onClick={() => setSelectedTechnician(tech)}
                className={`border border-gray-300 rounded p-1 flex flex-col items-center mt-1 ${
                  tech === selectedTechnician ? "bg-gray-300" : ""
                }`}
              >
                <span>{tech}</span>
                <span>
                  ₱{formatNumberWithCommas(aggregatedTechnicianData[tech])}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianPerformanceAnalytics;
