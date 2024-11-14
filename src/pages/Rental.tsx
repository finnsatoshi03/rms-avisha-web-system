import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { useUnits } from "../components/rental/useUnits";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import HeaderText from "../components/ui/headerText";
import Loader from "../components/ui/loader";
import SortButton from "../components/sort-button";
import Table from "../components/table/table";

import { Sort, Unit } from "../lib/types";

export default function Rental() {
  const { units, isLoading: isUnitsLoading } = useUnits();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>(units || []);

  const columns: { key: keyof Unit; title: string }[] = [
    { key: "unit_name", title: "Unit Name" },
    { key: "model", title: "Model" },
    { key: "serial_number", title: "Serial Number" },
    { key: "status", title: "Status" },
    { key: "daily_rate", title: "Daily Rate" },
    { key: "monthly_rate", title: "Monthly Rate" },
  ];

  const statusPriority: Record<string, number> = {
    available: 1,
    rented: 2,
    maintenance: 3,
    reserved: 4,
  };

  const filterAndSortData = (data: Unit[]) => {
    const filteredData = data.filter((item) => {
      const searchableStr = [
        item.unit_name,
        item.model,
        item.serial_number,
        item.daily_rate.toString(),
        item.monthly_rate.toString(),
        item.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchableStr.includes(searchTerm.toLowerCase());
    });

    const sortedData = [...filteredData];
    sorts.forEach((sort) => {
      sortedData.sort((a, b) => {
        const aValue = String(a[sort.key as keyof Unit]).toLowerCase();
        const bValue = String(b[sort.key as keyof Unit]).toLowerCase();

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

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleSortChange = (column: string, direction: "asc" | "desc") => {
    const newSort: Sort = { key: column as keyof Unit, direction };
    setSorts([newSort]);
  };

  const handleRowClick = (row: Unit) => {
    // Handle row click event
  };

  const handleRowSelection = (selectedIds: number[]) => {
    // Handle row selection event
  };

  useMemo(() => {
    setFilteredUnits(filterAndSortData(units || []));
  }, [units, searchTerm, sorts]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUnits.slice(startIndex, endIndex);
  }, [filteredUnits, currentPage, itemsPerPage]);

  const resetFilters = () => {
    setSearchTerm("");
    setSorts([]);
  };

  if (isUnitsLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="h-full">
      <HeaderText>Rental</HeaderText>
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
            isRentalTable
            applySorts={setSorts}
            sortCount={sorts.length}
            currentSort={sorts}
          />
          {(searchTerm || sorts.length > 0) && (
            <Button
              variant="ghost"
              className="h-fit w-fit p-0 px-3 py-1.5 gap-1 rounded-lg"
              onClick={resetFilters}
            >
              Reset <X size={16} strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>
      <Table
        data={paginatedData}
        columns={columns}
        visibleColumns={columns.map((col) => col.key)}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={filteredUnits.length}
        handlePageChange={handlePageChange}
        handleItemsPerPageChange={handleItemsPerPageChange}
        handleSortChange={handleSortChange}
        handleRowClick={handleRowClick}
        onRowSelection={handleRowSelection}
      />
    </div>
  );
}
