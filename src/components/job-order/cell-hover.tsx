import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { TableCell } from "../ui/table";
import { Checkbox } from "../ui/checkbox";

export function TableCellWithHover({
  highlight,
  isRowSelected,
  handleRowSelection,
}: {
  highlight: boolean;
  isRowSelected: boolean;
  handleRowSelection: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TableCell
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative"
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
            } absolute top-0 translate-y-full transition-opacity duration-200`}
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
