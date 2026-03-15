/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  ChevronDown,
  Filter,
  CircleAlert,
} from "lucide-react";
import HeaderText from "../components/ui/headerText";
import { Separator } from "../components/ui/separator";
import Table from "../components/table";
import SortButton from "../components/sort-button";
import { JobOrderData, Sort } from "../lib/types";
import ColumnVisibilityDropdown from "../components/column-visibility-drop-down";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import JobOrderForm from "../components/job-order/job-order-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJobOrdersFiltered } from "../services/apiJobOrders";
import Loader from "../components/ui/loader";
import ErrorBoundary from "../components/error-boundery";
import { getTechnicians } from "../services/apiTechnicians";
import { Input } from "../components/ui/input";
import { useUser } from "../components/auth/useUser";
import debounce from "lodash/debounce"; // Import debounce from lodash
import { getStatusClass } from "../lib/helpers";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import ExportDialog from "../components/job-order/export-dialog";
import BatchDeleteDialog from "../components/job-order/batch-delete-dialog";

const viewColumns = [
  { key: "created_at", title: "Date" },
  { key: "machine_type", title: "Machine Type" },
  { key: "status", title: "Status" },
  { key: "warranty", title: "Warranty" },
  { key: "users.fullname", title: "Technician Name" },
  { key: "completed_at", title: "Completed Date" },
];

// Add this after the viewColumns definition
const allStatuses = [
  { label: "Pending", value: "Pending" },
  { label: "Quotation", value: "Quotation" },
  { label: "For Approval", value: "For Approval" },
  { label: "Repairing", value: "Repairing" },
  { label: "Waiting Parts", value: "Waiting Parts" },
  { label: "Ready for Pickup", value: "Ready for Pickup" },
  { label: "Completed", value: "Completed" },
  { label: "Canceled", value: "Canceled" },
  { label: "Pull Out", value: "Pull Out" },
  { label: "For Collection", value: "For Collection" },
  { label: "For Billing", value: "For Billing" },
];

// Define the query response type
interface JobOrderResponse {
  data: JobOrderData[];
  meta: {
    totalCount: number | null;
  };
}

export default function JobOrders() {
  const queryClient = useQueryClient();
  const { isManager, branchId: currentBranchId, isUser, isAdmin, user } =
    useUser();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>(
    []
  );
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    viewColumns
      .filter((col) => col.key !== "completed_at")
      .map((col) => col.key)
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Create a debounced function for updating search term
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setDebouncedSearchTerm(term);
      setIsSearching(false);
    }, 500),
    []
  );

  // Effect to trigger debounced search
  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
    }
    debouncedSearch(searchTerm);

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  const getBranchId = () => (isManager ? currentBranchId ?? null : null);

  // Include role-based filtering in API call
  const { data, isLoading, isFetching } = useQuery<JobOrderResponse>({
    queryKey: [
      "job_order",
      currentPage,
      itemsPerPage,
      debouncedSearchTerm,
      isManager,
      currentBranchId,
      isUser,
      user?.id,
      selectedStatusFilters, // Add status filters to query key
      showWarningsOnly, // Add warning filter to query key
    ],
    queryFn: () =>
      getJobOrdersFiltered({
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
        branchId: getBranchId(),
        technicianId: isUser ? user?.id : undefined,
        statusFilters: selectedStatusFilters, // Pass status filters to API
        showWarningsOnly: showWarningsOnly, // Pass warning filter to API
      }),
    placeholderData: (previousData) => previousData,
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    isManager,
    currentBranchId,
    isUser,
    user?.id,
    selectedStatusFilters,
    showWarningsOnly,
  ]);

  // Simplify since filtering is now done on the server
  const job_orders = useMemo(() => {
    return data?.data || [];
  }, [data?.data]);

  // Add this after the existing useEffect hooks
  const visibleStatusFilters = useMemo(() => {
    return allStatuses.slice(0, 5);
  }, []);

  const hiddenStatusFilters = useMemo(() => {
    return allStatuses.slice(5);
  }, []);

  const handleStatusFilterClick = (status: string) => {
    setSelectedStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Get total count from API
  const totalItems = data?.meta?.totalCount || 0;

  // Fetch Technicians
  const { data: technicians } = useQuery({
    queryKey: ["technicians", { fetchAll: false }],
    queryFn: () => getTechnicians({ fetchAll: false }),
  });

  const [filteredData, setFilteredData] = useState<JobOrderData[]>(
    job_orders || []
  );

  // Update filtered data when sorts change or job_orders change
  useEffect(() => {
    if (job_orders) {
      setFilteredData(sortData(job_orders));
    }
  }, [job_orders, sorts]);

  const applySorts = (newSorts: Sort[]) => setSorts(newSorts);

  const statusPriority: Record<string, number> = {
    completed: 1,
    "for approval": 2,
    "ready for pickup": 3,
    repairing: 4,
    "waiting parts": 5,
    pending: 6,
    canceled: 7,
    "for collection": 8,
    "for billing": 9,
  };

  // Modified sortData function to properly handle nested fields like users.fullname
  const sortData = (data: JobOrderData[] | undefined) => {
    if (!data) return [];

    const sortedData = [...data];
    sorts.forEach((sort) => {
      sortedData.sort((a, b) => {
        // Handle nested fields like users.fullname
        let aValue, bValue;

        if (sort.key.includes(".")) {
          const [parentKey, childKey] = sort.key.split(".");
          aValue = String(
            typeof a[parentKey as keyof JobOrderData] === "object" &&
              a[parentKey as keyof JobOrderData] !== null
              ? (a[parentKey as keyof JobOrderData] as Record<string, any>)[
                  childKey
                ]
              : ""
          ).toLowerCase();
          bValue = String(
            typeof b[parentKey as keyof JobOrderData] === "object" &&
              b[parentKey as keyof JobOrderData] !== null
              ? (b[parentKey as keyof JobOrderData] as Record<string, any>)[
                  childKey
                ]
              : ""
          ).toLowerCase();
        } else {
          aValue = String(
            a[sort.key as keyof JobOrderData] || ""
          ).toLowerCase();
          bValue = String(
            b[sort.key as keyof JobOrderData] || ""
          ).toLowerCase();
        }

        if (sort.key === "status") {
          const aPriority = statusPriority[aValue] || 0;
          const bPriority = statusPriority[bValue] || 0;
          return sort.direction === "asc"
            ? aPriority - bPriority
            : bPriority - aPriority;
        }

        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          return sort.direction === "asc"
            ? Number(aValue) - Number(bValue)
            : Number(bValue) - Number(aValue);
        }

        return aValue < bValue
          ? sort.direction === "asc"
            ? -1
            : 1
          : aValue > bValue
          ? sort.direction === "asc"
            ? 1
            : -1
          : 0;
      });
    });

    return sortedData;
  };

  const resetFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setShowWarningsOnly(false);
  };

  const resetFiltersAndSort = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSorts([]);
    setShowWarningsOnly(false);
  };

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    );
  };

  const handleSortChange = (column: string, direction: "asc" | "desc") =>
    applySorts([{ key: column, direction }]);

  const handleColumnVisibilityChange = (column: string, isVisible: boolean) => {
    setVisibleColumns((prevVisibleColumns) =>
      isVisible
        ? [...prevVisibleColumns, column]
        : prevVisibleColumns.filter((col) => col !== column)
    );
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  // Add this before the return statement
  const getStatusBadgeClass = (status: string) => {
    const baseClass =
      "px-3 py-0.5 rounded-full text-xs font-medium cursor-pointer truncate transition-all duration-200";
    const statusClass = getStatusClass(status);
    return `${baseClass} ${statusClass} ${
      selectedStatusFilters.includes(status.toLowerCase())
        ? "ring-2 ring-offset-2"
        : ""
    }`;
  };

  // Add this after the existing useEffect hooks
  const activeFiltersCount = useMemo(() => {
    return selectedStatusFilters.length + (showWarningsOnly ? 1 : 0);
  }, [selectedStatusFilters, showWarningsOnly]);

  const visibleActiveFilters = useMemo(() => {
    return selectedStatusFilters.slice(0, 2);
  }, [selectedStatusFilters]);

  const hiddenActiveFilters = useMemo(() => {
    return selectedStatusFilters.slice(2);
  }, [selectedStatusFilters]);

  if (isLoading)
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="h-full">
      <HeaderText>Job Orders</HeaderText>
      <div className="my-4 flex sm:flex-row flex-col sm:gap-0 gap-2 justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
              placeholder="Search brand model, machine type, status, etc."
            />
            <div className="absolute left-3 top-2 opacity-60">
              {isSearching || isFetching ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
              ) : (
                <Search size={14} />
              )}
            </div>
          </div>
          <SortButton
            applySorts={applySorts}
            sortCount={sorts.length}
            currentSort={sorts}
          />
          {(searchTerm ||
            sorts.length > 0 ||
            selectedStatusFilters.length > 0 ||
            showWarningsOnly) && (
            <Button
              variant="ghost"
              className="h-fit w-fit p-0 px-3 py-1.5 gap-1 rounded-lg"
              onClick={resetFiltersAndSort}
            >
              Reset <X size={16} strokeWidth={1.5} />
            </Button>
          )}
          <Separator orientation="vertical" className="mx-2 h-[1.5rem]" />
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="px-4 py-1.5 text-sm bg-primaryRed hover:bg-hoveredRed text-white flex items-center rounded-lg gap-1">
                <Plus size={18} />
                Add
              </button>
            </SheetTrigger>
            <SheetContent className="min-w-[50vw] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-bold">
                  Create New Job Order
                </SheetTitle>
                <Separator className="my-2" />
                <JobOrderForm
                  technicians={technicians}
                  onClose={() => setIsSheetOpen(false)}
                />
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-2">
          <ExportDialog
            branchId={getBranchId()}
            technicianId={user?.id}
            isUser={isUser}
          />
          {(isAdmin || isManager) && (
            <BatchDeleteDialog
              branchId={getBranchId()}
              technicianId={user?.id}
              isUser={isUser}
              onSuccess={() => {
                // Invalidate queries to refresh the data
                queryClient.invalidateQueries({ queryKey: ["job_order"] });
              }}
            />
          )}
          <ColumnVisibilityDropdown
            viewColumns={viewColumns}
            visibleColumns={visibleColumns}
            handleToggleColumn={handleToggleColumn}
          />
        </div>
      </div>

      <div className="flex flex-wrap mb-4 items-center justify-between">
        {/* Add the status filters section */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Warning Filter Button */}
          <button
            onClick={() => setShowWarningsOnly(!showWarningsOnly)}
            className={`px-3 py-0.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
              showWarningsOnly
                ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
            aria-label={`${
              showWarningsOnly ? "Hide" : "Show"
            } job orders with warnings`}
          >
            <CircleAlert size={14} strokeWidth={1.5} />
            Warnings
            {showWarningsOnly && <X size={12} />}
          </button>

          {visibleStatusFilters.map((status) => (
            <button
              key={status.value}
              onClick={() => handleStatusFilterClick(status.value)}
              className={getStatusBadgeClass(status.value)}
              aria-label={`Filter by ${status.label} status`}
            >
              {status.label}
            </button>
          ))}

          {hiddenStatusFilters.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="px-3 py-0.5 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 transition-all duration-200 flex items-center gap-1"
                aria-label="Show more status filters"
              >
                More Filters
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    showMoreFilters ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showMoreFilters && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="flex flex-wrap gap-2 max-w-[300px]">
                    {hiddenStatusFilters.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusFilterClick(status.value)}
                        className={getStatusBadgeClass(status.value)}
                        aria-label={`Filter by ${status.label} status`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedStatusFilters.length > 0 && (
            <button
              onClick={() => setSelectedStatusFilters([])}
              className="px-3 py-0.5 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 transition-all duration-200 flex items-center gap-1"
              aria-label="Clear all status filters"
            >
              Clear Filters
              <X size={14} />
            </button>
          )}
        </div>

        {/* Add active filters indicator */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            <div className="flex flex-wrap gap-2">
              {showWarningsOnly && (
                <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 flex items-center gap-1">
                  <CircleAlert size={12} />
                  <span>Warnings</span>
                  <button
                    onClick={() => setShowWarningsOnly(false)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remove warnings filter"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {visibleActiveFilters.map((status) => {
                const statusObj = allStatuses.find((s) => s.value === status);
                return (
                  <div
                    key={status}
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 flex items-center gap-1"
                  >
                    <span>{statusObj?.label || status}</span>
                    <button
                      onClick={() => handleStatusFilterClick(status)}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label={`Remove ${statusObj?.label || status} filter`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}

              {hiddenActiveFilters.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 flex items-center gap-1"
                      aria-label={`Show ${hiddenActiveFilters.length} more active filters`}
                    >
                      <Filter size={12} />
                      <span>+{hiddenActiveFilters.length}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-medium text-gray-500">
                        Additional Filters:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {hiddenActiveFilters.map((status) => {
                          const statusObj = allStatuses.find(
                            (s) => s.value === status
                          );
                          return (
                            <div
                              key={status}
                              className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 flex items-center gap-1"
                            >
                              <span>{statusObj?.label || status}</span>
                              <button
                                onClick={() => handleStatusFilterClick(status)}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label={`Remove ${
                                  statusObj?.label || status
                                } filter`}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}
      </div>

      <ErrorBoundary>
        <Table
          data={filteredData}
          originalData={job_orders}
          technicians={technicians || []}
          resetFilters={resetFilters}
          visibleColumns={visibleColumns}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          handlePageChange={handlePageChange}
          handleItemsPerPageChange={handleItemsPerPageChange}
          handleSortChange={handleSortChange}
          handleColumnVisibilityChange={handleColumnVisibilityChange}
          currentSort={sorts}
        />
      </ErrorBoundary>
    </div>
  );
}
