import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, X, Trash2 } from "lucide-react";
import HeaderText from "../components/ui/headerText";
import { Separator } from "../components/ui/separator";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { Input } from "../components/ui/input";
import Loader from "../components/ui/loader";
import ErrorBoundary from "../components/error-boundery";
import { useUser } from "../components/auth/useUser";
import { useRentalAssets } from "../components/rental/useRentalAssets";
import { useDeleteRentalAsset } from "../components/rental/useCreateEditRentalAsset";
import RentalAssetForm from "../components/rental/rental-asset-form";
import { RentalAsset } from "../lib/types";
import { SortableHeader } from "../components/table/sort-table-header";
import { PaginationControls } from "../components/table/pagination-controls";
import { SelectionBar } from "../components/table/selection-bar";
import { StatusBadge, rentalAssetStatuses } from "../components/table/status-popover";
import { formatNumberWithCommas } from "../lib/helpers";
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Checkbox } from "../components/ui/checkbox";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export default function RentalAssets() {
  const { isManager, branchId: currentBranchId } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const getBranchId = () => (isManager ? currentBranchId ?? undefined : undefined);
  const { data: assets, isLoading } = useRentalAssets(getBranchId());

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<RentalAsset | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sortStates, setSortStates] = useState<{
    [key: string]: "asc" | "desc" | null;
  }>({});

  const deleteMutation = useDeleteRentalAsset();

  // Auto-open sheet if ?add=true
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setEditAsset(null);
      setIsSheetOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = (assets || []).filter((asset: RentalAsset) => {
    const term = searchTerm.toLowerCase();
    return (
      asset.unit_name.toLowerCase().includes(term) ||
      (asset.model || "").toLowerCase().includes(term) ||
      (asset.serial_number || "").toLowerCase().includes(term) ||
      asset.status.toLowerCase().includes(term)
    );
  });

  // Sort
  const activeSort = Object.entries(sortStates).find(([, v]) => v !== null);
  const sorted = [...filtered].sort((a, b) => {
    if (!activeSort) return 0;
    const [column, direction] = activeSort;
    const aVal = a[column as keyof RentalAsset];
    const bVal = b[column as keyof RentalAsset];
    if (aVal == null || bVal == null) return 0;
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return direction === "asc" ? cmp : -cmp;
  });

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const paginated = sorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortStates({
      unit_name: null,
      model: null,
      serial_number: null,
      daily_rate: null,
      monthly_rate: null,
      [column]: direction,
    });
  };

  const toggleAll = () => {
    if (selectedIds.length === paginated.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginated.map((a) => a.id));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRowClick = (asset: RentalAsset) => {
    setEditAsset(asset);
    setIsSheetOpen(true);
  };

  const handleDelete = () => {
    Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)))
      .then(() => {
        setSelectedIds([]);
        setDeleteDialogOpen(false);
      })
      .catch((err) => toast.error(err.message));
  };

  // no-op — status uses getStatusClass

  const hasFilters = !!searchTerm;

  return (
    <div className="h-full flex flex-col">
      <HeaderText>Rental Printers</HeaderText>

      {/* Controls */}
      <div className="my-4 flex sm:flex-row flex-col sm:gap-0 gap-2 justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
              placeholder="Search printer name, model, serial..."
            />
            <div className="absolute left-3 top-2 opacity-60">
              <Search size={14} />
            </div>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              className="h-fit w-fit p-0 px-3 py-1.5 gap-1 rounded-lg"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
            >
              Reset <X size={16} strokeWidth={1.5} />
            </Button>
          )}

          <Separator orientation="vertical" className="mx-2 h-[1.5rem]" />

          <button
            className="px-4 py-1.5 text-sm bg-primaryRed hover:bg-hoveredRed text-white flex items-center rounded-lg gap-1"
            onClick={() => {
              setEditAsset(null);
              setIsSheetOpen(true);
            }}
          >
            <Plus size={18} />
            Add Printer
          </button>
        </div>
      </div>

      {/* Table */}
      <ErrorBoundary>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader />
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <TableUI>
              <TableHeader>
                <TableRow className="bg-slate-100 border-none">
                  <TableHead className="w-[3%]">
                    <Checkbox
                      checked={
                        paginated.length > 0 &&
                        selectedIds.length === paginated.length
                      }
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-[20%]">
                    <SortableHeader
                      column="unit_name"
                      sortStates={sortStates}
                      handleSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <SortableHeader
                      column="model"
                      sortStates={sortStates}
                      handleSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <SortableHeader
                      column="serial_number"
                      sortStates={sortStates}
                      handleSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[10%]">Branch</TableHead>
                  <TableHead className="w-[12%] text-right">
                    <SortableHeader
                      column="daily_rate"
                      sortStates={sortStates}
                      handleSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[12%] text-right">
                    <SortableHeader
                      column="monthly_rate"
                      sortStates={sortStates}
                      handleSort={handleSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500"
                    >
                      No rental printers found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((asset) => (
                    <TableRow
                      key={asset.id}
                      className="text-gray-500 cursor-pointer"
                      onClick={() => handleRowClick(asset)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(asset.id)}
                          onCheckedChange={() => toggleOne(asset.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-800">
                        {asset.unit_name}
                      </TableCell>
                      <TableCell>{asset.model || "—"}</TableCell>
                      <TableCell>{asset.serial_number || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={asset.status}
                          statusList={rentalAssetStatuses}
                        />
                      </TableCell>
                      <TableCell>
                        {asset.branches?.name || "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-black">
                        ₱{formatNumberWithCommas(Number(asset.daily_rate))}
                      </TableCell>
                      <TableCell className="text-right font-bold text-black">
                        ₱{formatNumberWithCommas(Number(asset.monthly_rate))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </TableUI>

            <div className="mt-auto">
              <PaginationControls
                totalItems={totalCount}
                currentPage={currentPage}
                totalPages={totalPages}
                handlePageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                handleItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
              />
            </div>

            <SelectionBar
              count={selectedIds.length}
              onClear={() => setSelectedIds([])}
            >
              <Button
                className="rounded-full bg-red-700 gap-1"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 size={14} />
                <span className="text-xs">Delete</span>
              </Button>
            </SelectionBar>
          </div>
        )}
      </ErrorBoundary>

      {/* Add/Edit Sheet */}
      <Sheet
        open={isSheetOpen}
        onOpenChange={(v) => {
          setIsSheetOpen(v);
          if (!v) setEditAsset(null);
        }}
      >
        <SheetContent className="min-w-[35vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold">
              {editAsset ? "Edit Printer" : "Add Rental Printer"}
            </SheetTitle>
            <Separator className="my-2" />
            <RentalAssetForm
              editAsset={editAsset}
              onSuccess={() => {
                setIsSheetOpen(false);
                setEditAsset(null);
              }}
            />
          </SheetHeader>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Printer(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.length} printer(s). Active
              rentals on these printers will prevent deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
