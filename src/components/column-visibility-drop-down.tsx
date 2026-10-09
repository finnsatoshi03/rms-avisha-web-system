import React from "react";
import { buttonVariants } from "./ui/button";
import { cn } from "../lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { SlidersHorizontal } from "lucide-react";

interface ColumnVisibilityDropdownProps {
  viewColumns: { key: string; title: string }[];
  visibleColumns: string[];
  handleToggleColumn: (key: string) => void;
}

const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  viewColumns,
  visibleColumns,
  handleToggleColumn,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5 px-3 text-sm font-normal text-slate-700")}>
        <SlidersHorizontal size={15} strokeWidth={1.75} />
        View
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-sm">
        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {viewColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={visibleColumns.includes(column.key)}
            onCheckedChange={() => handleToggleColumn(column.key)}
          >
            {column.title}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnVisibilityDropdown;
