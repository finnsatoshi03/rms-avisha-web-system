import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowDownUp, Info, Loader2, PackageX, Search, X } from "lucide-react";

import HeaderText from "../components/ui/headerText";
import PageSkeleton from "../components/ui/page-skeleton";
import ErrorBoundary from "../components/error-boundery";
import { Input } from "../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { ConfirmDialog } from "../components/table/alert-dialog";
import { useUser } from "../components/auth/useUser";
import SkuRestockForm from "../components/inventory/sku-restock-form";
import {
  getLowStock,
  getSkuConsumption,
  LowStockRow,
} from "../services/apiInventory";
import {
  CONSUMPTION_WINDOWS,
  DEFAULT_CONSUMPTION_WINDOW_DAYS,
  depletionLabel,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  StockSeverity,
  suggestedStockFor,
} from "../components/inventory/inventory-config";
import { formatNumberWithCommas } from "../lib/helpers";

const DRAG_MIME = "application/x-material-stock-id";

type SortMode = "urgency" | "qty-asc" | "name";

const SORT_LABELS: Record<SortMode, string> = {
  urgency: "Most urgent",
  "qty-asc": "Lowest quantity",
  name: "Name A–Z",
};

const SEVERITY_STYLES: Record<
  StockSeverity,
  { border: string; text: string; dropRing: string }
> = {
  out: {
    border: "border-l-red-500",
    text: "text-red-600",
    dropRing: "bg-red-500/5 border-red-500/40",
  },
  critical: {
    border: "border-l-orange-500",
    text: "text-orange-600",
    dropRing: "bg-orange-500/5 border-orange-500/40",
  },
  low: {
    border: "border-l-amber-400",
    text: "text-amber-600",
    dropRing: "bg-amber-400/5 border-amber-400/40",
  },
  ok: {
    border: "border-l-transparent",
    text: "text-muted-foreground",
    dropRing: "bg-brand-soft/60 border-brand-deep/40",
  },
};

function peso(value: number | null): string {
  if (value == null) return "—";
  return `₱${formatNumberWithCommas(value)}`;
}

function sortRows(rows: LowStockRow[], mode: SortMode): LowStockRow[] {
  const copy = [...rows];
  if (mode === "name") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === "qty-asc")
    return copy.sort((a, b) => a.stocks - b.stocks || a.name.localeCompare(b.name));
  // "urgency" — the service already returned the rows in urgency order, and
  // Array.prototype.sort is stable, so filtering alone preserves it.
  return copy;
}

export default function InventoryStock() {
  const { isManager, branchId } = useUser();

  const [windowDays, setWindowDays] = useState<number>(
    DEFAULT_CONSUMPTION_WINDOW_DAYS
  );
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [sortByColumn, setSortByColumn] = useState<
    Partial<Record<StockSeverity, SortMode>>
  >({});
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverLane, setDragOverLane] = useState<StockSeverity | null>(null);
  const [openSkuId, setOpenSkuId] = useState<number | null>(null);
  // Set only when the sheet was opened by dropping a card into a lane, so the
  // restock form can pre-fill that lane's minimum quantity.
  const [suggestedStock, setSuggestedStock] = useState<number | null>(null);
  // A drop waiting on confirmation. Dragging is easy to do by accident, so a
  // drop never opens anything until the user acknowledges the lane change.
  const [pendingDrop, setPendingDrop] = useState<{
    id: number;
    target: StockSeverity;
  } | null>(null);
  // Native drag suppresses the click in most browsers; this guards the edge
  // cases so a drag never also opens the sheet.
  const draggedRef = useRef(false);

  // Managers are pinned server-side to their own branch, matching the Job Orders
  // page. Admins and devs get every branch and narrow down in-page.
  const scopedBranchId = isManager ? branchId ?? null : null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["low_stock", scopedBranchId, windowDays],
    queryFn: () => getLowStock({ branchId: scopedBranchId, windowDays }),
    staleTime: 60 * 1000,
  });

  const rows = useMemo(() => data ?? [], [data]);

  // Branch options come from whatever actually holds stock, so a branch with no
  // inventory never shows up as a dead filter option.
  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const key = r.branch_id == null ? "none" : String(r.branch_id);
      if (!map.has(key))
        map.set(
          key,
          r.location ??
            (r.branch_id == null ? "Unassigned" : `Branch ${r.branch_id}`)
        );
    });
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [rows]);

  const lanes = useMemo(() => {
    const term = search.trim().toLowerCase();
    const visible = rows.filter((r) => {
      if (branchFilter !== "all") {
        const key = r.branch_id == null ? "none" : String(r.branch_id);
        if (key !== branchFilter) return false;
      }
      if (term) {
        const hay = `${r.name} ${r.sku ?? ""} ${r.category ?? ""} ${
          r.brand ?? ""
        }`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    return SEVERITY_ORDER.map((severity) => {
      const mode = sortByColumn[severity] ?? "urgency";
      const items = sortRows(
        visible.filter((r) => r.severity === severity),
        mode
      );
      return {
        severity,
        mode,
        items,
        // Total units sitting in this lane — the reorder-cost signal.
        units: items.reduce((sum, r) => sum + r.stocks, 0),
      };
    });
  }, [rows, branchFilter, search, sortByColumn]);

  const totals = useMemo(() => {
    const bySeverity: Record<StockSeverity, number> = {
      out: 0,
      critical: 0,
      low: 0,
      ok: 0,
    };
    rows.forEach((r) => (bySeverity[r.severity] += 1));
    return bySeverity;
  }, [rows]);

  const openRow = useMemo(
    () => rows.find((r) => r.id === openSkuId) ?? null,
    [rows, openSkuId]
  );

  const openCard = (id: number) => {
    if (draggedRef.current) return;
    setSuggestedStock(null);
    setOpenSkuId(id);
  };

  const handleDrop = (target: StockSeverity, id: number) => {
    setDragOverLane(null);
    const row = rows.find((r) => r.id === id);
    // Dropping a card back into its own lane changes nothing — ignore it
    // silently rather than asking the user to confirm a no-op.
    if (!row || row.severity === target) return;
    setPendingDrop({ id, target });
  };

  // Severity is derived from quantity, so a drop has nothing to write on its
  // own. Confirming hands off to the restock form pre-filled with the target
  // lane's minimum, where the user sets the real count and saves.
  const pendingRow = useMemo(
    () => (pendingDrop ? rows.find((r) => r.id === pendingDrop.id) ?? null : null),
    [pendingDrop, rows]
  );

  const confirmDrop = () => {
    if (!pendingDrop) return;
    setSuggestedStock(suggestedStockFor(pendingDrop.target));
    setOpenSkuId(pendingDrop.id);
    setPendingDrop(null);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <TooltipProvider>
      <div className="h-full min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-4 flex-wrap shrink-0">
          <div>
            <HeaderText>Low Stock</HeaderText>
            <p className="text-sm text-muted-foreground mt-1">
              Active SKUs by how close they are to depletion.
            </p>
          </div>
          <div className="flex gap-1 rounded-full bg-muted p-0.5 shrink-0">
            {CONSUMPTION_WINDOWS.map((days) => (
              <button
                key={days}
                onClick={() => setWindowDays(days)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  days === windowDays
                    ? "bg-card text-brand-deep shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 mb-4 shrink-0">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {rows.length}
            </span>{" "}
            active SKUs
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-red-600 tabular-nums">
              {totals.out}
            </span>{" "}
            out of stock
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-amber-600 tabular-nums">
              {totals.critical + totals.low}
            </span>{" "}
            low
          </span>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / SKU / brand"
              className="h-8 w-56 pl-7 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {branchOptions.length > 1 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="all">All branches</option>
              {branchOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <ErrorBoundary>
          {isError ? (
            <p className="text-sm text-red-600 py-6">
              Low stock board could not be loaded.
            </p>
          ) : (
            <div className="flex-1 min-h-0 min-w-0 overflow-x-auto pb-3">
              <div className="flex gap-3 h-full">
                {lanes.map((lane) => {
                  const style = SEVERITY_STYLES[lane.severity];
                  const isOver = dragOverLane === lane.severity;
                  return (
                    <div
                      key={lane.severity}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverLane !== lane.severity)
                          setDragOverLane(lane.severity);
                      }}
                      onDragLeave={(e) => {
                        // Ignore leave events bubbling up from children.
                        if (!e.currentTarget.contains(e.relatedTarget as Node))
                          setDragOverLane((s) =>
                            s === lane.severity ? null : s
                          );
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = Number(e.dataTransfer.getData(DRAG_MIME));
                        if (id) handleDrop(lane.severity, id);
                      }}
                      className={`shrink-0 w-64 h-full flex flex-col rounded-lg border transition-colors ${
                        isOver ? style.dropRing : "bg-muted border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 px-2 py-2 border-b border-border bg-black/[0.03] dark:bg-white/[0.03] rounded-t-lg">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-xs font-semibold truncate ${style.text}`}
                          >
                            {SEVERITY_LABELS[lane.severity]}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {lane.items.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {lane.units}u
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                title={`Sort: ${SORT_LABELS[lane.mode]}`}
                                className="flex items-center justify-center rounded border border-border bg-card p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              >
                                <ArrowDownUp size={13} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(Object.keys(SORT_LABELS) as SortMode[]).map(
                                (mode) => (
                                  <DropdownMenuItem
                                    key={mode}
                                    onClick={() =>
                                      setSortByColumn((prev) => ({
                                        ...prev,
                                        [lane.severity]: mode,
                                      }))
                                    }
                                    className={
                                      lane.mode === mode
                                        ? "font-semibold text-brand-deep"
                                        : ""
                                    }
                                  >
                                    {SORT_LABELS[mode]}
                                  </DropdownMenuItem>
                                )
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-1.5">
                        {lane.items.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/60 px-1 py-1">
                            {isOver ? "Drop to restock" : "None"}
                          </p>
                        ) : (
                          lane.items.map((row) => (
                            <StockCard
                              key={row.id}
                              row={row}
                              dragging={draggingId === row.id}
                              onOpen={() => openCard(row.id)}
                              onDragStart={() => {
                                draggedRef.current = true;
                                setDraggingId(row.id);
                              }}
                              onDragEnd={() => {
                                setDraggingId(null);
                                setDragOverLane(null);
                                // Reset after the click event would have fired.
                                setTimeout(
                                  () => (draggedRef.current = false),
                                  0
                                );
                              }}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ErrorBoundary>

        <p className="flex items-start gap-1.5 mt-2 text-[11px] text-muted-foreground shrink-0">
          <Info size={12} className="mt-0.5 shrink-0" />
          Lanes are derived from on-hand quantity and consumption over the last{" "}
          {windowDays} days. Click a card to restock it, or drag it to a lane and
          confirm to open it pre-filled with that lane's minimum. Job orders rarely record
          material lines, so most SKUs show “no recent usage” — that means no
          depletion estimate is possible, not that the SKU is healthy.
        </p>

        <ConfirmDialog
          isOpen={pendingDrop != null}
          onClose={() => setPendingDrop(null)}
          onConfirm={confirmDrop}
          message={
            pendingRow && pendingDrop
              ? `Move “${pendingRow.name}” to ${SEVERITY_LABELS[
                  pendingDrop.target
                ]}? That means setting its on-hand count from ${
                  pendingRow.stocks
                } to ${suggestedStockFor(
                  pendingDrop.target
                )}. Nothing is saved yet — you'll confirm the real count next.`
              : ""
          }
        />

        <Sheet
          open={openSkuId != null}
          onOpenChange={(open) => {
            if (!open) {
              setOpenSkuId(null);
              setSuggestedStock(null);
            }
          }}
        >
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-bold pr-6">
                {openRow?.name ?? "SKU"}
              </SheetTitle>
            </SheetHeader>
            {openRow && (
              <SkuDetail
                row={openRow}
                suggestedStock={suggestedStock}
                onSaved={() => setSuggestedStock(null)}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

function StockCard({
  row,
  onOpen,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  row: LowStockRow;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const style = SEVERITY_STYLES[row.severity];
  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          draggable
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen();
            }
          }}
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_MIME, String(row.id));
            e.dataTransfer.effectAllowed = "move";
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className={`w-full text-left rounded-md border border-l-[3px] ${
            style.border
          } bg-card px-2 py-1.5 cursor-grab active:cursor-grabbing hover:border-muted-foreground/30 transition-colors ${
            dragging ? "opacity-40" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground truncate">
              {row.name}
            </span>
            <span
              className={`text-xs font-bold shrink-0 tabular-nums ${
                row.stocks <= 0 ? "text-red-600" : "text-foreground"
              }`}
            >
              {row.stocks}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground truncate">
              {row.sku ?? "no SKU"}
              {row.location ? ` · ${row.location}` : ""}
            </span>
            <span className={`text-[10px] shrink-0 ${style.text}`}>
              {depletionLabel(row.stocks, row.daysToDepletion)}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[260px]">
        <p className="font-semibold">{row.name}</p>
        <p className="text-xs opacity-80">
          {row.sku ?? "no SKU"}
          {row.brand ? ` · ${row.brand}` : ""}
        </p>
        {row.category && (
          <p className="text-xs mt-1 line-clamp-2">{row.category}</p>
        )}
        <p className="text-xs mt-1 opacity-80">
          {row.stocks} on hand · {row.consumed} used in {row.windowDays}d
        </p>
        <p className="text-xs opacity-80">
          Cost {peso(row.cost)} · Price {peso(row.price)}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function SkuDetail({
  row,
  suggestedStock,
  onSaved,
}: {
  row: LowStockRow;
  suggestedStock: number | null;
  onSaved: () => void;
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["sku_consumption", row.id],
    queryFn: () => getSkuConsumption(row.id),
    staleTime: 60 * 1000,
  });

  return (
    <div className="mt-4">
      <SkuRestockForm
        row={row}
        suggestedStock={suggestedStock}
        onSaved={onSaved}
      />

      <div className="border-t border-border/60 mt-6 pt-5">
        <SectionLabel>At a glance</SectionLabel>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6 text-sm">
          <Field label="SKU" value={row.sku ?? "—"} />
          <Field label="Branch" value={row.location ?? "Unassigned"} />
          <Field
            label={`Used in ${row.windowDays}d`}
            value={`${row.consumed} across ${row.consumingOrders} order${
              row.consumingOrders === 1 ? "" : "s"
            }`}
          />
          <Field
            label="Projected"
            value={depletionLabel(row.stocks, row.daysToDepletion)}
          />
          <Field
            label="Last restock"
            value={
              row.last_stocks_added
                ? formatDistanceToNow(new Date(row.last_stocks_added), {
                    addSuffix: true,
                  })
                : "—"
            }
          />
          <Field
            label="Reorder value"
            value={row.cost != null ? peso(row.cost) : "—"}
          />
        </dl>

        <SectionLabel>Consumption history</SectionLabel>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history…
          </div>
        ) : !history || history.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <PackageX size={14} />
            This SKU has never been recorded on a job order.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {history.map((event) => (
                <li key={event.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground truncate">
                      {event.order_no ? `#${event.order_no}` : "—"}
                      {event.client_name ? (
                        <span className="text-muted-foreground">
                          {" · "}
                          {event.client_name}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                      ×{event.quantity}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {event.consumed_at ? (
                      <span title={format(new Date(event.consumed_at), "PPpp")}>
                        {formatDistanceToNow(new Date(event.consumed_at), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      "unknown date"
                    )}
                    {event.status ? ` · ${event.status}` : ""}
                    {event.total_amount != null
                      ? ` · ${peso(event.total_amount)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground mt-3">
              All recorded usage, not just the last {row.windowDays} days.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground truncate" title={value}>
        {value}
      </dd>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
      {children}
    </h3>
  );
}
