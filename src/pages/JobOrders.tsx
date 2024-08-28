/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
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
import { getJobOrders } from "../services/apiJobOrders";
import Loader from "../components/ui/loader";
import ErrorBoundary from "../components/error-boundery";
import { getTechnicians } from "../services/apiTechnicians";
import { Input } from "../components/ui/input";
import { renderWarrantyInfo } from "../lib/helpers";
import { useUser } from "../components/auth/useUser";

const viewColumns = [
  { key: "created_at", title: "Date" },
  { key: "machine_type", title: "Machine Type" },
  { key: "status", title: "Status" },
  { key: "warranty", title: "Warranty" },
  { key: "users.fullname", title: "Technician Name" },
  { key: "completed_at", title: "Completed Date" },
];

export default function JobOrders() {
  const { isTaytay, isPasig, isUser, user } = useUser();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["job_order"],
    queryFn: getJobOrders,
  });

  orders?.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const job_orders = useMemo(() => {
    if (!orders) return [];

    let filteredOrders = orders.filter((order: JobOrderData) =>
      isTaytay
        ? order.branches.location === "Taytay"
        : isPasig
        ? order.branches.location === "Pasig"
        : true
    );

    // If the user is a technician, filter by the user's job orders
    if (isUser) {
      filteredOrders = filteredOrders.filter(
        (order) => order.users?.id === user?.id
      );
    }

    return filteredOrders;
  }, [orders, isTaytay, isPasig, isUser, user]);

  // Fetch Technicians
  const { data: technicians } = useQuery({
    queryKey: ["technicians", { fetchAll: false }],
    queryFn: () => getTechnicians({ fetchAll: false }),
  });

  const [sorts, setSorts] = useState<Sort[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState<JobOrderData[]>(
    job_orders || []
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    viewColumns
      .filter((col) => col.key !== "completed_at")
      .map((col) => col.key)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedData, setPaginatedData] = useState<JobOrderData[]>([]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (job_orders) {
      setFilteredData(filterAndSortData(job_orders));
    }
  }, [job_orders, searchTerm, sorts]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [filteredData, currentPage, itemsPerPage]);

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

  const filterAndSortData = (data: JobOrderData[] | undefined) => {
    if (!data) return [];

    const searchFilteredData = data.filter((item: JobOrderData) => {
      const searchableStr = [
        item.brand_model,
        item.clients?.name,
        item.order_no,
        item.machine_type,
        item.problem_statement,
        item.status,
        item.grand_total,
        renderWarrantyInfo(item.warranty),
        new Date(item.completed_at ?? "").toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Singapore",
        }),
        new Date(item.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Singapore",
        }),
      ]
        .join(" ")
        .toLowerCase();

      return searchableStr.includes(searchTerm.toLowerCase());
    });

    const sortedData = [...searchFilteredData];
    sorts.forEach((sort) => {
      sortedData.sort((a, b) => {
        const aValue = String(a[sort.key]).toLowerCase();
        const bValue = String(b[sort.key]).toLowerCase();

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

  const resetFilters = () => setSearchTerm("");

  const resetFiltersAndSort = () => {
    setSearchTerm("");
    setSorts([]);
  };

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    );
  };

  const handleSortChange = (column: string, direction: any) =>
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
              placeholder="Search.."
            />
            <Search className="absolute left-3 top-2 opacity-60" size={14} />
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
          data={paginatedData}
          originalData={job_orders}
          technicians={technicians || []}
          resetFilters={resetFilters}
          visibleColumns={visibleColumns}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredData.length}
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
