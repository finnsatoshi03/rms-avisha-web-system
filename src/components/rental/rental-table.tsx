/* eslint-disable @typescript-eslint/no-explicit-any */
import { RentalData } from "../../lib/types";
import { StatusBadge, rentalStatuses } from "../table/status-popover";
import { SortableHeader } from "../table/sort-table-header";
import { PaginationControls } from "../table/pagination-controls";
import { SelectionBar } from "../table/selection-bar";
import { formatNumberWithCommas } from "../../lib/helpers";
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { AlertTriangle, FileDown, PenLine, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { TooltipProvider } from "../ui/tooltip";
import { cn } from "../../lib/utils";
import {
  DensityToggle,
  TruncatedText,
  dataTableClass,
  dataTableHeaderRowClass,
  dataTableRowClass,
  numericCellClass,
  pin,
  rowAccentClass,
  useDataTableRef,
  useDensity,
} from "../table/data-table-kit";

interface RentalTableProps {
  rentals: RentalData[];
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onRowClick: (rental: RentalData) => void;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  sortStates: { [key: string]: "asc" | "desc" | null };
  onSort: (column: string, direction: "asc" | "desc") => void;
  onExportPdf?: (rental: RentalData) => void;
  onDelete?: (ids: number[]) => void;
  onStatusChange?: (ids: number[], status: string) => void;
  onEdit?: (rental: RentalData) => void;
  className?: string;
  "data-tour"?: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Singapore",
  });
}

export default function RentalTable({
  rentals,
  totalCount,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  onRowClick,
  selectedIds,
  onSelectionChange,
  sortStates,
  onSort,
  onExportPdf,
  onDelete,
  onStatusChange,
  onEdit,
  className,
  "data-tour": dataTour,
}: RentalTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const [density, changeDensity] = useDensity("rentals-table-density");
  const tableRef = useDataTableRef();

  const toggleAll = () => {
    if (selectedIds.length === rentals.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(rentals.map((r) => r.id));
    }
  };

  const toggleOne = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className={`flex flex-col ${className || ""}`} data-tour={dataTour}>
      {/* Floating selection bar */}
      <SelectionBar
        count={selectedIds.length}
        onClear={() => onSelectionChange([])}
      >
        {selectedIds.length === 1 && onExportPdf && (
          <Button
            className="rounded-full bg-slate-700 gap-1"
            onClick={() => {
              const rental = rentals.find((r) => r.id === selectedIds[0]);
              if (rental) onExportPdf(rental);
            }}
          >
            <FileDown size={14} />
            <span className="hidden sm:block text-xs">Export PDF</span>
          </Button>
        )}
        {selectedIds.length === 1 && onEdit && (
          <Button
            className="rounded-full bg-slate-700 gap-1"
            onClick={() => {
              const rental = rentals.find((r) => r.id === selectedIds[0]);
              if (rental) onEdit(rental);
            }}
          >
            <PenLine size={14} />
            <span className="hidden sm:block text-xs">Edit</span>
          </Button>
        )}
        {onStatusChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-full bg-slate-700 gap-1">
                <RefreshCcw size={14} />
                <span className="hidden sm:block text-xs">Change Status</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-2 bg-slate-700 border-none text-white text-sm flex flex-col">
              {rentalStatuses.map((s) => {
                const Icon = s.icon;
                return (
                  <Button
                    key={s.value}
                    className="justify-start gap-2"
                    variant="ghost"
                    onClick={() => onStatusChange(selectedIds, s.label)}
                  >
                    <Icon size={14} /> {s.label}
                  </Button>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {onDelete && (
          <Button
            className="rounded-full bg-red-700 gap-1"
            onClick={() => onDelete(selectedIds)}
          >
            <Trash2 size={14} />
            <span className="hidden sm:block text-xs">Archive</span>
          </Button>
        )}
      </SelectionBar>

      <TooltipProvider delayDuration={300}>
      <TableUI ref={tableRef} className={cn(dataTableClass, "min-w-[1100px]")}>
        <TableHeader>
          <TableRow className={dataTableHeaderRowClass}>
            <TableHead className={pin.checkbox}>
              <Checkbox
                checked={
                  rentals.length > 0 && selectedIds.length === rentals.length
                }
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead className={pin.id}>
              <SortableHeader
                column="rental_no"
                sortStates={sortStates}
                handleSort={onSort}
              />
            </TableHead>
            <TableHead className={pin.name}>Client Name</TableHead>
            <TableHead>Printer</TableHead>
            <TableHead>
              <SortableHeader
                column="status"
                sortStates={sortStates}
                handleSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                column="start_date"
                sortStates={sortStates}
                handleSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                column="due_date"
                sortStates={sortStates}
                handleSort={onSort}
              />
            </TableHead>
            <TableHead>Technician</TableHead>
            <TableHead className="text-right">
              <SortableHeader
                className="ml-auto"
                column="grand_total"
                sortStates={sortStates}
                handleSort={onSort}
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rentals.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center py-8 text-gray-500"
              >
                No rentals found
              </TableCell>
            </TableRow>
          ) : (
            rentals.map((rental) => {
              const isOverdue = rental.is_overdue;
              const technicianName =
                (rental.users as any)?.fullname || (rental.users as any)?.email;
              const printer = [
                rental.rental_assets?.unit_name,
                rental.rental_assets?.model,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <TableRow
                  key={rental.id}
                  className={dataTableRowClass(density, isOverdue)}
                  onClick={() => onRowClick(rental)}
                >
                  <TableCell
                    className={cn(pin.checkbox, rowAccentClass)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.includes(rental.id)}
                      onCheckedChange={() => toggleOne(rental.id)}
                    />
                  </TableCell>
                  <TableCell className={cn(pin.id, "tabular-nums")}>
                    {rental.rental_no}
                  </TableCell>
                  <TableCell className={cn(pin.name, "font-bold text-black")}>
                    <TruncatedText text={rental.clients?.name || "—"} />
                  </TableCell>
                  <TableCell>
                    <TruncatedText text={printer || "—"} className="max-w-[14rem]" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <StatusBadge
                        status={rental.status}
                        statusList={rentalStatuses}
                      />
                      {isOverdue && (
                        <span title="Overdue" aria-label="Overdue" className="text-red-600">
                          <AlertTriangle size={12} />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(rental.start_date)}</TableCell>
                  <TableCell
                    className={isOverdue ? "text-red-600 font-medium" : ""}
                  >
                    {formatDate(rental.due_date)}
                  </TableCell>
                  <TableCell
                    className={technicianName ? "" : "text-red-600 font-bold"}
                  >
                    <TruncatedText
                      text={technicianName || "Not Assigned"}
                      className="max-w-[12rem]"
                    />
                  </TableCell>
                  <TableCell className={cn(numericCellClass, "font-bold text-black")}>
                    ₱{formatNumberWithCommas(Number(rental.grand_total))}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </TableUI>
      </TooltipProvider>

      <div className="mt-auto">
        <PaginationControls
          extra={<DensityToggle value={density} onChange={changeDensity} />}
          totalItems={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={onPageChange}
          itemsPerPage={itemsPerPage}
          handleItemsPerPageChange={onItemsPerPageChange}
        />
      </div>
    </div>
  );
}
