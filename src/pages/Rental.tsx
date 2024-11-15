import { useMemo, useState } from "react";
import {
  Ellipsis,
  FilePenLine,
  ListCollapse,
  Plus,
  Search,
  Trash,
  X,
} from "lucide-react";

import { useUnits } from "../components/rental/useUnits";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import HeaderText from "../components/ui/headerText";
import Loader from "../components/ui/loader";
import SortButton from "../components/sort-button";
import Table from "../components/table/table";

import { Sort, Unit } from "../lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Separator } from "../components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { RentalUnitForm } from "../components/rental/rental-form";

export default function Rental() {
  const { units, isLoading: isUnitsLoading } = useUnits();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<Unit | null>(null);
  const [action, setAction] = useState<"details" | "edit" | "add" | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>(units || []);

  const [newUnit, setNewUnit] = useState({
    unit_name: "",
    model: "",
    serial_number: "",
    status: "available",
    daily_rate: "",
    monthly_rate: "",
  });

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

  const handleRowClick = (row: Unit, action: "details" | "edit") => {
    setSelectedRow(row);
    setAction(action);
  };

  const handleRowSelection = (selectedIds: number[]) => {
    // Handle row selection event
  };

  const handleAddClick = () => {
    setAction("add");
    setSelectedRow(null);
  };

  const handleAddUnitSubmit = () => {
    console.log("Adding new unit:", newUnit);
    setAction(null);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSorts([]);
  };

  useMemo(() => {
    setFilteredUnits(filterAndSortData(units || []));
  }, [units, searchTerm, sorts]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUnits.slice(startIndex, endIndex);
  }, [filteredUnits, currentPage, itemsPerPage]);

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
          <Separator orientation="vertical" className="mx-2 h-[1.5rem]" />
          <button
            className="px-4 py-1.5 text-sm bg-primaryRed hover:bg-hoveredRed text-white flex items-center rounded-lg gap-1"
            onClick={handleAddClick}
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>
      <Table
        data={paginatedData}
        columns={columns}
        visibleColumns={[...columns.map((col) => col.key)]}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={filteredUnits.length}
        handlePageChange={handlePageChange}
        handleItemsPerPageChange={handleItemsPerPageChange}
        handleSortChange={handleSortChange}
        handleRowClick={(row) => handleRowClick(row, "details")}
        onRowSelection={handleRowSelection}
        renderActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hover:bg-slate-200 h-fit w-fit p-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Ellipsis size={18} strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick(row, "details");
                }}
              >
                <ListCollapse size={14} strokeWidth={1.5} />
                Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick(row, "edit");
                }}
              >
                <FilePenLine size={14} strokeWidth={1.5} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash size={14} strokeWidth={1.5} /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {(selectedRow || action === "add") && (
        <Sheet open={!!action} onOpenChange={() => setAction(null)}>
          <SheetContent className="h-full overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {action === "add"
                  ? "Add New Rental Unit"
                  : action === "edit"
                  ? `Edit ${selectedRow?.unit_name}`
                  : `Details of ${selectedRow?.unit_name}`}
              </SheetTitle>
              <SheetDescription>
                {action === "add"
                  ? "Fill in the details to add a new rental unit."
                  : action === "edit"
                  ? "Modify the details of this unit."
                  : "View all details of this unit."}
              </SheetDescription>
            </SheetHeader>
            <RentalUnitForm
              initialValues={selectedRow || {}}
              mode={
                action === "add"
                  ? "create"
                  : action === "edit"
                  ? "edit"
                  : "view"
              }
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
