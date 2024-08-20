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
import { PaginationControls } from "../table/pagination-controls";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ChevronDown } from "lucide-react";
import CollapsibleRows from "./collapsible-rows";

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
    const daysSinceOrder = differenceInDays(new Date(), orderDate);
    if (daysSinceOrder <= 3) {
      statuses.push("New");
    } else {
      statuses.push("Old");
    }
  }

  return statuses.length > 0 ? statuses : ["No Orders"];
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
      <TableUI>
        <TableHeader>
          <TableRow className="bg-slate-100 border-none">
            <TableHead className="w-[3%]">#</TableHead>
            <TableHead className="w-[30%]">Name</TableHead>
            <TableHead className="w-[10%]">Orders</TableHead>
            {visibleColumns.includes("total_spent") && (
              <TableHead className="w-[10%]">
                <SortableHeader
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
            <TableHead className="w-[3%]"></TableHead>
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
                      className={`cursor-pointer ${
                        isOpen ? "border-b-0 border-x border-t" : ""
                      }`}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-bold flex gap-2 items-center text-black py-4">
                        {client.name}
                        {statuses.map((status, index) => (
                          <span
                            key={index}
                            className={`${
                              status === "Returning"
                                ? "bg-[#ffc1078e]"
                                : status === "New"
                                ? "bg-[#91ed9483]"
                                : status === "Active"
                                ? "bg-[#64afff8f]"
                                : status === "Old"
                                ? "bg-[#9e9e9e72]"
                                : "bg-[#f4433685]"
                            } text-xs px-2 py-[1px] rounded-full w-fit`}
                          >
                            {status.toLowerCase()}
                          </span>
                        ))}
                      </TableCell>
                      <TableCell>
                        {client.joborders
                          ? Object.keys(client.joborders).length
                          : 0}
                      </TableCell>
                      {visibleColumns.includes("total_spent") && (
                        <TableCell className="font-bold text-black">{`₱${formatNumberWithCommas(
                          totalSpent(client)
                        )}`}</TableCell>
                      )}
                      {visibleColumns.includes("last_order") && (
                        <TableCell>{lastOrder(client)}</TableCell>
                      )}
                      {visibleColumns.includes("contact_no") && (
                        <TableCell>{client.contact_number}</TableCell>
                      )}
                      {visibleColumns.includes("email") && (
                        <TableCell>{client.email || "None"}</TableCell>
                      )}
                      <TableCell>
                        <ChevronDown
                          size={18}
                          className={`transition-transform duration-300 ${
                            isOpen ? "-rotate-180" : ""
                          }`}
                        />
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
}
