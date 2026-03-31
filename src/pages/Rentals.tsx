import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, X, Printer, CircleAlert } from "lucide-react";
import HeaderText from "../components/ui/headerText";
import { Separator } from "../components/ui/separator";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { Input } from "../components/ui/input";
import Loader from "../components/ui/loader";
import ErrorBoundary from "../components/error-boundery";
import { useUser } from "../components/auth/useUser";
import { useRentals } from "../components/rental/useRentals";
import RentalForm from "../components/rental/rental-form";
import RentalTable from "../components/rental/rental-table";
import RentalDetailSheet from "../components/rental/rental-detail-sheet";
import RentalPaymentDialog from "../components/rental/rental-payment-dialog";
import { RentalData, RentalStatus } from "../lib/types";
import { deleteRentals } from "../services/apiRentals";
import {
  applySourcePayment,
  deleteReceiptFile,
  recalculateLinkedSourceBilling,
  updateSourceReceipt,
  uploadReceiptFile,
} from "../services/apiBilling";
import { useRentalStatusUpdate } from "../components/rental/useRentalStatusUpdate";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import RentalPDF from "../components/rental/rental-pdf";
import PrintOptionsDialog from "../components/job-order/print-option-dialog";
import { formatNumberWithCommas, getStatusClass } from "../lib/helpers";
import debounce from "lodash/debounce";
import toast from "react-hot-toast";
import { useFeatureOnboarding } from "../components/onboarding/useFeatureOnboarding";
import FeatureAnnouncementModal from "../components/onboarding/feature-announcement-modal";
import GuidedTour from "../components/onboarding/guided-tour";
import TourReplayButton from "../components/onboarding/tour-replay-button";
import { isManagerReauthPasswordValid } from "../components/auth/manager-auth";
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
import BillingImpactConfirmDialog from "../components/billing/billing-impact-confirm-dialog";
import { getBillingSyncSnapshot, isBillingLinkedSource } from "../lib/billing-sync";

const allStatuses: { label: string; value: RentalStatus }[] = [
  { label: "Created", value: "Created" },
  { label: "Released", value: "Released" },
  { label: "Ongoing", value: "Ongoing" },
  { label: "Returned", value: "Returned" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

function getStatusBadgeClass(status: string, isSelected: boolean) {
  const baseClass =
    "px-3 py-0.5 rounded-full text-xs font-bold cursor-pointer truncate transition-all duration-200";
  const statusClass = getStatusClass(status);
  return `${baseClass} ${statusClass} ${isSelected ? "ring-2 ring-offset-2" : ""}`;
}

function getRentalAmountDue(rental: RentalData | null): number {
  if (!rental) return 0;

  const billingSync = getBillingSyncSnapshot(rental.payment_details);
  const mirroredRemaining = billingSync?.remaining_balance;
  if (typeof mirroredRemaining === "number" && Number.isFinite(mirroredRemaining)) {
    return Math.max(mirroredRemaining, 0);
  }

  return Math.max(
    Number(rental.grand_total || 0) - Number(rental.downpayment || 0),
    0
  );
}

export default function Rentals() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    isAdmin,
    isManager,
    branchId: currentBranchId,
  } = useUser();
  const allowManagerLinkedDeletion = false;
  const canDeleteBillingLinkedRecords =
    isAdmin || (allowManagerLinkedDeletion && isManager);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>(
    []
  );
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [sortStates, setSortStates] = useState<{
    [key: string]: "asc" | "desc" | null;
  }>({});
  const [isRentalSheetOpen, setIsRentalSheetOpen] = useState(false);
  const [createTourReplay, setCreateTourReplay] = useState<(() => void) | null>(
    null
  );
  const [selectedRental, setSelectedRental] = useState<RentalData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkedDeleteWarningOpen, setLinkedDeleteWarningOpen] = useState(false);
  const [linkedDeleteAuthOpen, setLinkedDeleteAuthOpen] = useState(false);
  const [linkedDeleteRentals, setLinkedDeleteRentals] = useState<RentalData[]>([]);
  const [linkedDeletePassword, setLinkedDeletePassword] = useState("");
  const [linkedDeleteAuthError, setLinkedDeleteAuthError] = useState<string | null>(
    null
  );
  const [isLinkedDeleteSubmitting, setIsLinkedDeleteSubmitting] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printRentalNo, setPrintRentalNo] = useState<string | null>(null);
  const [printRentalId, setPrintRentalId] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [postPrintReceiptPromptOpen, setPostPrintReceiptPromptOpen] =
    useState(false);
  const [isUploadingPostPrintReceipt, setIsUploadingPostPrintReceipt] =
    useState(false);
  const postPrintReceiptInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkPaymentOpen, setBulkPaymentOpen] = useState(false);
  const [rentalToComplete, setRentalToComplete] = useState<RentalData | null>(
    null
  );
  const [billingImpactDialogOpen, setBillingImpactDialogOpen] = useState(false);
  const [billingImpactPending, setBillingImpactPending] = useState(false);
  const [billingImpactRentals, setBillingImpactRentals] = useState<RentalData[]>(
    []
  );
  const [billingImpactAction, setBillingImpactAction] = useState<
    (() => Promise<void>) | null
  >(null);

  const {
    showAnnouncement,
    showTour,
    onboardingData,
    startTour,
    completeTour,
    replayTour,
  } = useFeatureOnboarding("rental_management");

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setDebouncedSearchTerm(term);
      setIsSearching(false);
    }, 500),
    []
  );

  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
    }
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  const getBranchId = () => (isManager ? currentBranchId ?? null : null);

  const { data, isLoading, isFetching } = useRentals({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedSearchTerm,
    branchId: getBranchId(),
    statusFilters: selectedStatusFilters,
    showOverdueOnly,
  });

  const rentals = (data?.data || []) as RentalData[];
  const totalCount = data?.meta?.totalCount || 0;

  // Keep selectedRental in sync with latest query data
  useEffect(() => {
    if (selectedRental && rentals.length > 0) {
      const updated = rentals.find((r) => r.id === selectedRental.id);
      if (updated) setSelectedRental(updated);
    }
  }, [rentals]);

  const statusMutation = useRentalStatusUpdate();

  const isRentalBillingLinked = (rental: RentalData) =>
    isBillingLinkedSource({
      sourceType: "rental",
      sourceId: rental.id,
      transferredToBilling: rental.transferred_to_billing,
      paymentDetails: rental.payment_details,
    });

  const openBillingImpactGuard = (
    rentalsToRecalculate: RentalData[],
    action: () => Promise<void>
  ) => {
    if (rentalsToRecalculate.length === 0) {
      void action();
      return;
    }

    setBillingImpactRentals(rentalsToRecalculate);
    setBillingImpactAction(() => action);
    setBillingImpactDialogOpen(true);
  };

  const handleBillingImpactProceed = async () => {
    if (!billingImpactAction) return;

    setBillingImpactPending(true);
    try {
      for (const rental of billingImpactRentals) {
        await recalculateLinkedSourceBilling("rental", rental.id, {
          reason: "Manual rental status/edit flow recalculation",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });

      await billingImpactAction();
      toast.success(
        "Billing has been updated based on your changes. Previous payments were adjusted."
      );
      setBillingImpactDialogOpen(false);
      setBillingImpactRentals([]);
      setBillingImpactAction(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to recalculate linked billing record."
      );
    } finally {
      setBillingImpactPending(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteRentals(ids),
  });

  const resetLinkedDeleteState = () => {
    setLinkedDeleteWarningOpen(false);
    setLinkedDeleteAuthOpen(false);
    setLinkedDeleteRentals([]);
    setLinkedDeletePassword("");
    setLinkedDeleteAuthError(null);
  };

  const finalizeDeleteSuccess = (ids: number[], successMessage: string) => {
    toast.success(successMessage);
    queryClient.invalidateQueries({ queryKey: ["rentals"] });
    queryClient.invalidateQueries({ queryKey: ["rental_assets"] });
    queryClient.invalidateQueries({ queryKey: ["archive"] });
    setSelectedIds((prevIds) => prevIds.filter((id) => !ids.includes(id)));
    setDeleteDialogOpen(false);
    resetLinkedDeleteState();
  };

  const finalizeDeleteError = (error: unknown, fallbackMessage: string) => {
    const message =
      error instanceof Error && error.message ? error.message : fallbackMessage;
    toast.error(message);
    console.error(error);
  };

  const archiveRentalsAction = async (
    ids: number[],
    messages: { success: string }
  ) => {
    await deleteMutation.mutateAsync(ids);
    finalizeDeleteSuccess(ids, messages.success);
  };

  const openDeleteFlow = (ids: number[]) => {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;

    setSelectedIds(uniqueIds);

    const linkedRentalsToDelete = rentals.filter(
      (rental) => uniqueIds.includes(rental.id) && isRentalBillingLinked(rental)
    );

    if (linkedRentalsToDelete.length > 0) {
      setDeleteDialogOpen(false);
      setLinkedDeleteRentals(linkedRentalsToDelete);
      setLinkedDeletePassword("");
      setLinkedDeleteAuthError(null);
      setLinkedDeleteWarningOpen(true);
      return;
    }

    setDeleteDialogOpen(true);
  };

  const handleLinkedDeleteAuthorization = async () => {
    if (selectedIds.length === 0) return;

    if (!canDeleteBillingLinkedRecords) {
      setLinkedDeleteAuthError(
        "Only admin/dev accounts can delete billing-linked records."
      );
      return;
    }

    if (!isManagerReauthPasswordValid(linkedDeletePassword)) {
      setLinkedDeleteAuthError("Incorrect manager password.");
      return;
    }

    setIsLinkedDeleteSubmitting(true);
    setLinkedDeleteAuthError(null);

    try {
      for (const rental of linkedDeleteRentals) {
        await recalculateLinkedSourceBilling("rental", rental.id, {
          reason: "Billing-linked rental archived by authorized user",
        });
      }

      await archiveRentalsAction(selectedIds, {
        success: "Record deleted. Payments reverted and Billing updated.",
      });

      queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["billing_payments"] });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to archive billing-linked rental(s).";
      setLinkedDeleteAuthError(message);
      finalizeDeleteError(error, message);
    } finally {
      setIsLinkedDeleteSubmitting(false);
    }
  };

  const handleStatusFilterClick = (status: string) => {
    setSelectedStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  };

  const resetFiltersAndSort = () => {
    setSelectedStatusFilters([]);
    setShowOverdueOnly(false);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSortStates({});
    setCurrentPage(1);
  };

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortStates({
      rental_no: null,
      status: null,
      start_date: null,
      due_date: null,
      grand_total: null,
      [column]: direction,
    });
  };

  const handleRowClick = (rental: RentalData) => {
    setSelectedRental(rental);
    setDetailOpen(true);
  };

  const performStatusChange = async (ids: number[], status: string) => {
    if (status === "Completed") {
      if (ids.length !== 1) {
        toast.error(
          "Bulk completion is not allowed. Please complete rentals individually to process payment."
        );
        return;
      }

      const selectedRental = rentals.find((r) => r.id === ids[0]);
      if (!selectedRental) {
        toast.error("Selected rental not found.");
        return;
      }

      if (getRentalAmountDue(selectedRental) <= 0) {
        await statusMutation.mutateAsync({
          ids: [selectedRental.id],
          status: "Completed",
        });
        setSelectedIds([]);
        return;
      }

      setRentalToComplete(selectedRental);
      setBulkPaymentOpen(true);
      return;
    }

    await statusMutation.mutateAsync({ ids, status });
    setSelectedIds([]);
  };

  const handleStatusChange = (ids: number[], status: string) => {
    const rentalsToUpdate = rentals.filter((rental) => ids.includes(rental.id));
    const linkedRentals = rentalsToUpdate.filter(
      (rental) =>
        rental.status === "Completed" &&
        status !== rental.status &&
        isRentalBillingLinked(rental)
    );

    if (linkedRentals.length > 0) {
      openBillingImpactGuard(linkedRentals, () =>
        performStatusChange(ids, status)
      );
      return;
    }

    void performStatusChange(ids, status);
  };

  const handleBulkPaymentSubmit = async (
    payments: Record<string, number>,
    receiptFile?: File | null
  ) => {
    if (!rentalToComplete) {
      throw new Error("No rental selected for payment.");
    }

    const totalPayment = Object.values(payments).reduce(
      (sum, amount) => sum + amount,
      0
    );
    const amountDue = getRentalAmountDue(rentalToComplete);
    if (Math.abs(totalPayment - amountDue) > 0.01) {
      throw new Error(
        `The total payment amount (${totalPayment}) does not match the rental total (${amountDue}).`
      );
    }

    let uploadedReceiptPath: string | null = null;
    try {
      if (receiptFile) {
        uploadedReceiptPath = await uploadReceiptFile({
          sourceType: "rental",
          sourceId: rentalToComplete.id,
          file: receiptFile,
        });
      }

      await applySourcePayment("rental", rentalToComplete.id, payments, {
        receiptUrl: uploadedReceiptPath,
      });
      await statusMutation.mutateAsync({
        ids: [rentalToComplete.id],
        status: "Completed",
      });
      queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      setSelectedIds([]);
      setBulkPaymentOpen(false);
      setRentalToComplete(null);
    } catch (error) {
      if (uploadedReceiptPath) {
        try {
          await deleteReceiptFile(uploadedReceiptPath);
        } catch (deleteError) {
          console.error("Failed to rollback receipt upload", deleteError);
        }
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to process rental payment."
      );
      throw error;
    }
  };

  const handleEdit = (rental: RentalData) => {
    setSelectedRental(rental);
    setDetailOpen(true);
  };

  const handleCreateReplayReady = useCallback(
    (replay: (() => void) | null) => {
      setCreateTourReplay(() => replay);
    },
    []
  );

  const handleExportPdf = async (rental: RentalData) => {
    try {
      const blob = await pdf(<RentalPDF rental={rental} />).toBlob();
      saveAs(blob, `Rental-${rental.rental_no}.pdf`);
      toast.success("PDF exported");
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  const handlePrintAfterCreate = async () => {
    if (!printRentalNo) return;
    setIsPrinting(true);
    let didExport = false;
    try {
      // Find the newly created rental from the query data
      const rental = rentals.find((r) => r.rental_no === printRentalNo);
      if (rental) {
        const blob = await pdf(<RentalPDF rental={rental} />).toBlob();
        saveAs(blob, `Rental-${rental.rental_no}.pdf`);
        toast.success("PDF exported");
        didExport = true;
      } else {
        toast.error("Rental not found yet — try exporting from the table.");
      }
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsPrinting(false);
      setPrintDialogOpen(false);
      setPrintRentalNo(null);
      if (didExport && printRentalId) {
        setPostPrintReceiptPromptOpen(true);
      } else if (!didExport) {
        setPrintRentalId(null);
      }
    }
  };

  const clearPostPrintReceiptPrompt = () => {
    setPostPrintReceiptPromptOpen(false);
    setPrintRentalId(null);
    if (postPrintReceiptInputRef.current) {
      postPrintReceiptInputRef.current.value = "";
    }
  };

  const handlePostPrintReceiptUpload = async (file: File | null) => {
    if (!file || !printRentalId) return;

    let uploadedReceiptPath: string | null = null;
    setIsUploadingPostPrintReceipt(true);
    try {
      uploadedReceiptPath = await uploadReceiptFile({
        sourceType: "rental",
        sourceId: printRentalId,
        file,
      });

      await updateSourceReceipt("rental", printRentalId, uploadedReceiptPath);
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({
        queryKey: ["source_latest_receipt", "rental", printRentalId],
      });
      queryClient.invalidateQueries({
        queryKey: ["source_receipt_stats", "rental", printRentalId],
      });
      toast.success("Receipt attached to rental.");
      clearPostPrintReceiptPrompt();
    } catch (error) {
      if (uploadedReceiptPath) {
        try {
          await deleteReceiptFile(uploadedReceiptPath);
        } catch (deleteError) {
          console.error("Failed to rollback post-print receipt upload", deleteError);
        }
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to upload receipt."
      );
    } finally {
      setIsUploadingPostPrintReceipt(false);
      if (postPrintReceiptInputRef.current) {
        postPrintReceiptInputRef.current.value = "";
      }
    }
  };

  const hasFilters =
    searchTerm ||
    selectedStatusFilters.length > 0 ||
    showOverdueOnly;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2">
        <HeaderText>Rentals</HeaderText>
        <TourReplayButton onClick={replayTour} label="How to manage rentals" />
      </div>

      {/* Top Controls — mirrors JobOrders layout */}
      <div className="my-4 flex sm:flex-row flex-col sm:gap-0 gap-2 justify-between">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative" data-tour="rentals-search">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
              placeholder="Search rental no, client, status, etc."
            />
            <div className="absolute left-3 top-2 opacity-60">
              {isSearching || isFetching ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
              ) : (
                <Search size={14} />
              )}
            </div>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              className="h-fit w-fit p-0 px-3 py-1.5 gap-1 rounded-lg"
              onClick={resetFiltersAndSort}
            >
              Reset <X size={16} strokeWidth={1.5} />
            </Button>
          )}

          <Separator orientation="vertical" className="mx-2 h-[1.5rem]" />

          {/* Add Rental Sheet */}
          <Sheet
            open={isRentalSheetOpen}
            onOpenChange={(open) => {
              setIsRentalSheetOpen(open);
              if (!open) setCreateTourReplay(null);
            }}
          >
            <SheetTrigger asChild>
              <button
                className="px-4 py-1.5 text-sm bg-primaryRed hover:bg-hoveredRed text-white flex items-center rounded-lg gap-1"
                data-tour="rentals-add"
                onClick={() => setCreateTourReplay(null)}
              >
                <Plus size={18} />
                Add
              </button>
            </SheetTrigger>
            <SheetContent className="min-w-[50vw] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-bold flex items-center gap-2">
                  <span>Create New Rental</span>
                  {createTourReplay && (
                    <TourReplayButton
                      onClick={createTourReplay}
                      label="How to create a rental"
                    />
                  )}
                </SheetTitle>
                <Separator className="my-2" />
                <RentalForm
                  onSuccess={(rentalData) => {
                    setIsRentalSheetOpen(false);
                    setCreateTourReplay(null);
                    if (rentalData?.rental_no) {
                      setPrintRentalNo(rentalData.rental_no);
                      setPrintRentalId(rentalData.rental_id);
                      setPrintDialogOpen(true);
                    }
                  }}
                  onReplayReady={handleCreateReplayReady}
                />
              </SheetHeader>
            </SheetContent>
          </Sheet>

          {/* Add Printer — navigates to Rental Assets page */}
          <button
            className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center rounded-lg gap-1 border border-gray-300"
            data-tour="rentals-add-printer"
            onClick={() => navigate("/rental-assets?add=true")}
          >
            <Printer size={16} />
            Add Printer
          </button>
        </div>
      </div>

      {/* Status Filter Badges — mirrors JobOrders pattern */}
      <div className="flex flex-wrap mb-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Overdue Filter */}
          <button
            data-tour="rentals-overdue-filter"
            onClick={() => {
              setShowOverdueOnly(!showOverdueOnly);
              setCurrentPage(1);
            }}
            className={`px-3 py-0.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
              showOverdueOnly
                ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <CircleAlert size={14} strokeWidth={1.5} />
            Overdue
            {showOverdueOnly && <X size={12} />}
          </button>

          <div className="flex flex-wrap gap-2 items-center" data-tour="rentals-status-filters">
            {allStatuses.map((status) => (
              <button
                key={status.value}
                onClick={() => handleStatusFilterClick(status.value)}
                className={getStatusBadgeClass(
                  status.value,
                  selectedStatusFilters.includes(status.value)
                )}
              >
                {status.label}
              </button>
            ))}

            {selectedStatusFilters.length > 0 && (
              <button
                onClick={() => setSelectedStatusFilters([])}
                className="px-3 py-0.5 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 transition-all duration-200 flex items-center gap-1"
              >
                Clear Filters
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Active filters indicator */}
        {(selectedStatusFilters.length > 0 || showOverdueOnly) && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            <div className="flex flex-wrap gap-2">
              {showOverdueOnly && (
                <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 flex items-center gap-1">
                  <CircleAlert size={12} />
                  <span>Overdue</span>
                  <button
                    onClick={() => setShowOverdueOnly(false)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {selectedStatusFilters.map((status) => {
                const statusObj = allStatuses.find((s) => s.value === status);
                return (
                  <div
                    key={status}
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 flex items-center gap-1"
                  >
                    <span>{statusObj?.label || status}</span>
                    <button
                      onClick={() => handleStatusFilterClick(status)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <ErrorBoundary>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader />
          </div>
        ) : (
        <RentalTable
          data-tour="rentals-table"
          className="flex-1"
          rentals={rentals}
          totalCount={totalCount}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(items) => {
            setItemsPerPage(items);
            setCurrentPage(1);
          }}
          onRowClick={handleRowClick}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortStates={sortStates}
          onSort={handleSort}
          onExportPdf={handleExportPdf}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={(ids) => {
            openDeleteFlow(ids);
          }}
        />
        )}
      </ErrorBoundary>

      {/* Detail Sheet */}
      <RentalDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        rental={selectedRental}
      />
      <RentalPaymentDialog
        open={bulkPaymentOpen}
        onClose={() => {
          setBulkPaymentOpen(false);
          setRentalToComplete(null);
        }}
        onSubmit={handleBulkPaymentSubmit}
        totalAmount={getRentalAmountDue(rentalToComplete)}
        rentalNo={rentalToComplete?.rental_no || ""}
        isBillingLinked={
          rentalToComplete ? isRentalBillingLinked(rentalToComplete) : false
        }
      />
      <BillingImpactConfirmDialog
        open={billingImpactDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (billingImpactPending) return;
            setBillingImpactDialogOpen(false);
            setBillingImpactRentals([]);
            setBillingImpactAction(null);
            return;
          }
          setBillingImpactDialogOpen(open);
        }}
        onProceed={handleBillingImpactProceed}
        isPending={billingImpactPending}
      />

      <AlertDialog
        open={linkedDeleteWarningOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (isLinkedDeleteSubmitting) return;
            resetLinkedDeleteState();
            setSelectedIds([]);
            return;
          }
          setLinkedDeleteWarningOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              This record is linked to a Billing Account
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Deleting this record will:</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Revert any payments applied to this transaction</li>
                  <li>Update the billing account balance</li>
                  <li>Potentially invalidate previously sent email statements</li>
                </ul>
                <p className="text-sm font-medium text-foreground">
                  This action affects financial records and cannot be undone.
                </p>
                {linkedDeleteRentals.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {linkedDeleteRentals.length} billing-linked rental(s)
                    selected.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetLinkedDeleteState();
                setSelectedIds([]);
              }}
              disabled={isLinkedDeleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setLinkedDeleteWarningOpen(false);
                setLinkedDeleteAuthOpen(true);
                setLinkedDeleteAuthError(null);
              }}
              disabled={isLinkedDeleteSubmitting}
            >
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={linkedDeleteAuthOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (isLinkedDeleteSubmitting) return;
            resetLinkedDeleteState();
            setSelectedIds([]);
            return;
          }
          setLinkedDeleteAuthOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manager Authorization Required</AlertDialogTitle>
            <AlertDialogDescription>
              Enter manager/admin credentials to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Input
              type="password"
              value={linkedDeletePassword}
              onChange={(event) => {
                setLinkedDeletePassword(event.target.value);
                if (linkedDeleteAuthError) {
                  setLinkedDeleteAuthError(null);
                }
              }}
              placeholder="Enter manager password"
              disabled={isLinkedDeleteSubmitting}
            />
            {linkedDeleteAuthError && (
              <p className="text-xs text-red-600">{linkedDeleteAuthError}</p>
            )}
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetLinkedDeleteState();
                setSelectedIds([]);
              }}
              disabled={isLinkedDeleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleLinkedDeleteAuthorization();
              }}
              disabled={isLinkedDeleteSubmitting}
            >
              {isLinkedDeleteSubmitting ? "Confirming..." : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Onboarding */}
      <FeatureAnnouncementModal
        open={showAnnouncement}
        onboarding={onboardingData}
        onStartTour={startTour}
      />
      <GuidedTour
        featureKey="rental_management"
        active={showTour}
        onComplete={completeTour}
      />

      {/* Archive Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedIds.length} Rental{selectedIds.length > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>These rentals will be moved to Archive:</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Rental record(s) remain recoverable from the Archive module</li>
                  <li>Billing links and historical amounts stay intact</li>
                  <li>Printer(s) will be set back to <span className="font-semibold text-green-700">Available</span></li>
                </ul>

                {/* Show details of rentals being archived */}
                <div className="border rounded-lg overflow-hidden mt-2">
                  {selectedIds.map((id) => {
                    const r = rentals.find((rental) => rental.id === id);
                    if (!r) return null;
                    return (
                      <div key={id} className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-b-0 bg-muted/30">
                        <div>
                          <span className="font-semibold text-foreground">{r.rental_no}</span>
                          <span className="mx-2 text-muted-foreground">—</span>
                          <span>{r.clients?.name || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{r.rental_assets?.unit_name || "—"}</span>
                          <span className="font-medium text-foreground">₱{formatNumberWithCommas(Number(r.grand_total))}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void archiveRentalsAction(selectedIds, {
                  success: "Rental(s) archived",
                }).catch((error) =>
                  finalizeDeleteError(error, "Failed to archive rental(s).")
                );
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Dialog after create */}
      <PrintOptionsDialog
        open={printDialogOpen}
        onClose={() => {
          setPrintDialogOpen(false);
          setPrintRentalNo(null);
          setPrintRentalId(null);
        }}
        onSelectOption={() => handlePrintAfterCreate()}
        loading={isPrinting}
      />
      <AlertDialog
        open={postPrintReceiptPromptOpen}
        onOpenChange={(open) => {
          setPostPrintReceiptPromptOpen(open);
          if (!open) {
            clearPostPrintReceiptPrompt();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attach Receipt or Document</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to attach a receipt or supporting document now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                clearPostPrintReceiptPrompt();
              }}
            >
              Skip
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={() => postPrintReceiptInputRef.current?.click()}
              disabled={isUploadingPostPrintReceipt}
            >
              {isUploadingPostPrintReceipt ? "Uploading..." : "Upload"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <input
        ref={postPrintReceiptInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,application/pdf"
        disabled={isUploadingPostPrintReceipt}
        onChange={(event) =>
          void handlePostPrintReceiptUpload(event.target.files?.[0] || null)
        }
      />
    </div>
  );
}
