import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ArrowDown, ArrowUp, ChevronsUpDownIcon, CircleX } from "lucide-react";
import { Button } from "../ui/button";

export const SortableHeader = ({
  column,
  sortStates,
  handleSort,
  handleColumnVisibilityChange,
}: {
  column: string;
  sortStates: { [key: string]: "asc" | "desc" | null };
  handleSort: (column: string, direction: "asc" | "desc") => void;
  handleColumnVisibilityChange?: (column: string, isVisible: boolean) => void;
}) => {
  const columnDisplayNames: { [key: string]: string } = {
    created_at: "Date",
    machine_type: "Machine Type",
    status: "Status",
    warranty: "Warranty",
    "users.fullname": "Technician Name",
    grand_total: "Price",
    contact_no: "Contact No",
    last_order: "Last Order",
    total_spent: "Total Spent",
    email: "Email",
    sku: "SKU",
    category: "Category",
    last_in: "Last In",
    stocks: "Stocks",
    price: "Price",
    bill_name: "Bill Name",
    amount: "Amount",
    completed_at: "Completed Date",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-lg opacity-70 py-1 px-3 -mx-3 hover:bg-slate-200 flex items-center gap-1">
        {columnDisplayNames[column] ?? column}
        {sortStates[column] === "asc" ? (
          <ArrowUp size={12} strokeWidth={1.5} />
        ) : sortStates[column] === "desc" ? (
          <ArrowDown size={12} strokeWidth={1.5} />
        ) : (
          <ChevronsUpDownIcon size={12} strokeWidth={1.5} />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        alignOffset={8}
        className="px-2 flex flex-col"
      >
        <Button
          variant={"ghost"}
          className="justify-start gap-1 h-fit px-3 py-1.5"
          onClick={() => handleSort(column, "asc")}
        >
          <ArrowUp size={14} strokeWidth={1.5} color="gray" /> Asc
        </Button>
        <Button
          variant={"ghost"}
          className="justify-start gap-1 h-fit px-3 py-1.5"
          onClick={() => handleSort(column, "desc")}
        >
          <ArrowDown size={14} strokeWidth={1.5} color="gray" /> Desc
        </Button>
        {handleColumnVisibilityChange && column !== "grand_total" && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant={"ghost"}
              className="justify-start gap-1 h-fit px-3 py-1.5"
              onClick={() => handleColumnVisibilityChange(column, false)}
            >
              <CircleX size={14} strokeWidth={1.5} color="gray" /> Hide
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
