/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import debounce from "lodash/debounce";
import toast from "react-hot-toast";
import { Search, Trash2, Undo2, RotateCcw, ShieldAlert } from "lucide-react";

import HeaderText from "../components/ui/headerText";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Separator } from "../components/ui/separator";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { PaginationControls } from "../components/table/pagination-controls";
import { SelectionBar } from "../components/table/selection-bar";
import { useUser } from "../components/auth/useUser";
import { isManagerReauthPasswordValid } from "../components/auth/manager-auth";

import {
  ArchiveDeletedUser,
  ArchiveRecordType,
  getArchiveDeletedUsers,
  getArchivedJobOrdersFiltered,
  getArchivedQuotationsFiltered,
  getArchivedRentalsFiltered,
  permanentlyDeleteArchivedJobOrders,
  permanentlyDeleteArchivedQuotations,
  permanentlyDeleteArchivedRentals,
  restoreArchivedJobOrders,
  restoreArchivedQuotations,
  restoreArchivedRentals,
} from "../services/apiArchive";
import { getServerNowEpochMs } from "../lib/server-time";

const TAB_OPTIONS: { value: ArchiveRecordType; label: string }[] = [
  { value: "joborders", label: "Job Orders" },
  { value: "rentals", label: "Rentals" },
  { value: "quotations", label: "Quotations" },
];

const RECENTLY_DELETED_WINDOW_MS = 1000 * 60 * 60 * 24;

function formatDeletedAt(value: string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
  });
}

function isRecentlyDeleted(value: string | null | undefined) {
  if (!value) return false;
  const parsed = new Date(value).getTime();
  return (
    Number.isFinite(parsed) &&
    getServerNowEpochMs() - parsed <= RECENTLY_DELETED_WINDOW_MS
  );
}

function getReferenceNo(tab: ArchiveRecordType, row: any) {
  if (tab === "joborders") return row.order_no || "-";
  if (tab === "rentals") return row.rental_no || "-";
  return row.quote_no || "-";
}

function getClientName(tab: ArchiveRecordType, row: any) {
  if (tab === "quotations") {
    return row.joborders?.clients?.name || "-";
  }

  return row.clients?.name || "-";
}

function getBranchName(tab: ArchiveRecordType, row: any) {
  const branch = tab === "quotations" ? row.joborders?.branches : row.branches;

  if (!branch) return "-";
  if (branch.prefix) return `${branch.name || "Unknown"} (${branch.prefix})`;
  return branch.name || "Unknown";
}

function getDeletedByLabel(row: any) {
  const deletedByUser = row.deleted_by_user;
  if (!deletedByUser) return "System";

  return (
    deletedByUser.fullname ||
    deletedByUser.email ||
    deletedByUser.migrated_email ||
    "System"
  );
}

export default function Archive() {
  const queryClient = useQueryClient();
  const { isAdmin, isManager, branchId: userBranchId } = useUser();

  const canAccessArchive = isAdmin || isManager;
  const canMutateArchive = isAdmin;

  const [activeTab, setActiveTab] = useState<ArchiveRecordType>("joborders");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [deletedByFilter, setDeletedByFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] =
    useState(false);
  const [pendingActionIds, setPendingActionIds] = useState<number[]>([]);
  const [deleteAuthPassword, setDeleteAuthPassword] = useState("");
  const [deleteAuthError, setDeleteAuthError] = useState<string | null>(null);

  const effectiveBranchFilter = isManager ? userBranchId ?? null : null;

  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        setDebouncedSearchTerm(term);
        setIsSearching(false);
      }, 400),
    []
  );

  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
    }

    debouncedSearch(searchTerm);

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    debouncedSearchTerm,
    deletedByFilter,
    dateFrom,
    dateTo,
    itemsPerPage,
  ]);

  const { data: archiveUsers = [] } = useQuery<ArchiveDeletedUser[]>({
    queryKey: ["archive-users"],
    queryFn: getArchiveDeletedUsers,
    enabled: canAccessArchive,
  });

  const tabCountsQuery = useQuery({
    queryKey: [
      "archive",
      "tab-counts",
      debouncedSearchTerm,
      effectiveBranchFilter,
      deletedByFilter,
      dateFrom,
      dateTo,
    ],
    queryFn: async () => {
      const baseFilters = {
        page: 1,
        limit: 1,
        searchTerm: debouncedSearchTerm,
        branchId: effectiveBranchFilter,
        deletedBy: deletedByFilter,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      };

      const [jobordersResult, rentalsResult, quotationsResult] = await Promise.all([
        getArchivedJobOrdersFiltered(baseFilters),
        getArchivedRentalsFiltered(baseFilters),
        getArchivedQuotationsFiltered(baseFilters),
      ]);

      return {
        joborders: jobordersResult.meta.totalCount ?? 0,
        rentals: rentalsResult.meta.totalCount ?? 0,
        quotations: quotationsResult.meta.totalCount ?? 0,
      };
    },
    enabled: canAccessArchive,
    placeholderData: (previousData) => previousData,
  });

  const archiveQuery = useQuery({
    queryKey: [
      "archive",
      activeTab,
      currentPage,
      itemsPerPage,
      debouncedSearchTerm,
      effectiveBranchFilter,
      deletedByFilter,
      dateFrom,
      dateTo,
    ],
    queryFn: async () => {
      const baseFilters = {
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
        branchId: effectiveBranchFilter,
        deletedBy: deletedByFilter,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      };

      if (activeTab === "joborders") {
        return getArchivedJobOrdersFiltered(baseFilters);
      }

      if (activeTab === "rentals") {
        return getArchivedRentalsFiltered(baseFilters);
      }

      return getArchivedQuotationsFiltered(baseFilters);
    },
    enabled: canAccessArchive,
    placeholderData: (previousData) => previousData,
  });

  const rows = archiveQuery.data?.data ?? [];
  const totalItems = archiveQuery.data?.meta?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((selectedId) => rows.some((row: any) => row.id === selectedId))
    );
  }, [rows]);

  const invalidateAfterMutation = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["archive"] });
    queryClient.invalidateQueries({ queryKey: ["job_order"] });
    queryClient.invalidateQueries({ queryKey: ["quotations"] });
    queryClient.invalidateQueries({ queryKey: ["rentals"] });
    queryClient.invalidateQueries({ queryKey: ["eligible_jos_for_billing"] });
    queryClient.invalidateQueries({ queryKey: ["eligible_rentals_for_billing"] });
    queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
    queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
    queryClient.invalidateQueries({ queryKey: ["rental_assets"] });
  }, [queryClient]);

  const restoreMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      if (activeTab === "joborders") {
        await restoreArchivedJobOrders(ids);
        return;
      }

      if (activeTab === "rentals") {
        await restoreArchivedRentals(ids);
        return;
      }

      await restoreArchivedQuotations(ids);
    },
    onSuccess: () => {
      toast.success("Record(s) restored successfully");
      invalidateAfterMutation();
      setSelectedIds([]);
      setPendingActionIds([]);
      setRestoreDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore record(s)");
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      if (activeTab === "joborders") {
        await permanentlyDeleteArchivedJobOrders(ids);
        return;
      }

      if (activeTab === "rentals") {
        await permanentlyDeleteArchivedRentals(ids);
        return;
      }

      await permanentlyDeleteArchivedQuotations(ids);
    },
    onSuccess: () => {
      toast.success("Record(s) permanently deleted");
      invalidateAfterMutation();
      setSelectedIds([]);
      setPendingActionIds([]);
      setPermanentDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to permanently delete record(s)");
    },
  });

  const openRestoreDialog = (ids: number[]) => {
    if (ids.length === 0) return;
    setPendingActionIds(ids);
    setRestoreDialogOpen(true);
  };

  const openPermanentDeleteDialog = (ids: number[]) => {
    if (ids.length === 0) return;
    setPendingActionIds(ids);
    setDeleteAuthPassword("");
    setDeleteAuthError(null);
    setPermanentDeleteDialogOpen(true);
  };

  const confirmPermanentDelete = () => {
    if (!isManagerReauthPasswordValid(deleteAuthPassword)) {
      setDeleteAuthError("Incorrect manager password.");
      return;
    }

    permanentDeleteMutation.mutate(pendingActionIds);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(rows.map((row: any) => row.id));
  };

  const toggleRowSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setDeletedByFilter(null);
    setDateFrom("");
    setDateTo("");
  };

  if (!canAccessArchive) {
    return (
      <div className="h-full">
        <HeaderText>Archive</HeaderText>
        <div className="mt-8 rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
          You do not have access to this module.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <HeaderText>Archive</HeaderText>

      <div className="my-4 flex flex-col gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as ArchiveRecordType);
            setSelectedIds([]);
          }}
        >
          <TabsList>
            {TAB_OPTIONS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                <span className="inline-flex items-center gap-1.5">
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-medium text-gray-600">
                    ({tabCountsQuery.data?.[tab.value] ?? 0})
                  </span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
              placeholder="Search archived records"
            />
            <div className="absolute left-3 top-2 opacity-60">
              {isSearching || archiveQuery.isFetching ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
              ) : (
                <Search size={14} />
              )}
            </div>
          </div>

          <Select
            value={deletedByFilter ?? "all"}
            onValueChange={(value) => setDeletedByFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[180px] h-fit px-2 py-1 border border-gray-400 rounded-lg text-gray-700 text-sm">
              <SelectValue placeholder="Filter by deleted by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {archiveUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.fullname || user.email || user.migrated_email || user.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            className="w-[170px] h-fit px-2 py-1 border border-gray-400 rounded-lg text-gray-700 text-sm"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <Input
            type="date"
            className="w-[170px] h-fit px-2 py-1 border border-gray-400 rounded-lg text-gray-700 text-sm"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />

          <Button
            variant="ghost"
            className="h-fit w-fit p-0 px-3 py-1.5 gap-1 rounded-lg"
            onClick={resetFilters}
          >
            <RotateCcw size={14} />
            Reset
          </Button>

          {!canMutateArchive ? (
            <Badge variant="outline" className="h-9 px-3">
              Manager View: Read Only
            </Badge>
          ) : null}
        </div>
      </div>

      {canMutateArchive && (
        <SelectionBar count={selectedIds.length} onClear={() => setSelectedIds([])}>
          <Button
            className="rounded-full bg-slate-700 gap-1"
            onClick={() => openRestoreDialog(selectedIds)}
          >
            <Undo2 size={14} />
            <span className="hidden sm:block text-xs">Restore Selected</span>
          </Button>
          <Button
            className="rounded-full bg-red-700 gap-1"
            onClick={() => openPermanentDeleteDialog(selectedIds)}
          >
            <Trash2 size={14} />
            <span className="hidden sm:block text-xs">Delete Permanently</span>
          </Button>
        </SelectionBar>
      )}

      <div className="h-[calc(100%-8.5rem)] flex flex-col justify-between">
        <TableUI>
          <TableHeader>
            <TableRow className="bg-slate-100 border-none">
              {canMutateArchive ? (
                <TableHead className="w-[3%]">
                  <Checkbox
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              ) : null}
              <TableHead className="w-[18%]">Reference No</TableHead>
              <TableHead className="w-[22%]">Client</TableHead>
              <TableHead className="w-[18%]">Branch</TableHead>
              <TableHead className="w-[20%]">Deleted At</TableHead>
              <TableHead className="w-[15%]">Deleted By</TableHead>
              {canMutateArchive ? <TableHead className="w-[14%]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {archiveQuery.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={canMutateArchive ? 7 : 5}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading archived records...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canMutateArchive ? 7 : 5}
                  className="text-center py-10 text-muted-foreground"
                >
                  No archived records found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row: any) => (
                <TableRow key={row.id} className="text-gray-500">
                  {canMutateArchive ? (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onCheckedChange={() => toggleRowSelection(row.id)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium text-foreground">
                    {getReferenceNo(activeTab, row)}
                  </TableCell>
                  <TableCell className="font-bold text-black">
                    {getClientName(activeTab, row)}
                  </TableCell>
                  <TableCell>{getBranchName(activeTab, row)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{formatDeletedAt(row.deleted_at)}</span>
                      {isRecentlyDeleted(row.deleted_at) ? (
                        <span className="inline-flex w-fit rounded-full border border-gray-200 bg-gray-100 px-1.5 py-0 text-[10px] font-medium text-gray-600">
                          Recently Deleted
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{getDeletedByLabel(row)}</TableCell>
                  {canMutateArchive ? (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => openRestoreDialog([row.id])}
                        >
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => openPermanentDeleteDialog([row.id])}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </TableUI>

        <PaginationControls
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          handleItemsPerPageChange={setItemsPerPage}
        />
      </div>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will bring the record back to active operations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreMutation.mutate(pendingActionIds)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={(open) => {
          setPermanentDeleteDialogOpen(open);
          if (!open) {
            setDeleteAuthPassword("");
            setDeleteAuthError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-600" />
              Permanently Delete?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>This action cannot be undone.</p>
                <Separator />
                <p>Record will be removed completely</p>
                <p>Sequence numbers may be reused</p>
                <p>Historical recovery will not be possible</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="archive-delete-auth-password">
              Manager Password
            </Label>
            <Input
              id="archive-delete-auth-password"
              type="password"
              value={deleteAuthPassword}
              onChange={(event) => {
                setDeleteAuthPassword(event.target.value);
                if (deleteAuthError) {
                  setDeleteAuthError(null);
                }
              }}
              placeholder="Enter manager password"
            />
            {deleteAuthError ? (
              <p className="text-xs text-red-600">{deleteAuthError}</p>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={permanentDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPermanentDelete}
              disabled={permanentDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {permanentDeleteMutation.isPending
                ? "Deleting..."
                : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
