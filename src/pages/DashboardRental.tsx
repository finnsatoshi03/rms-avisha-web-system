import { useQuery } from "@tanstack/react-query";
import HeaderText from "../components/ui/headerText";
import { useUser } from "../components/auth/useUser";
import { getRentalsFiltered } from "../services/apiRentals";
import { getRentalAssets } from "../services/apiRentalAssets";
import { useBillingDashboardSummary } from "../components/billing/useBilling";
import { RentalAsset, RentalData } from "../lib/types";
import { StatusBadge, rentalStatuses } from "../components/table/status-popover";
import { DashboardSkeleton } from "../components/ui/page-skeleton";
import OverviewCard from "../components/dashboard/overview-card";
import HeroMetricCard from "../components/dashboard/hero-metric-card";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  LucideIcon,
  MonitorSmartphone,
  TrendingUp,
} from "lucide-react";

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

  const { data: completedData, isLoading: completedLoading } = useQuery({
    queryKey: ["rentals", "dashboard", "completed", getBranchId()],
    queryFn: () =>
      getRentalsFiltered({
        limit: 1000,
        branchId: getBranchId(),
        statusFilters: ["Completed"],
      }),
  });

  const { data: billingSummary, isLoading: billingLoading } =
    useBillingDashboardSummary(getBranchId() ?? undefined);

  const { data: assets } = useQuery({
    queryKey: ["rental_assets", getBranchId()],
    queryFn: () => getRentalAssets({ branchId: getBranchId() }),
  });

  const isLoading =
    activeLoading || overdueLoading || completedLoading || billingLoading;

  const overdueRentals = (overdueData?.data || []) as RentalData[];
  const completedRentals = (completedData?.data || []) as RentalData[];
  const activeCount = activeData?.meta?.totalCount || 0;
  const overdueCount = overdueData?.meta?.totalCount || 0;

  const availableAssets = (assets || []).filter(
    (a: RentalAsset) => a.status === "available" && !a.deleted
  );
  const totalAssets = (assets || []).filter((a: RentalAsset) => !a.deleted);

  const directCompletedRevenue = completedRentals.reduce((sum, rental) => {
    if (rental.transferred_to_billing) return sum;
    return sum + Number(rental.grand_total || 0);
  }, 0);
  const billingCollectedRevenue = Number(billingSummary?.total_collected || 0);
  const activeRevenue = directCompletedRevenue + billingCollectedRevenue;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="h-full">
      <HeaderText>Rental Dashboard</HeaderText>

      <div className="mt-4 flex flex-col gap-4">
        {/* Row 1: hero revenue + compact stat tiles — the same bento band the
            job orders dashboard opens with. No pcp is passed: rentals have no
            month-over-month figure, so the trend pill is omitted rather than
            shown as a fabricated 0%. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 animate-fade-up">
          <HeroMetricCard
            className="sm:col-span-2 xl:col-span-1"
            data={{
              header: "Active Revenue",
              value: activeRevenue,
              prefix: "₱",
              icon: TrendingUp,
              caption: "Completed rentals + billing payments",
            }}
          />

          <OverviewCard
            decimals={0}
            data={{
              header: "Active Rentals",
              value: activeCount,
              icon: Clock,
            }}
          />

          <OverviewCard
            decimals={0}
            className={
              overdueCount > 0 ? "border-destructive/40 bg-destructive/5" : ""
            }
            valueClassName={overdueCount > 0 ? "text-destructive" : ""}
            data={{
              header: "Overdue",
              value: overdueCount,
              icon: AlertTriangle,
            }}
          />

          <OverviewCard
            decimals={0}
            data={{
              header: "Available Printers",
              value: availableAssets.length,
              suffix: ` / ${totalAssets.length}`,
              icon: MonitorSmartphone,
            }}
          />
        </div>

        {/* Row 2: the two rental lists, on the same surface-card shell as
            every other dashboard panel. */}
        <div
          className="grid lg:grid-cols-2 grid-cols-1 gap-4 animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <RentalListPanel
            title="Overdue Rentals"
            icon={AlertTriangle}
            emptyLabel="No overdue rentals"
            rentals={overdueRentals}
            renderTrailing={(rental) => (
              <>
                <StatusBadge
                  status={rental.status}
                  statusList={rentalStatuses}
                />
                <p className="text-xs text-destructive mt-1">
                  Due:{" "}
                  {rental.due_date
                    ? new Date(rental.due_date).toLocaleDateString()
                    : "—"}
                </p>
              </>
            )}
          />

          <RentalListPanel
            title="Recently Completed"
            icon={CheckCircle}
            emptyLabel="No completed rentals yet"
            rentals={completedRentals}
            renderTrailing={(rental) => (
              <p className="text-sm font-medium text-foreground">
                ₱{Number(rental.grand_total).toFixed(2)}
              </p>
            )}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard list panel. Mirrors StatusOverview's surface-card shell and header
 * treatment so the rental page reads as part of the same system.
 */
function RentalListPanel({
  title,
  icon: Icon,
  emptyLabel,
  rentals,
  renderTrailing,
}: {
  title: string;
  icon: LucideIcon;
  emptyLabel: string;
  rentals: RentalData[];
  renderTrailing: (rental: RentalData) => React.ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold tracking-tight">
          {title}
        </h1>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft">
          <Icon size={15} strokeWidth={1.75} className="text-brand-deep" />
        </span>
      </div>

      {rentals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-3">
          {rentals.slice(0, 5).map((rental) => (
            <div
              key={rental.id}
              className="flex items-center justify-between border-b border-border pb-2 last:border-0"
            >
              <div>
                <p className="font-medium text-sm text-foreground">
                  {rental.rental_no}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rental.clients?.name} — {rental.rental_assets?.unit_name}
                </p>
              </div>
              <div className="text-right">{renderTrailing(rental)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
