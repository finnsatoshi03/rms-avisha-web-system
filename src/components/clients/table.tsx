/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { SortableHeader } from "../table/sort-table-header";
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Client } from "../../lib/types";
import { formatNumberWithCommas } from "../../lib/helpers";
import { differenceInDays } from "date-fns";
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
  rowActionsClass,
  useDataTableRef,
  useDensity,
} from "../table/data-table-kit";
import { PaginationControls } from "../table/pagination-controls";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ChevronDown, Pencil } from "lucide-react";
import CollapsibleRows from "./collapsible-rows";
import EditClientDialog from "./edit-client-dialog";
import { Button } from "../ui/button";
import { getServerNow } from "../../lib/server-time";

const getClientStatus = (client: Client): string[] => {
  const jobOrders = client.joborders;
  if (!jobOrders) return ["No Orders"];

  const statuses: string[] = [];

  const jobOrderCount = Object.keys(jobOrders).length;
  const recentOrder = Object.values(jobOrders).find(
    (order) => order.status !== "Completed"
  );

  if (recentOrder) {
    statuses.push("Active");
  }

  if (jobOrderCount >= 2) {
    statuses.push("Returning");
  }

  if (jobOrderCount === 1) {
    const singleOrder = Object.values(jobOrders)[0];
    const orderDate = new Date(singleOrder.created_at);
    const daysSinceOrder = differenceInDays(getServerNow(), orderDate);
    if (daysSinceOrder <= 3) {
      statuses.push("New");
    } else {
      statuses.push("Old");
    }
  }

  return statuses.length > 0 ? statuses : ["No Orders"];
};

// Same tint/ring/deep-text recipe as the job order statuses.
const CLIENT_STATUS_CLASS: Record<string, string> = {
  Returning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  New: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  Active: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200",
  Old: "bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-200",
  default: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
};

export default function ClientsTable({
  data,
  // resetFilters,
  visibleColumns = [],
  currentPage,
  itemsPerPage,
  totalItems,
  handlePageChange,
  handleItemsPerPageChange,
  handleSortChange,
  handleColumnVisibilityChange,
  currentSort,
  totalSpent,
  lastOrder,
}: {
  data: Client[];
  // resetFilters?: () => void;
  visibleColumns: string[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  handlePageChange: (page: number) => void;
  handleItemsPerPageChange: (items: number) => void;
  handleSortChange: (column: string, direction: "asc" | "desc") => void;
  handleColumnVisibilityChange: (column: string, isVisible: boolean) => void;
  currentSort: { key: string; direction: "asc" | "desc" }[];
  totalSpent: (client: Client) => number;
  lastOrder: (client: Client) => string | null;
}) {
  const [clients, setClients] = useState(data);
  const [density, changeDensity] = useDensity("clients-table-density");
  const tableRef = useDataTableRef();
  const [sortStates, setSortStates] = useState<{
    [key: string]: "asc" | "desc" | null;
  }>({
    total_spent: null,
    last_order: null,
    contact_no: null,
    email: null,
  });
  const [openCollapsibleIndex, setOpenCollapsibleIndex] = useState<
    number | null
  >(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    setOpenCollapsibleIndex(null);
  }, [currentPage, itemsPerPage]);

  const handleSort = (column: string, direction: "asc" | "desc") => {
    handleSortChange(column, direction);
    setSortStates({
      total_spent: null,
      last_order: null,
      contact_no: null,
      email: null,
      [column]: direction,
    });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    setClients(data);
  }, [data]);

  useEffect(() => {
    const initialSortState = currentSort.reduce<Record<string, "asc" | "desc">>(
      (acc, sort) => {
        acc[sort.key] = sort.direction;
        return acc;
      },
      {}
    );
    setSortStates(initialSortState);
  }, [currentSort]);

  return (
    <div className="h-[calc(100%-6.5rem)] flex flex-col justify-between">
      <TooltipProvider delayDuration={300}>
      <TableUI ref={tableRef} className={cn(dataTableClass, "min-w-[1000px]")}>
        <TableHeader>
          <TableRow className={dataTableHeaderRowClass}>
            <TableHead className={pin.checkbox}>#</TableHead>
            <TableHead className={pin.nameAfterCheckbox}>Name</TableHead>
            {visibleColumns.includes("type") && (
              <TableHead className="w-[8%]">Type</TableHead>
            )}
            <TableHead className="w-[8%] text-right">Orders</TableHead>
            {visibleColumns.includes("total_spent") && (
              <TableHead className="w-[10%] text-right">
                <SortableHeader
                  className="ml-auto"
                  column="total_spent"
                  sortStates={sortStates}
                  handleSort={handleSort}
                  handleColumnVisibilityChange={handleColumnVisibilityChange}
                />
              </TableHead>
            )}
            {visibleColumns.includes("last_order") && (
              <TableHead className="w-[10%]">
                <SortableHeader
                  column="last_order"
                  sortStates={sortStates}
                  handleSort={handleSort}
                  handleColumnVisibilityChange={handleColumnVisibilityChange}
                />
              </TableHead>
            )}
            {visibleColumns.includes("contact_no") && (
              <TableHead className="w-[15%]">
                <SortableHeader
                  column="contact_no"
                  sortStates={sortStates}
                  handleSort={handleSort}
                  handleColumnVisibilityChange={handleColumnVisibilityChange}
                />
              </TableHead>
            )}
            {visibleColumns.includes("email") && (
              <TableHead className="w-[15%]">
                <SortableHeader
                  column="email"
                  sortStates={sortStates}
                  handleSort={handleSort}
                  handleColumnVisibilityChange={handleColumnVisibilityChange}
                />
              </TableHead>
            )}
            <TableHead className="w-20">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client, index) => {
            const statuses = getClientStatus(client);
            const isOpen = openCollapsibleIndex === index;
            return (
              <Collapsible
                key={client.id}
                asChild
                open={isOpen}
                onOpenChange={(isOpen) => {
                  setOpenCollapsibleIndex(isOpen ? index : null);
                }}
              >
                <>
                  <CollapsibleTrigger asChild>
                    <TableRow
                      key={client.id}
                      className={cn(
                        dataTableRowClass(density),
                        isOpen && "border-b-0 border-x border-t"
                      )}
                    >
                      <TableCell
                        className={cn(pin.checkbox, rowAccentClass, "tabular-nums")}
                      >
                        {index + 1}
                      </TableCell>
                      <TableCell
                        className={cn(pin.nameAfterCheckbox, "font-bold text-black")}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <TruncatedText text={client.name || "—"} className="min-w-0" />
                          {statuses.map((status) => (
                            <span
                              key={status}
                              className={cn(
                                "shrink-0 rounded-full px-2 py-px text-[11px] font-medium",
                                CLIENT_STATUS_CLASS[status] ?? CLIENT_STATUS_CLASS.default
                              )}
                            >
                              {status.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      {visibleColumns.includes("type") && (
                        <TableCell>
                          <span
                            className="text-xs text-muted-foreground capitalize"
                          >
                            {client.type || "individual"}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className={numericCellClass}>
                        {client.joborders
                          ? Object.keys(client.joborders).length
                          : 0}
                      </TableCell>
                      {visibleColumns.includes("total_spent") && (
                        <TableCell className={cn(numericCellClass, "font-bold text-black")}>{`₱${formatNumberWithCommas(
                          totalSpent(client)
                        )}`}</TableCell>
                      )}
                      {visibleColumns.includes("last_order") && (
                        <TableCell>{lastOrder(client)}</TableCell>
                      )}
                      {visibleColumns.includes("contact_no") && (
                        <TableCell>{client.contact_number || "—"}</TableCell>
                      )}
                      {visibleColumns.includes("email") && (
                        <TableCell>
                          <TruncatedText
                            text={client.email || "—"}
                            className="max-w-[14rem]"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7 text-muted-foreground hover:text-foreground",
                              rowActionsClass
                            )}
                            title="Edit client"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingClient(client);
                            }}
                          >
                            <Pencil size={14} />
                          </Button>
                          <ChevronDown
                            size={18}
                            className={`transition-transform duration-300 ${
                              isOpen ? "-rotate-180" : ""
                            }`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <CollapsibleRows
                      client={client}
                      visibleColumns={visibleColumns}
                    />
                  </CollapsibleContent>
                </>
              </Collapsible>
            );
          })}
        </TableBody>
      </TableUI>
      </TooltipProvider>
      <PaginationControls
        extra={<DensityToggle value={density} onChange={changeDensity} />}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        handlePageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        handleItemsPerPageChange={handleItemsPerPageChange}
      />
      <EditClientDialog
        client={editingClient}
        open={editingClient !== null}
        onOpenChange={(open) => {
          if (!open) setEditingClient(null);
        }}
      />
    </div>
  );
}
