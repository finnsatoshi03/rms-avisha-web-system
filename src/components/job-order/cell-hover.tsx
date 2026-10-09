import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { TableCell } from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { cn } from "../../lib/utils";

export function TableCellWithHover({
  highlight,
  isRowSelected,
  handleRowSelection,
  className,
}: {
  className?: string;
  highlight: boolean;
  isRowSelected: boolean;
  handleRowSelection: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TableCell
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative", className)}
    >
      {highlight && !isRowSelected ? (
        <>
          <CircleAlert
            className={`text-red-600 size-4 ${
              isHovered ? "opacity-0" : "opacity-100"
            } transition-opacity duration-200`}
          />
          <Checkbox
            checked={isRowSelected}
            onCheckedChange={handleRowSelection}
            onClick={(e) => e.stopPropagation()}
            className={`${
              isHovered ? "opacity-100" : "opacity-0"
            } absolute left-4 top-1/2 -translate-y-1/2 transition-opacity duration-200`}
          />
        </>
      ) : (
        <Checkbox
          checked={isRowSelected}
          onCheckedChange={handleRowSelection}
          onClick={(e) => e.stopPropagation()}
          className="opacity-100"
        />
      )}
    </TableCell>
  );
}
