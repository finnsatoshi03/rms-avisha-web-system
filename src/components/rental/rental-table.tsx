/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { RentalData, RentalStatus } from "../../lib/types";
import { RentalStatusBadge } from "./rental-status-badge";
import { SortableHeader } from "../table/sort-table-header";
import { PaginationControls } from "../table/pagination-controls";
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { AlertTriangle, FileDown, Trash2, X } from "lucide-react";

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
  className?: string;
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
  className,
}: RentalTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const [animationClass, setAnimationClass] = useState("");
  const showNotification = selectedIds.length > 0;

  useEffect(() => {
    if (showNotification) {
      setAnimationClass("slideUp");
    }
  }, [showNotification]);

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
    <div className={`flex flex-col ${className || ""}`}>
      <TableUI>
        <TableHeader>
          <TableRow className="bg-slate-100 border-none">
            <TableHead className="w-[3%]">
              <Checkbox
                checked={
                  rentals.length > 0 && selectedIds.length === rentals.length
                }
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead className="w-[10%]">
              <SortableHeader
                column="rental_no"
                sortStates={sortStates}
                handleSort={onSort}
              />
            </TableHead>
            <TableHead className="w-[18%]">Client Name</TableHead>
            <TableHead className="w-[15%]">Printer</TableHead>
            <TableHead className="w-[12%]">
              <SortableHeader
                column="status"
                sortStates={sortStates}
                handleSort={onSort}
              />
            </TableHead>
            <TableHead className="w-[10%]">
              <SortableHeader
                column="start_date"
                sortStates={sortStates}
                handleSort={onSort}
              />
            </TableHead>
            <TableHead className="w-[10%]">
              <SortableHeader
                column="due_date"
                sortStates={sortStates}
                handleSort={onSort}
              />
            </TableHead>
            <TableHead className="w-[12%]">Technician</TableHead>
            <TableHead className="w-[10%] text-right">
              <SortableHeader
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
              return (
                <TableRow
                  key={rental.id}
                  className={`text-gray-500 cursor-pointer ${
                    isOverdue ? "bg-red-100" : ""
                  }`}
                  onClick={() => onRowClick(rental)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(rental.id)}
                      onCheckedChange={() => toggleOne(rental.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-gray-800">
                    {rental.rental_no}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-gray-700">
                        {rental.clients?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {rental.clients?.contact_number || ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {rental.rental_assets?.unit_name || "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {rental.rental_assets?.model || ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <RentalStatusBadge
                        status={rental.status as RentalStatus}
                      />
                      {isOverdue && (
                        <span className="text-red-600 flex items-center gap-0.5 text-[10px]">
                          <AlertTriangle size={10} />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {rental.start_date
                      ? new Date(rental.start_date).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell
                    className={`text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}
                  >
                    {rental.due_date
                      ? new Date(rental.due_date).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(rental.users as any)?.fullname ||
                      (rental.users as any)?.email ||
                      "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-700">
                    ₱{Number(rental.grand_total).toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </TableUI>

      <div className="mt-auto">
        <PaginationControls
          totalItems={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={onPageChange}
          itemsPerPage={itemsPerPage}
          handleItemsPerPageChange={onItemsPerPageChange}
        />
      </div>

      {/* Selection Notification Bar — mirrors JO table pattern */}
      {showNotification && (
        <div className="w-full flex items-center justify-center h-0">
          <div
            className={`w-fit text-sm bg-slate-800 md:py-3 py-5 md:px-5 px-8 text-white rounded-3xl md:rounded-full absolute bottom-4 flex md:flex-row flex-col md:gap-0 gap-4 items-center justify-between ${animationClass} z-50`}
            style={{
              animation: `${animationClass} 0.2s ease-out forwards`,
            }}
          >
            <div className="flex items-center gap-4">
              <X
                size={16}
                className="cursor-pointer"
                onClick={() => onSelectionChange([])}
              />
              <p>
                <span className="p-1 bg-slate-700 size-6 rounded">
                  {selectedIds.length}
                </span>{" "}
                row(s) selected
              </p>
            </div>
            <div className="flex gap-2 md:ml-4">
              {selectedIds.length === 1 && onExportPdf && (
                <button
                  onClick={() => {
                    const rental = rentals.find(
                      (r) => r.id === selectedIds[0]
                    );
                    if (rental) onExportPdf(rental);
                  }}
                  className="text-white hover:text-gray-300 flex items-center gap-1 px-2"
                >
                  <FileDown size={14} />
                  <span className="text-xs">Export PDF</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(selectedIds)}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 px-2"
                >
                  <Trash2 size={14} />
                  <span className="text-xs">Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
