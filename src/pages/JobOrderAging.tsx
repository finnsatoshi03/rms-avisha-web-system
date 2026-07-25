import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowDownUp, Info, Loader2, Search, X } from "lucide-react";

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
import JobOrderForm from "../components/job-order/job-order-form";
import { useUser } from "../components/auth/useUser";
import { getJobOrderAging } from "../services/apiJobOrderEvents";
import { getJobOrderById, updateJobOrderStatus } from "../services/apiJobOrders";
import { getTechnicians } from "../services/apiTechnicians";
import {
  ACTIVE_AGING_STATUSES,
  thresholdForStatus,
} from "../components/job-order/aging-config";
import { formatMachineType } from "../lib/helpers";
import {
  getServerNow,
  getServerNowEpochMs,
  getServerNowISO,
} from "../lib/server-time";
import { JobOrderAgingRow, JobOrderData, User } from "../lib/types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DRAG_MIME = "application/x-joborder-id";

type Severity = "overdue" | "due-soon" | "ok";

type DerivedRow = JobOrderAgingRow & {
  days: number;
  threshold: number;
  severity: Severity;
};

type SortMode = "age-desc" | "age-asc" | "client";

const SORT_LABELS: Record<SortMode, string> = {
  "age-desc": "Longest waiting",
  "age-asc": "Shortest waiting",
  client: "Client A–Z",
};

function severityFor(days: number, threshold: number): Severity {
  if (days >= threshold) return "overdue";
  if (days >= threshold - 1) return "due-soon";
  return "ok";
}

function ageLabel(days: number, isEstimate: boolean): string {
  const rounded = days < 1 ? "<1" : String(Math.floor(days));
  return `${isEstimate ? "~" : ""}${rounded}d`;
}

function sortRows(rows: DerivedRow[], mode: SortMode): DerivedRow[] {
  const copy = [...rows];
  if (mode === "client") {
    return copy.sort((a, b) =>
      (a.client_name ?? "").localeCompare(b.client_name ?? "")
    );
  }
  return copy.sort((a, b) =>
    mode === "age-asc" ? a.days - b.days : b.days - a.days
  );
}

const SEVERITY = {
  overdue: { border: "border-l-red-500", text: "text-red-600" },
  "due-soon": { border: "border-l-amber-400", text: "text-amber-600" },
  ok: { border: "border-l-transparent", text: "text-gray-500" },
} as const;

function AgingCard({
  row,
  onOpen,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  row: DerivedRow;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const sev = SEVERITY[row.severity];
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
            sev.border
          } bg-card px-2 py-1.5 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors ${
            dragging ? "opacity-40" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-800 truncate">
              {row.client_name ?? "—"}
            </span>
            <span className={`text-xs font-bold shrink-0 ${sev.text}`}>
              {ageLabel(row.days, row.isEstimate)}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 truncate">
            {row.order_no ?? "—"}
            {row.machine_type ? ` · ${formatMachineType(row.machine_type)}` : ""}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[240px]">
        <p className="font-semibold">{row.client_name ?? "—"}</p>
        <p className="text-xs opacity-80">
          {row.order_no ?? "—"}
          {row.machine_type ? ` · ${formatMachineType(row.machine_type)}` : ""}
        </p>
        {row.problem_statement && (
          <p className="text-xs mt-1 line-clamp-3">{row.problem_statement}</p>
        )}
        <p className="text-xs mt-1 opacity-80">
          Tech: {row.technician_name ?? "Unassigned"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function JobOrderAging() {
  const queryClient = useQueryClient();
  const { isManager, branchId, isUser, user } = useUser();

  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortByColumn, setSortByColumn] = useState<Record<string, SortMode>>(
    {}
  );
  const [search, setSearch] = useState("");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  // Native drag suppresses the click in most browsers, but this guards the edge
  // cases so a drag never accidentally opens the sheet.
  const draggedRef = useRef(false);

  const scope = {
    branchId: isManager ? branchId ?? null : null,
    technicianId: isUser ? user?.id : undefined,
  };
  const agingKey = ["job_order_aging", isManager, branchId, isUser, user?.id];

  const { data, isLoading, isError } = useQuery({
    queryKey: agingKey,
    queryFn: () => getJobOrderAging(scope),
    staleTime: 60 * 1000,
  });

  // Technicians power both the filter and the edit form inside the sheet.
  const { data: technicians } = useQuery<User[]>({
    queryKey: ["technicians", "aging"],
    queryFn: () => getTechnicians({ fetchAll: true }) as Promise<User[]>,
    staleTime: 5 * 60 * 1000,
  });

  const { data: openOrder, isLoading: openOrderLoading } = useQuery({
    queryKey: ["job_order_by_id", openOrderId],
    queryFn: () => getJobOrderById(openOrderId as number),
    enabled: openOrderId != null,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateJobOrderStatus([id], status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: agingKey });
      const previous = queryClient.getQueryData<JobOrderAgingRow[]>(agingKey);
      queryClient.setQueryData<JobOrderAgingRow[]>(agingKey, (old) =>
        (old ?? []).map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                enteredStatusAt: getServerNowISO(),
                isEstimate: false,
              }
            : r
        )
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(agingKey, ctx.previous);
      toast.error("Could not update status");
    },
    onSuccess: () => toast.success("Status updated"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["job_order_aging"] });
      queryClient.invalidateQueries({ queryKey: ["job_order"] });
      queryClient.invalidateQueries({ queryKey: ["joborder-events"] });
    },
  });

  const rows = useMemo<DerivedRow[]>(() => {
    const now = getServerNowEpochMs();
    return (data ?? []).map((row) => {
      const days =
        (now - new Date(row.enteredStatusAt).getTime()) / MS_PER_DAY;
      const threshold = thresholdForStatus(row.status);
      return { ...row, days, threshold, severity: severityFor(days, threshold) };
    });
  }, [data]);

  const overdueCount = useMemo(
    () => rows.filter((r) => r.severity === "overdue").length,
    [rows]
  );

  // Technician options come from whoever actually has active orders.
  const techOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.technician_id)
        map.set(r.technician_id, r.technician_name ?? "Unnamed");
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [rows]);

  const columns = useMemo(() => {
    const term = search.trim().toLowerCase();
    const visible = rows.filter((r) => {
      if (overdueOnly && r.severity !== "overdue") return false;
      if (techFilter !== "all" && r.technician_id !== techFilter) return false;
      if (term) {
        const hay = `${r.client_name ?? ""} ${r.order_no ?? ""} ${
          r.machine_type ?? ""
        }`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    return ACTIVE_AGING_STATUSES.map((status) => {
      const mode = sortByColumn[status] ?? "age-desc";
      const items = sortRows(
        visible.filter((r) => r.status === status),
        mode
      );
      return {
        status,
        mode,
        items,
        overdue: items.filter((r) => r.severity === "overdue").length,
      };
    });
  }, [rows, overdueOnly, techFilter, search, sortByColumn]);

  const handleDrop = (targetStatus: string, id: number) => {
    const row = rows.find((r) => r.id === id);
    setDragOverStatus(null);
    if (!row || row.status === targetStatus) return;

    // Same guard the Job Orders table enforces: a job order pending more than
    // two days with no technical report cannot leave Pending.
    if (row.status === "Pending" && !row.hasReport) {
      const twoDaysAgo = getServerNow();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      if (new Date(row.created_at) < twoDaysAgo) {
        toast.error(
          "Can't move this: it has been Pending over two days with no technical report."
        );
        return;
      }
    }
    statusMutation.mutate({ id, status: targetStatus });
  };

  const openCard = (id: number) => {
    if (draggedRef.current) return;
    setOpenOrderId(id);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <TooltipProvider>
      <div className="h-full min-w-0 flex flex-col">
        <HeaderText>Job Order Aging</HeaderText>

        <div className="flex flex-wrap items-center gap-3 mt-2 mb-4 shrink-0">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{rows.length}</span>{" "}
            active
          </span>
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-red-600">{overdueCount}</span>{" "}
            overdue
          </span>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client / order #"
              className="h-8 w-52 pl-7 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-gray-700"
          >
            <option value="all">All technicians</option>
            {techOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setOverdueOnly((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
              overdueOnly
                ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <AlertTriangle size={13} />
            Overdue only
          </button>
        </div>

        <ErrorBoundary>
          {isError ? (
            <p className="text-sm text-red-600 py-6">
              Aging board could not be loaded.
            </p>
          ) : (
            <div className="flex-1 min-h-0 min-w-0 overflow-x-auto pb-3">
              <div className="flex gap-3 h-full">
                {columns.map((col) => {
                  const isOver = dragOverStatus === col.status;
                  return (
                    <div
                      key={col.status}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverStatus !== col.status)
                          setDragOverStatus(col.status);
                      }}
                      onDragLeave={(e) => {
                        // Ignore leave events bubbling from children.
                        if (
                          !e.currentTarget.contains(e.relatedTarget as Node)
                        )
                          setDragOverStatus((s) =>
                            s === col.status ? null : s
                          );
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = Number(e.dataTransfer.getData(DRAG_MIME));
                        if (id) handleDrop(col.status, id);
                      }}
                      className={`shrink-0 w-56 h-full flex flex-col rounded-lg border transition-colors ${
                        isOver
                          ? "bg-brand-soft/60 border-brand-deep/40"
                          : "bg-muted border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 px-2 py-2 border-b border-border bg-black/[0.03] dark:bg-white/[0.03] rounded-t-lg">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-gray-600 truncate">
                            {col.status}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {col.items.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {col.overdue > 0 && (
                            <span className="text-[10px] font-medium text-red-500">
                              {col.overdue}
                            </span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                title={`Sort: ${SORT_LABELS[col.mode]}`}
                                className="flex items-center justify-center rounded border border-border bg-card p-1 text-gray-500 hover:text-gray-800 hover:bg-accent transition-colors"
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
                                        [col.status]: mode,
                                      }))
                                    }
                                    className={
                                      col.mode === mode
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
                        {col.items.length === 0 ? (
                          <p className="text-[10px] text-gray-300 px-1 py-1">
                            {isOver ? "Drop here" : "None"}
                          </p>
                        ) : (
                          col.items.map((row) => (
                            <AgingCard
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
                                setDragOverStatus(null);
                                // Reset after the click event would have fired.
                                setTimeout(() => (draggedRef.current = false), 0);
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

        {rows.some((r) => r.isEstimate) && (
          <p className="flex items-start gap-1.5 mt-2 text-[11px] text-gray-400 shrink-0">
            <Info size={12} className="mt-0.5 shrink-0" />“~” = estimated age;
            order hasn't changed status since tracking began. Drag a card to a
            new lane to change its status — that logs a real transition and
            sharpens the age.
          </p>
        )}

        <Sheet
          open={openOrderId != null}
          onOpenChange={(o) => !o && setOpenOrderId(null)}
        >
          <SheetContent className="min-w-[50vw] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-bold">Job Order</SheetTitle>
              {openOrderLoading || !openOrder ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading job order…
                </div>
              ) : (
                <JobOrderForm
                  jobOrderToEdit={openOrder as JobOrderData}
                  readonly
                  technicians={technicians ?? []}
                  onClose={() => setOpenOrderId(null)}
                />
              )}
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
