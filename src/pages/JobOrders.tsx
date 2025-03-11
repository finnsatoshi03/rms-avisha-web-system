/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, X } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { getJobOrdersFiltered } from "../services/apiJobOrders";
import Loader from "../components/ui/loader";
import ErrorBoundary from "../components/error-boundery";
import { getTechnicians } from "../services/apiTechnicians";
import { Input } from "../components/ui/input";
import { useUser } from "../components/auth/useUser";
import debounce from "lodash/debounce"; // Import debounce from lodash

const viewColumns = [
  { key: "created_at", title: "Date" },
  { key: "machine_type", title: "Machine Type" },
  { key: "status", title: "Status" },
  { key: "warranty", title: "Warranty" },
  { key: "users.fullname", title: "Technician Name" },
  { key: "completed_at", title: "Completed Date" },
];

// Define the query response type
interface JobOrderResponse {
  data: JobOrderData[];
  meta: {
    totalCount: number | null;
  };
}

export default function JobOrders() {
  const { isTaytay, isPasig, isUser, user } = useUser();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    viewColumns
      .filter((col) => col.key !== "completed_at")
      .map((col) => col.key)
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Create a debounced function for updating search term
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setDebouncedSearchTerm(term);
      setIsSearching(false);
    }, 500), // 500ms debounce delay
    []
  );

  // Effect to trigger debounced search
  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
    }
    debouncedSearch(searchTerm);

    return () => {
      debouncedSearch.cancel(); // Cancel any pending debounces on unmount
    };
  }, [searchTerm, debouncedSearch]);

  // Query with search term included
  const { data, isLoading, isFetching } = useQuery<JobOrderResponse>({
    queryKey: ["job_order", currentPage, itemsPerPage, debouncedSearchTerm],
    queryFn: () =>
      getJobOrdersFiltered({
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
      }),
    placeholderData: (previousData) => previousData,
  });

  // Reset to first page when search term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm]);

  const job_orders = useMemo(() => {
    const orders = data?.data || [];

    // Apply your existing branch/user filtering logic if needed
    return orders
      .filter((order: JobOrderData) =>
        isTaytay
          ? order.branches.location === "Taytay"
          : isPasig
          ? order.branches.location === "Pasig"
          : true
      )
      .filter((order: JobOrderData) => !isUser || order.users?.id === user?.id);
  }, [data?.data, isTaytay, isPasig, isUser, user]);

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
  };

  const resetFiltersAndSort = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSorts([]);
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
          {(searchTerm || sorts.length > 0) && (
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
        <ColumnVisibilityDropdown
          viewColumns={viewColumns}
          visibleColumns={visibleColumns}
          handleToggleColumn={handleToggleColumn}
        />
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
