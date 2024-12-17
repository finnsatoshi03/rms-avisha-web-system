import { useState, useEffect } from "react";
import { Check, Ban, Wrench } from "lucide-react";

import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { PaginationControls } from "./pagination-controls";
import { SortableHeader } from "./sort-table-header";
import { formatNumberWithCommas } from "../../lib/helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";

type TableProps<T> = {
  data: Array<T & { id: string }>;
  columns: { key: keyof T; title: string }[];
  visibleColumns: (keyof T)[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  handlePageChange: (page: number) => void;
  handleItemsPerPageChange: (items: number) => void;
  handleSortChange: (column: keyof T, direction: "asc" | "desc") => void;
  handleRowClick?: (row: T) => void;
  onRowSelection?: (selectedIds: number[]) => void;
  renderActions?: (row: T) => React.ReactNode;
  onStatusChange?: (id: string, status: string) => void;
};

const statusOptions = [
  {
    value: "AVAILABLE",
    label: "Available",
    icon: <Check className="mr-2 size-4" />,
  },
  { value: "RENTED", label: "Rented", icon: <Ban className="mr-2 size-4" /> },
  {
    value: "MAINTENANCE",
    label: "Maintenance",
    icon: <Wrench className="mr-2 size-4" />,
  },
];

const Table = <T,>({
  data,
  columns,
  visibleColumns,
  currentPage,
  itemsPerPage,
  totalItems,
  handlePageChange,
  handleItemsPerPageChange,
  handleSortChange,
  handleRowClick,
  onRowSelection,
  renderActions,
  onStatusChange,
}: TableProps<T>) => {
  const [sortStates, setSortStates] = useState<{
    [key: string]: "asc" | "desc" | null;
  }>({});
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  useEffect(() => {
    const initialSortState = columns.reduce<Record<string, "asc" | "desc">>(
      (acc, col) => {
        acc[col.key as string] = "asc";
        return acc;
      },
      {}
    );
    setSortStates(initialSortState);
  }, [columns]);

  const handleSort = (column: keyof T, direction: "asc" | "desc") => {
    handleSortChange(column, direction);
    setSortStates((prevStates) => ({
      ...prevStates,
      [column]: direction,
    }));
  };

  const handleRowSelection = (id: number) => {
    if (onRowSelection) {
      setSelectedRows((prevSelectedRows) => {
        const newSelectedRows = prevSelectedRows.includes(id)
          ? prevSelectedRows.filter((rowId) => rowId !== id)
          : [...prevSelectedRows, id];
        onRowSelection(newSelectedRows);
        return newSelectedRows;
      });
    }
  };

  const handleSelectAllRows = () => {
    if (onRowSelection) {
      if (selectedRows.length === data.length) {
        onRowSelection([]);
        setSelectedRows([]);
      } else {
        onRowSelection(data.map((row) => Number(row["id"])));
        setSelectedRows(data.map((row) => Number(row["id"])));
      }
    }
  };

  const isRowSelected = (id: number) => selectedRows.includes(id);
  const areAllRowsSelected = selectedRows.length === data.length;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="h-[calc(100%-6.5rem)] flex flex-col justify-between">
      <TableUI>
        <TableHeader>
          <TableRow className="bg-slate-100 border-none">
            {onRowSelection && (
              <TableHead className="w-[3%]">
                <Checkbox
                  checked={areAllRowsSelected}
                  onCheckedChange={handleSelectAllRows}
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.key as string}
                className={`w-[${
                  renderActions
                    ? 100 / (columns.length + 1)
                    : 100 / columns.length
                }%]`}
              >
                {visibleColumns.includes(col.key) && (
                  <SortableHeader
                    column={col.key as string}
                    sortStates={sortStates}
                    handleSort={(column: string, direction: "asc" | "desc") =>
                      handleSort(column as keyof T, direction)
                    }
                  />
                )}
              </TableHead>
            ))}
            {renderActions && <TableHead className="w-[3%]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={index}
              className="text-gray-500 cursor-pointer"
              onClick={() => handleRowClick?.(row)}
            >
              {onRowSelection && (
                <TableCell>
                  <Checkbox
                    checked={isRowSelected(Number(row.id))}
                    onCheckedChange={() =>
                      handleRowSelection(Number(row["id"]))
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell key={col.key as string}>
                  {col.key === "status" ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className={`rounded-full px-2 py-0.5 h-fit text-center w-fit font-bold ${
                            ["AVAILABLE", "RENTED", "MAINTENANCE"].includes(
                              String(row[col.key])
                            )
                              ? {
                                  AVAILABLE: "bg-green-200 text-green-800",
                                  RENTED: "bg-red-200 text-red-800",
                                  MAINTENANCE: "bg-yellow-200 text-yellow-800",
                                }[String(row[col.key])] || ""
                              : ""
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {String(row[col.key]).charAt(0).toUpperCase() +
                            String(row[col.key]).slice(1).toLowerCase()}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="left">
                        {statusOptions
                          .filter(
                            (status) => status.value !== String(row[col.key])
                          )
                          .map((status) => (
                            <DropdownMenuItem
                              key={status.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange?.(
                                  row.id,
                                  status.value.toLowerCase()
                                );
                              }}
                            >
                              {status.icon}
                              {status.label}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <p
                      className={`rounded-full px-2 py-0.5 w-fit font-bold ${
                        col.key === "status"
                          ? ["AVAILABLE", "RENTED", "MAINTENANCE"].includes(
                              String(row[col.key])
                            )
                            ? {
                                AVAILABLE: "bg-green-200 text-green-800",
                                RENTED: "bg-red-200 text-red-800",
                                MAINTENANCE: "bg-yellow-200 text-yellow-800",
                              }[String(row[col.key])] || ""
                            : ""
                          : ""
                      }`}
                    >
                      {typeof col.key === "string" &&
                      col.key.toLowerCase().includes("rate")
                        ? `₱${String(
                            formatNumberWithCommas(row[col.key] as number)
                          )}`
                        : col.key === "status"
                        ? String(row[col.key]).charAt(0).toUpperCase() +
                          String(row[col.key]).slice(1).toLowerCase()
                        : String(row[col.key])}
                    </p>
                  )}
                </TableCell>
              ))}
              {renderActions && <TableCell>{renderActions(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </TableUI>
      <PaginationControls
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        handlePageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        handleItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
};

export default Table;
