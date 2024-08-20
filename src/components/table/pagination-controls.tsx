import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export const PaginationControls = ({
  totalItems,
  currentPage,
  totalPages,
  handlePageChange,
  itemsPerPage,
  handleItemsPerPageChange,
}: {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
  itemsPerPage: number;
  handleItemsPerPageChange: (items: number) => void;
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems);

  return (
    <div className="flex justify-between w-full items-center mt-4">
      <p className="w-fit text-sm">
        Showing <span className="font-bold">{startIndex}</span> to{" "}
        <span className="font-bold">{endIndex}</span> of{" "}
        <span className="font-bold">{totalItems}</span> items
      </p>
      <div className="grid grid-cols-[auto_auto] items-center gap-2 w-fit">
        <div className="flex items-center gap-2 w-fit justify-end">
          <p className="text-sm font-bold">Rows per page:</p>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => handleItemsPerPageChange(Number(value))}
          >
            <SelectTrigger className="w-[60px] h-0 py-4">
              <SelectValue placeholder={itemsPerPage.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full justify-end items-center">
          <span className="mr-6 text-sm font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size={"icon"}
            variant={"outline"}
            className="h-fit p-1.5 w-fit"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft size={18} strokeWidth={1.5} />
          </Button>
          <Button
            size={"icon"}
            variant={"outline"}
            className="h-fit p-1.5 w-fit"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} strokeWidth={1.5} />
          </Button>
          <Button
            size={"icon"}
            variant={"outline"}
            className="h-fit p-1.5 w-fit"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} strokeWidth={1.5} />
          </Button>
          <Button
            size={"icon"}
            variant={"outline"}
            className="h-fit p-1.5 w-fit"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight size={18} strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
};
