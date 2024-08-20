/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { ChevronDown, Trash2, X } from "lucide-react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table as TableUI,
} from "../ui/table";
import { SortableHeader } from "../table/sort-table-header";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { PaginationControls } from "../table/pagination-controls";
import { Checkbox } from "../ui/checkbox";
import { MaterialStocks } from "../../lib/types";
import MaterialCollapsibleForm from "./material-collapsible-form";
import { formatNumberWithCommas } from "../../lib/helpers";
import { Button } from "../ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMaterialStock } from "../../services/apiMaterials";
import toast from "react-hot-toast";
import { ConfirmDialog } from "../table/alert-dialog";

export default function MaterialsTable({
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
}: {
  data: any[];
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
}) {
  const [materials, setMaterials] = useState(data);
  const [sortStates, setSortStates] = useState<{
    [key: string]: "asc" | "desc" | null;
  }>({
    sku: null,
    category: null,
  });
  const queryClient = useQueryClient();

  const { mutate: mutateDeleteMaterial, isPending: isDeleting } = useMutation({
    mutationFn: (ids: number[]) => deleteMaterialStock(ids),
  });

  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const [openCollapsibleIndex, setOpenCollapsibleIndex] = useState<
    number | null
  >(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);

  useEffect(() => {
    setOpenCollapsibleIndex(null);
  }, [currentPage, itemsPerPage, selectedRows, data, currentSort]);

  const handleSort = (column: string, direction: "asc" | "desc") => {
    handleSortChange(column, direction);
    setSortStates({
      sku: null,
      category: null,
      [column]: direction,
    });
  };

  const handleRowSelection = (id: number) => {
    setSelectedRows((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((rowId) => rowId !== id)
        : [...prevSelected, id]
    );
  };

  const handleSelectAllRows = () => {
    if (selectedRows.length === materials.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(materials.map((material) => material.id));
    }
  };

  const handleDeleteSelectedRows = () => {
    if (selectedRows.length === 0) return;
    setDeleteIds(selectedRows);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteIds.length === 0) return;

    mutateDeleteMaterial(deleteIds, {
      onSuccess: () => {
        toast.success("Material(s) deleted successfully");
        queryClient.invalidateQueries({
          queryKey: ["materialStocks"],
        });
        setSelectedRows([]);
        setDeleteIds([]);
        setConfirmDialogOpen(false);
      },
      onError: (error) => {
        toast.error("An error occurred while deleting the Material(s)");
        console.error(error);
        setConfirmDialogOpen(false);
      },
    });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const isRowSelected = (id: number) => selectedRows.includes(id);
  const areAllRowsSelected = selectedRows.length === materials.length;

  useEffect(() => {
    setMaterials(data);
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

  useEffect(() => {
    if (selectedRows.length > 0) {
      setShowNotification(true);
      setAnimationClass("slideUp");
    } else if (showNotification) {
      setAnimationClass("slideDown");
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 200); // Duration of the slide-down animation
      return () => clearTimeout(timer);
    }
  }, [selectedRows.length]);

  return (
    <>
      {showNotification && (
        <div className="w-full flex items-center justify-center h-0">
          <div
            className={`w-fit text-sm bg-slate-800 py-3 px-5 text-white rounded-full absolute bottom-4 flex items-center justify-between ${animationClass} z-50`}
            style={{
              animation: `${animationClass} 0.2s ease-out forwards`,
            }}
          >
            <div className="flex items-center gap-4">
              <X
                size={16}
                strokeWidth={1.5}
                className="cursor-pointer hover:text-slate-200"
                onClick={() => setSelectedRows([])}
              />
              <p className="flex items-center gap-2">
                <span className="p-1 bg-slate-700 size-6 flex items-center justify-center rounded-full">
                  {selectedRows.length}
                </span>
                row(s) selected
              </p>
            </div>
            <div className="flex gap-2 ml-24">
              <Button
                className="rounded-full bg-red-700 gap-1"
                onClick={handleDeleteSelectedRows}
                disabled={isDeleting}
              >
                <Trash2 size={18} strokeWidth={1.5} />
                {selectedRows.length > 1 ? "Delete Selected" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="h-[calc(100%-6.5rem)] flex flex-col justify-between">
        <TableUI>
          <TableHeader>
            <TableRow className="bg-slate-100 border-none">
              <TableHead className="w-[3%]">
                <Checkbox
                  checked={areAllRowsSelected}
                  onCheckedChange={handleSelectAllRows}
                />
              </TableHead>
              {visibleColumns.includes("sku") && (
                <TableHead className="w-[10%]">
                  <SortableHeader
                    column="sku"
                    sortStates={sortStates}
                    handleSort={handleSort}
                    handleColumnVisibilityChange={handleColumnVisibilityChange}
                  />
                </TableHead>
              )}
              <TableHead className="w-[20%]">Name</TableHead>
              {visibleColumns.includes("category") && (
                <TableHead className="w-[15%]">
                  <SortableHeader
                    column="category"
                    sortStates={sortStates}
                    handleSort={handleSort}
                    handleColumnVisibilityChange={handleColumnVisibilityChange}
                  />
                </TableHead>
              )}
              <TableHead className="w-[10%]">
                <SortableHeader
                  column="price"
                  sortStates={sortStates}
                  handleSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[10%]">
                <SortableHeader
                  column="stocks"
                  sortStates={sortStates}
                  handleSort={handleSort}
                />
              </TableHead>
              {visibleColumns.includes("last_in") && (
                <TableHead className="w-[15%]">
                  <SortableHeader
                    column="last_in"
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
            {materials.map((material: MaterialStocks, index) => {
              const isOpen = openCollapsibleIndex === index;
              return (
                <Collapsible
                  key={material.id}
                  asChild
                  open={isOpen}
                  onOpenChange={(isOpen) => {
                    setOpenCollapsibleIndex(isOpen ? index : null);
                  }}
                >
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow
                        key={material.id}
                        className={`cursor-pointer ${
                          isOpen ? "border-b-0 border-x border-t" : ""
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isRowSelected(material.id)}
                            onCheckedChange={() =>
                              handleRowSelection(material.id)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        {visibleColumns.includes("sku") && (
                          <TableCell className="font-bold text-black">
                            {material.sku}
                          </TableCell>
                        )}
                        <TableCell className="font-bold flex gap-2 items-center text-black py-4">
                          {material.material_name}
                        </TableCell>
                        {visibleColumns.includes("category") && (
                          <TableCell>{material.category}</TableCell>
                        )}

                        <TableCell>
                          ₱{formatNumberWithCommas(material.price)}
                        </TableCell>
                        <TableCell>
                          {material.stocks > 0
                            ? material.stocks
                            : "Out of Stock"}
                        </TableCell>
                        {visibleColumns.includes("last_in") && (
                          <TableCell>
                            {new Date(
                              material.last_stocks_added
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              timeZone: "Asia/Singapore",
                            })}
                          </TableCell>
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
                      <MaterialCollapsibleForm
                        visibleColumns={visibleColumns}
                        material={material}
                        onClose={() => setOpenCollapsibleIndex(null)}
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
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={confirmDelete}
        message="Deleting this material will permanently erase all associated records, including its stock levels. This action cannot be undone. Are you absolutely sure you want to proceed?"
        destructive
        isPending={isDeleting}
      />
    </>
  );
}
