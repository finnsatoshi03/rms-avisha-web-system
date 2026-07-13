import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JobOrderData } from "../../lib/types";
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
import { Dialog, DialogContent } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Briefcase,
  ChevronsUpDown,
  Trophy,
  Medal,
  Award,
  Eye,
  Crown,
  Star,
} from "lucide-react";
import { cn } from "../../lib/utils";

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

interface TechnicianData {
  name: string;
  value: number;
  jobCount: number;
}

// Animation variants
const podiumVariants = {
  hidden: {
    opacity: 0,
    y: 100,
    scale: 0.8,
  },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 100,
      delay: custom * 0.2,
    },
  }),
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300,
    },
  },
};

const rankingItemVariants = {
  hidden: {
    opacity: 0,
    x: -50,
    scale: 0.9,
  },
  visible: (custom: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 100,
      delay: custom * 0.1 + 0.6,
    },
  }),
  hover: {
    scale: 1.02,
    x: 5,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300,
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const tableRowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.1,
    },
  }),
  hover: {
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    scale: 1.01,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300,
    },
  },
};

// Separate dialog for all technicians leaderboard
const AllTechniciansDialog = ({
  data,
  open,
  onOpenChange,
}: {
  data: TechnicianData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="size-4 text-yellow-500" />;
      case 1:
        return <Medal className="size-4 text-gray-400" />;
      case 2:
        return <Award className="size-4 text-amber-600" />;
      default:
        return <Star className="size-4 text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[900px]">
            <motion.div
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Header */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Dashboard</span>
                    <span>/</span>
                    <span>Productivity Reports</span>
                    <span>/</span>
                    <span className="font-medium text-foreground">
                      Technician Leaderboard
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 border-blue-200 bg-blue-50 text-blue-700"
                  >
                    <Trophy className="size-3" />
                    Productivity Analytics
                  </Badge>
                </div>

                <div className="space-y-4">
                  <h1 className="text-2xl font-bold leading-tight pr-8">
                    Complete Technician Leaderboard
                  </h1>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1.5"
                    >
                      <Trophy className="size-3" />
                      {data.length} Technicians
                    </Badge>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1.5 bg-green-50 text-green-700 border-green-200"
                    >
                      <Star className="size-3" />
                      Revenue Performance
                    </Badge>
                  </div>
                </div>
              </motion.div>

              <Separator />

              {/* Leaderboard Table */}
              <motion.div
                className="space-y-4 flex-1 min-h-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="size-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">
                    Performance Rankings
                  </h3>
                </div>

                <div className="rounded-lg border flex-1 min-h-0">
                  <div className="overflow-y-auto flex-1 min-h-0">
                    <Table>
                      <TableHeader className="sticky top-0 bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[80px]">Rank</TableHead>
                          <TableHead>Technician</TableHead>
                          <TableHead className="text-center">Jobs</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((technician, index) => (
                          <motion.tr
                            key={index}
                            className={cn(
                              index % 2 === 0 ? "bg-white" : "bg-gray-50/30",
                              index < 3 &&
                                "bg-gradient-to-r from-yellow-50/20 to-transparent"
                            )}
                            variants={tableRowVariants}
                            custom={index}
                            initial="hidden"
                            animate="visible"
                            whileHover="hover"
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {getRankIcon(index)}
                                <span className="font-bold text-lg">
                                  #{index + 1}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {technician.name}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono">
                                {technician.jobCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-lg">
                              {formatCurrency(technician.value)}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default function RevenuePerTechnicianLeaderboard({
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
  const [allTechniciansOpen, setAllTechniciansOpen] = useState(false);

  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastQuarterStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const lastQuarterEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  function aggregateRevenueByTechnician(
    orders: JobOrderData[]
  ): TechnicianData[] {
    const revenueByTechnician: {
      [key: string]: { revenue: number; jobCount: number };
    } = {};

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
        revenueByTechnician[technicianName].revenue += revenueAmount;
        revenueByTechnician[technicianName].jobCount += 1;
      } else {
        revenueByTechnician[technicianName] = {
          revenue: revenueAmount,
          jobCount: 1,
        };
      }
    });

    return Object.keys(revenueByTechnician)
      .map((technicianName) => ({
        name: technicianName,
        value: revenueByTechnician[technicianName].revenue,
        jobCount: revenueByTechnician[technicianName].jobCount,
      }))
      .sort((a, b) => b.value - a.value);
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
  const allTechniciansData = useMemo(
    () => aggregateRevenueByTechnician(filteredOrders),
    [filteredOrders]
  );
  const topFiveData = useMemo(
    () => allTechniciansData.slice(0, 5),
    [allTechniciansData]
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <>
      <div className="revenue-per-tech-chart surface-card py-4 px-5 h-[50vh] flex flex-col">
        <motion.div
          className="flex justify-between mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isAnalytics ? (
            <h1 className="text-sm font-bold flex items-center gap-1">
              <Briefcase
                size={18}
                strokeWidth={1.5}
                color="#f12924"
                className="size-8 p-1.5 bg-brand-soft rounded-lg"
              />
              Productivity Leaderboard
              <TooltipProvider>
                <Hint delayDuration={100}>
                  <TooltipTrigger>
                    <span className="p-0.5 ml-1 size-4 bg-gray-300 rounded-full text-white flex items-center justify-center">
                      i
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs w-[250px]">
                    View the top 5 performing technicians based on revenue
                    generated. This leaderboard shows individual performance
                    rankings. Use the selector to filter the data by All Time,
                    Last Month, Last Quarter, Year to Date, or a Custom Range.
                  </TooltipContent>
                </Hint>
              </TooltipProvider>
            </h1>
          ) : (
            <>
              <h1 className="font-display text-lg font-bold tracking-tight">
                Productivity Leaderboard
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-fit w-fit mt-1.5 justify-self-end z-10 text-left text-xs flex items-center gap-1">
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
                        Show the revenue generated by each technician in the
                        most recent month (
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
                        Display the revenue generated by each technician over
                        the last three months (
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
                        Show the revenue generated by each technician from
                        January 1, {now.getFullYear()}, to the current date.
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
        </motion.div>

        {/* Leaderboard Content */}
        <motion.div
          className="flex-1 flex flex-col"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={`${selectedFilter}-${customDateRange?.from}-${customDateRange?.to}`}
        >
          <AnimatePresence mode="wait">
            {topFiveData.length > 0 ? (
              <motion.div
                key="leaderboard-content"
                className="flex-1 flex flex-col justify-center min-h-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Podium for Top 3 */}
                <div className="flex items-end justify-center gap-4 mb-6 h-32">
                  {/* 2nd Place */}
                  {topFiveData[1] && (
                    <motion.div
                      className="flex flex-col items-center"
                      variants={podiumVariants}
                      custom={1}
                      whileHover="hover"
                    >
                      <motion.div
                        className="bg-gradient-to-t from-gray-200 to-gray-300 rounded-t-lg p-3 min-w-[80px] h-20 flex flex-col items-center justify-end border-2 border-gray-400 cursor-pointer"
                        whileHover={{
                          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                          y: -2,
                        }}
                      >
                        <motion.div
                          initial={{ rotate: 0 }}
                          animate={{ rotate: [0, -10, 10, 0] }}
                          transition={{ delay: 0.5, duration: 0.5 }}
                        >
                          <Medal className="size-6 text-gray-600 mb-1" />
                        </motion.div>
                        <motion.span
                          className="text-xl font-bold text-gray-700"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            delay: 0.55,
                            type: "spring",
                            stiffness: 200,
                          }}
                        >
                          2
                        </motion.span>
                      </motion.div>
                      <motion.div
                        className="text-center mt-2 px-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <div className="text-xs font-medium truncate max-w-[80px]">
                          {topFiveData[1].name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatCurrency(topFiveData[1].value)}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* 1st Place */}
                  {topFiveData[0] && (
                    <motion.div
                      className="flex flex-col items-center"
                      variants={podiumVariants}
                      custom={0}
                      whileHover="hover"
                    >
                      <motion.div
                        className="bg-gradient-to-t from-yellow-300 to-yellow-400 rounded-t-lg p-3 min-w-[80px] h-24 flex flex-col items-center justify-end border-2 border-yellow-500 cursor-pointer"
                        whileHover={{
                          boxShadow: "0 15px 40px rgba(255,193,7,0.3)",
                          y: -3,
                        }}
                      >
                        <motion.div
                          initial={{ rotate: 0, scale: 1 }}
                          animate={{
                            rotate: [0, -15, 15, 0],
                            scale: [1, 1.1, 1],
                          }}
                          transition={{ delay: 0.4, duration: 0.8 }}
                        >
                          <Crown className="size-7 text-yellow-700 mb-1" />
                        </motion.div>
                        <motion.span
                          className="text-2xl font-bold text-yellow-800"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            delay: 0.5,
                            type: "spring",
                            stiffness: 200,
                          }}
                        >
                          1
                        </motion.span>
                      </motion.div>
                      <motion.div
                        className="text-center mt-2 px-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                      >
                        <div className="text-xs font-bold truncate max-w-[80px]">
                          {topFiveData[0].name}
                        </div>
                        <div className="text-xs text-yellow-700 font-semibold">
                          {formatCurrency(topFiveData[0].value)}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* 3rd Place */}
                  {topFiveData[2] && (
                    <motion.div
                      className="flex flex-col items-center"
                      variants={podiumVariants}
                      custom={2}
                      whileHover="hover"
                    >
                      <motion.div
                        className="bg-gradient-to-t from-orange-200 to-orange-300 rounded-t-lg p-3 min-w-[80px] h-16 flex flex-col items-center border-2 border-orange-400 cursor-pointer"
                        whileHover={{
                          boxShadow: "0 8px 25px rgba(255,165,0,0.2)",
                          y: -2,
                        }}
                      >
                        <motion.div
                          initial={{ rotate: 0 }}
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                        >
                          <Award className="size-5 text-orange-600" />
                        </motion.div>
                        <motion.span
                          className="text-lg font-bold text-orange-700"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            delay: 0.65,
                            type: "spring",
                            stiffness: 200,
                          }}
                        >
                          3
                        </motion.span>
                      </motion.div>
                      <motion.div
                        className="text-center mt-2 px-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        <div className="text-xs font-medium truncate max-w-[80px]">
                          {topFiveData[2].name}
                        </div>
                        <div className="text-xs text-orange-600">
                          {formatCurrency(topFiveData[2].value)}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </div>

                {/* Remaining Rankings (ranks 4-5) */}
                {topFiveData.length > 3 && (
                  <motion.div
                    className="space-y-2 flex-1 min-h-0 overflow-y-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <motion.div
                      className="text-xs text-gray-500 text-center mb-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      Other Top Performers
                    </motion.div>
                    {topFiveData.slice(3).map((technician, index) => (
                      <motion.div
                        key={index + 4}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border cursor-pointer"
                        variants={rankingItemVariants}
                        custom={index}
                        whileHover="hover"
                      >
                        <div className="flex items-center gap-2">
                          <motion.div
                            className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"
                            whileHover={{
                              backgroundColor: "rgb(147, 197, 253)",
                              scale: 1.1,
                            }}
                          >
                            <span className="text-sm font-bold text-blue-700">
                              {index + 4}
                            </span>
                          </motion.div>
                          <div>
                            <div className="text-sm font-medium">
                              {technician.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {technician.jobCount} job
                              {technician.jobCount !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                        <motion.div
                          className="text-sm font-semibold"
                          whileHover={{ scale: 1.05 }}
                        >
                          {formatCurrency(technician.value)}
                        </motion.div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                className="flex-1 flex items-center justify-center text-muted-foreground"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center">
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  >
                    <Trophy className="size-12 mx-auto mb-2 opacity-50" />
                  </motion.div>
                  <p>No technician data available</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* View More Button */}
          {allTechniciansData.length > 5 && (
            <motion.div
              className="mt-4 pt-3 border-t"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  onClick={() => setAllTechniciansOpen(true)}
                  className="w-full gap-2"
                >
                  <Eye className="size-4" />
                  View More ({allTechniciansData.length - 5} more)
                </Button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* All Technicians Dialog */}
      <AllTechniciansDialog
        data={allTechniciansData}
        open={allTechniciansOpen}
        onOpenChange={setAllTechniciansOpen}
      />
    </>
  );
}
