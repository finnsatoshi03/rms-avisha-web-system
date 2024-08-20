import { useEffect, useState } from "react";
import { Expenses } from "../../lib/types";
import { deleteExepense, duplicateExpense } from "../../services/apiExpenses";
import { formatNumberWithCommas } from "../../lib/helpers";

import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./../ui/table";
import { Checkbox } from "../ui/checkbox";
import { SortableHeader } from "../table/sort-table-header";
import { PaginationControls } from "../table/pagination-controls";
import { EllipsisDropdown } from "../table/ellipsis-dropdown";
import { ConfirmDialog } from "../table/alert-dialog";
import { Trash2, X } from "lucide-react";
import { Button } from "../ui/button";

export default function Table({
  data,
  //   resetFilters,
  currentPage,
  itemsPerPage,
  totalItems,
  handlePageChange,
  handleItemsPerPageChange,
  handleSortChange,
  currentSort,
  onOpen,
  onExpenseSelect,
}: {
  data: Expenses[];
  //   resetFilters: () => void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  handlePageChange: (page: number) => void;
  handleItemsPerPageChange: (items: number) => void;
  handleSortChange: (column: string, direction: "asc" | "desc") => void;
  currentSort: { key: string; direction: "asc" | "desc" }[];
  onOpen: () => void;
  onExpenseSelect: (expense: Expenses) => void;
}) {
  const queryClient = useQueryClient();

  const { mutate: deleteExpenseMutation, isPending: isDeleting } = useMutation({
    mutationFn: (ids: number[]) => deleteExepense(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Billing Expense deleted successfully!");
      setSelectedRows([]);
      setDeleteIds([]);
    },
    onError: (error) => {
      toast.error("An error occurred. Please try again.");
      console.error(error);
      setConfirmDialogOpen(false);
    },
  });

  const { mutate: duplicateExpenseMutation, isPending: isDuplicating } =
    useMutation({
      mutationFn: (id: number) => duplicateExpense(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        toast.success("Billing Expense duplicated successfully!");
      },
      onError: (error) => {
        toast.error("An error occurred. Please try again.");
        console.error(error);
      },
    });

  const [expenses, setExpenses] = useState(data);
  const [sortStates, setSortStates] = useState<{
    [key: string]: "asc" | "desc" | null;
  }>({
    created_at: null,
    bill_name: null,
    amount: null,
  });
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleSort = (column: string, direction: "asc" | "desc") => {
    handleSortChange(column, direction);
    setSortStates({
      date: null,
      bill_name: null,
      amount: null,
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
    if (selectedRows.length === expenses.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(expenses.map((expense) => expense.id));
    }
  };

  const isRowSelected = (id: number) => selectedRows.includes(id);
  const areAllRowsSelected = selectedRows.length === expenses.length;

  const handleDeleteSelectedRows = () => {
    if (selectedRows.length === 0) return;
    setDeleteIds(selectedRows);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    setConfirmDialogOpen(false);
    deleteExpenseMutation(deleteIds);
  };

  // elipsis dropdown
  const handleEditClick = (id: number) => {
    const selectedExpense = expenses.find((expense) => expense.id === id);
    onOpen();
    onExpenseSelect(selectedExpense ? selectedExpense : expenses[0]);
  };

  const handleDuplicateClick = (id: number) => {
    duplicateExpenseMutation(id);
  };

  const handleDeleteRow = (id: number) => {
    deleteExpenseMutation([id]);
  };

  useEffect(() => {
    setExpenses(data);
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
  // const currentExpense = expenses.find(
  //   (expense) => expense.id === currentEditId
  // );

  return (
    <div className="h-[93vh]">
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
              <TableHead className="w-[13%]">
                <SortableHeader
                  column="created_at"
                  sortStates={sortStates}
                  handleSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[20%]">
                <SortableHeader
                  column="bill_name"
                  sortStates={sortStates}
                  handleSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[10%]">
                <SortableHeader
                  column="amount"
                  sortStates={sortStates}
                  handleSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[3%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense: Expenses) => {
              return (
                <TableRow
                  key={expense.id}
                  className="text-gray-500 cursor-pointer"
                  //   onClick={() => handleRowClick(order)}
                >
                  <TableCell>
                    <Checkbox
                      checked={isRowSelected(expense.id)}
                      onCheckedChange={() => handleRowSelection(expense.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(expense.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "Asia/Singapore",
                    })}
                  </TableCell>
                  <TableCell>{expense.bill_name}</TableCell>
                  <TableCell className="text-red-500 font-semibold">
                    -₱{formatNumberWithCommas(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <EllipsisDropdown
                      // onViewClick={() => handleRowClick(expense)}
                      onEditClick={() => handleEditClick(expense.id)}
                      onDuplicateClick={() => handleDuplicateClick(expense.id)}
                      onDeleteClick={() => handleDeleteRow(expense.id)}
                      isDuplicating={isDuplicating}
                      isDeleting={isDeleting}
                    />
                  </TableCell>{" "}
                </TableRow>
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
    </div>
  );
}
