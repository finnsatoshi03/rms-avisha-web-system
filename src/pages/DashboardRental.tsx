import { useQuery } from "@tanstack/react-query";
import HeaderText from "../components/ui/headerText";
import { useUser } from "../components/auth/useUser";
import { getRentalsFiltered } from "../services/apiRentals";
import { getRentalAssets } from "../services/apiRentalAssets";
import { RentalAsset, RentalData, RentalStatus } from "../lib/types";
import { RentalStatusBadge } from "../components/rental/rental-status-badge";
import Loader from "../components/ui/loader";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MonitorSmartphone,
  TrendingUp,
} from "lucide-react";
import CountUp from "react-countup";

export default function DashboardRental() {
  const { isManager, branchId: currentBranchId } = useUser();
  const getBranchId = () => (isManager ? currentBranchId ?? null : null);

  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ["rentals", "dashboard", "active", getBranchId()],
    queryFn: () =>
      getRentalsFiltered({
        limit: 100,
        branchId: getBranchId(),
        statusFilters: ["Created", "Released", "Ongoing"],
      }),
  });

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ["rentals", "dashboard", "overdue", getBranchId()],
    queryFn: () =>
      getRentalsFiltered({
        limit: 100,
        branchId: getBranchId(),
        showOverdueOnly: true,
      }),
  });

  const { data: completedData } = useQuery({
    queryKey: ["rentals", "dashboard", "completed", getBranchId()],
    queryFn: () =>
      getRentalsFiltered({
        limit: 5,
        branchId: getBranchId(),
        statusFilters: ["Completed"],
      }),
  });

  const { data: assets } = useQuery({
    queryKey: ["rental_assets", getBranchId()],
    queryFn: () => getRentalAssets({ branchId: getBranchId() }),
  });

  const isLoading = activeLoading || overdueLoading;

  const activeRentals = (activeData?.data || []) as RentalData[];
  const overdueRentals = (overdueData?.data || []) as RentalData[];
  const completedRentals = (completedData?.data || []) as RentalData[];
  const activeCount = activeData?.meta?.totalCount || 0;
  const overdueCount = overdueData?.meta?.totalCount || 0;

  const availableAssets = (assets || []).filter(
    (a: RentalAsset) => a.status === "available" && !a.deleted
  );
  const totalAssets = (assets || []).filter((a: RentalAsset) => !a.deleted);

  const activeRevenue = activeRentals.reduce(
    (sum, r) => sum + Number(r.grand_total),
    0
  );

  if (isLoading)
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="h-full">
      <HeaderText>Rental Dashboard</HeaderText>

      {/* Metric Cards — matches OverviewCard styling */}
      <div className="grid lg:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-4 mt-4">
        <div className="border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-shadow duration-200 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xs font-semibold text-gray-700 tracking-tight">
              Active Rentals
            </h1>
            <Clock size={16} strokeWidth={1.5} className="text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            <CountUp start={0} end={activeCount} duration={1.2} />
          </div>
        </div>

        <div
          className={`border rounded-xl hover:shadow-sm transition-shadow duration-200 p-6 flex flex-col gap-4 ${
            overdueCount > 0
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-xs font-semibold text-gray-700 tracking-tight">
              Overdue
            </h1>
            <AlertTriangle
              size={16}
              strokeWidth={1.5}
              className={
                overdueCount > 0 ? "text-red-500" : "text-gray-400"
              }
            />
          </div>
          <div
            className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}
          >
            <CountUp start={0} end={overdueCount} duration={1.2} />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-shadow duration-200 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xs font-semibold text-gray-700 tracking-tight">
              Available Printers
            </h1>
            <MonitorSmartphone
              size={16}
              strokeWidth={1.5}
              className="text-gray-400"
            />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            <CountUp start={0} end={availableAssets.length} duration={1.2} />
            <span className="text-sm font-normal text-gray-500 ml-1">
              / {totalAssets.length}
            </span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-shadow duration-200 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xs font-semibold text-gray-700 tracking-tight">
              Active Revenue
            </h1>
            <TrendingUp
              size={16}
              strokeWidth={1.5}
              className="text-gray-400"
            />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            <CountUp
              start={0}
              end={activeRevenue}
              duration={1.2}
              separator=","
              decimals={2}
              decimal="."
              prefix="₱"
            />
          </div>
        </div>
      </div>

      {/* Lists Section */}
      <div className="grid lg:grid-cols-2 grid-cols-1 gap-4 mt-4">
        {/* Overdue Rentals */}
        <div className="border border-slate-200 rounded-xl bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              Overdue Rentals
            </h2>
          </div>
          {overdueRentals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No overdue rentals
            </p>
          ) : (
            <div className="space-y-3">
              {overdueRentals.slice(0, 5).map((rental) => (
                <div
                  key={rental.id}
                  className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-700">
                      {rental.rental_no}
                    </p>
                    <p className="text-xs text-gray-400">
                      {rental.clients?.name} —{" "}
                      {rental.rental_assets?.unit_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <RentalStatusBadge status={rental.status as RentalStatus} />
                    <p className="text-xs text-red-500 mt-1">
                      Due:{" "}
                      {rental.due_date
                        ? new Date(rental.due_date).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Completed */}
        <div className="border border-slate-200 rounded-xl bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              Recently Completed
            </h2>
          </div>
          {completedRentals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No completed rentals yet
            </p>
          ) : (
            <div className="space-y-3">
              {completedRentals.map((rental) => (
                <div
                  key={rental.id}
                  className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-700">
                      {rental.rental_no}
                    </p>
                    <p className="text-xs text-gray-400">
                      {rental.clients?.name} —{" "}
                      {rental.rental_assets?.unit_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      ₱{Number(rental.grand_total).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
