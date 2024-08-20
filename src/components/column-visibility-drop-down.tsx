import React from "react";
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
      <DropdownMenuTrigger
        className="cursor-pointer flex gap-1 items-center border text-gray-400
        border-gray-400 w-fit px-2 py-1 rounded-lg space-x-1 text-sm"
      >
        <SlidersHorizontal size={18} strokeWidth={1.5} />
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
