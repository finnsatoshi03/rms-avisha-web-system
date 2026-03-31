/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rentalFormSchema, RentalFormValues } from "./rentalSchema";
import {
  RentalData,
  RentalStatus,
  RentalConsumable,
  Client,
} from "../../lib/types";
import { getStatusClass, formatNumberWithCommas } from "../../lib/helpers";
import { format } from "date-fns";
import DiscountDialog from "../job-order/discount-option-dialog";
import RentalBillingSection from "../billing/rental-billing-section";
import { useDownpayment } from "../job-order/useDownpayment";
import { useRentalStatusUpdate } from "./useRentalStatusUpdate";
import { useUpdateRental } from "./useUpdateRental";
import {
  applySourcePayment,
  deleteReceiptFile,
  getSignedReceiptUrl,
  getSourceLatestReceipt,
  getSourceReceiptStats,
  recalculateLinkedSourceBilling,
  updateSourceReceipt,
  uploadReceiptFile,
} from "../../services/apiBilling";
import ReturnInspectionDialog from "./return-inspection-dialog";
import RentalPaymentDialog from "./rental-payment-dialog";
import RentalConsumableManager from "./rental-consumable-manager";
import RentalAssetSelect from "./rental-asset-select";
import ClientAutoSuggest from "../job-order/client-auto-suggest";
import PhoneInput from "../ui/phone-input";
import { useUser } from "../auth/useUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getBranches } from "../../services/apiBranches";
import { getTechnicians } from "../../services/apiTechnicians";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { DatePicker } from "../ui/date-picker";
import {
  AlertTriangle,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Edit,
  Link2,
  Package,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import BillingImpactConfirmDialog from "../billing/billing-impact-confirm-dialog";
import {
  getBillingSyncSnapshot,
  getPaymentStatusLabel,
  isBillingLinkedSource,
} from "../../lib/billing-sync";
import { computeTransactionTotal } from "../../lib/transaction-totals";

interface RentalDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: RentalData | null;
}

const statusTransitions: Record<
  string,
  { label: string; status: RentalStatus; variant: "default" | "destructive" | "outline" }[]
> = {
  Created: [
    { label: "Release", status: "Released", variant: "default" },
    { label: "Cancel", status: "Cancelled", variant: "destructive" },
  ],
  Released: [
    { label: "Mark Ongoing", status: "Ongoing", variant: "default" },
    { label: "Cancel", status: "Cancelled", variant: "destructive" },
  ],
  Ongoing: [
    { label: "Record Return", status: "Returned", variant: "default" },
    { label: "Cancel", status: "Cancelled", variant: "destructive" },
  ],
  Returned: [{ label: "Complete", status: "Completed", variant: "default" }],
  Completed: [],
  Cancelled: [],
};

export default function RentalDetailSheet({
  open,
  onOpenChange,
  rental,
}: RentalDetailSheetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDialogTotal, setPaymentDialogTotal] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [billingImpactDialogOpen, setBillingImpactDialogOpen] = useState(false);
  const [billingImpactPending, setBillingImpactPending] = useState(false);
  const [billingImpactAction, setBillingImpactAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [openingReceipt, setOpeningReceipt] = useState(false);
  const sourceReceiptInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingSourceReceipt, setIsUploadingSourceReceipt] =
    useState(false);
  const statusMutation = useRentalStatusUpdate();
  const updateMutation = useUpdateRental();
  const { user, branchId, isAdmin, isTechnician } = useUser();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [rentalMonths, setRentalMonths] = useState(1);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<number | null>(null);
  const [downpaymentInputVisible, setDownpaymentInputVisible] = useState(false);


  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    enabled: isAdmin,
  });

  const { data: technicians } = useQuery({
    queryKey: ["technicians", { fetchAll: false }],
    queryFn: () => getTechnicians({ fetchAll: false }),
  });

  const form = useForm<RentalFormValues>({
    resolver: zodResolver(rentalFormSchema),
    defaultValues: getDefaultValues(rental),
  });

  useEffect(() => {
    if (rental) {
      form.reset(getDefaultValues(rental));
      setSelectedClient(rental.clients || null);
      setIsEditMode(false);
      setPaymentDialogTotal(0);
      setSelectedDiscount(rental.discount || null);
      setDownpaymentInputVisible(Boolean(rental.downpayment && rental.downpayment > 0));
      // Compute months from start/end dates
      if (rental.rental_type === "MONTHLY" && rental.start_date && rental.end_date) {
        const start = new Date(rental.start_date);
        const end = new Date(rental.end_date);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        setRentalMonths(Math.max(1, months));
      } else {
        setRentalMonths(1);
      }
    }
  }, [rental, form]);

  const selectedBranchId = form.watch("branch_id");
  const watchedRentalType = form.watch("rental_type");
  const watchedStartDate = form.watch("start_date");
  const watchedEndDate = form.watch("end_date");
  const watchedRateAmount = form.watch("rate_amount");

  // Auto-calculate for monthly when editing
  useEffect(() => {
    if (isEditMode && watchedStartDate && watchedRentalType === "MONTHLY") {
      const start = new Date(watchedStartDate + "T00:00:00");
      const endMonth = new Date(start);
      endMonth.setMonth(endMonth.getMonth() + rentalMonths);
      const endStr = endMonth.toISOString().split("T")[0];
      form.setValue("end_date", endStr);
      form.setValue("due_date", endStr);
      if (rental) {
        form.setValue("rate_amount", rental.rental_assets?.monthly_rate * rentalMonths);
      }
    }
  }, [watchedStartDate, watchedRentalType, rentalMonths, isEditMode]);

  // Auto-calculate for daily when editing
  useEffect(() => {
    if (isEditMode && watchedRentalType === "DAILY" && watchedStartDate && watchedEndDate && rental) {
      const start = new Date(watchedStartDate + "T00:00:00");
      const end = new Date(watchedEndDate + "T00:00:00");
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      form.setValue("rate_amount", rental.rental_assets?.daily_rate * diffDays);
      form.setValue("due_date", watchedEndDate);
    }
  }, [watchedStartDate, watchedEndDate, watchedRentalType, isEditMode]);

  const filteredTechnicians = useMemo(() => {
    if (!technicians) return [];
    if (!selectedBranchId) return technicians;
    return technicians.filter(
      (t: any) => t.branch_id === selectedBranchId || t.branch_id === null
    );
  }, [selectedBranchId, technicians]);

  const rentalRecord = rental;
  const rentalConsumablesTotal = useMemo(
    () =>
      (rentalRecord?.rental_consumables || []).reduce(
        (sum, c) => sum + Number(c.total_amount || 0),
        0
      ),
    [rentalRecord?.rental_consumables]
  );
  const rentalTotalsBeforeDownpayment = useMemo(
    () =>
      computeTransactionTotal({
        subTotal:
          Number(watchedRateAmount || rentalRecord?.rate_amount || 0) +
          rentalConsumablesTotal,
        discount: selectedDiscount ?? 0,
        downpayment: 0,
      }),
    [watchedRateAmount, rentalRecord?.rate_amount, rentalConsumablesTotal, selectedDiscount]
  );
  const { downpaymentValue, downpaymentError, handleDownpaymentChange } =
    useDownpayment(
      rentalTotalsBeforeDownpayment.totalBeforeDownpayment,
      rentalRecord?.downpayment || undefined
    );
  const rentalTotals = useMemo(
    () =>
      computeTransactionTotal({
        subTotal: rentalTotalsBeforeDownpayment.subTotal,
        discount: selectedDiscount ?? 0,
        downpayment: downpaymentValue ?? 0,
      }),
    [rentalTotalsBeforeDownpayment.subTotal, selectedDiscount, downpaymentValue]
  );
  const rentalSubTotal = rentalTotals.subTotal;
  const adjustedGrandTotal = rentalTotals.totalAmount;

  const rentalId = rentalRecord?.id ?? 0;
  const transitions = rentalRecord ? statusTransitions[rentalRecord.status] || [] : [];
  const inspection = rentalRecord?.rental_inspections as any;
  const consumables = (rentalRecord?.rental_consumables || []) as RentalConsumable[];
  const isFormReadonly = !isEditMode;
  const canEdit = rentalRecord
    ? ["Created", "Released", "Ongoing"].includes(rentalRecord.status)
    : false;
  const billingSync = rentalRecord
    ? getBillingSyncSnapshot(rentalRecord.payment_details)
    : null;
  const isBillingLinked = rentalRecord
    ? isBillingLinkedSource({
      sourceType: "rental",
      sourceId: rentalRecord.id,
      transferredToBilling: rentalRecord.transferred_to_billing,
      paymentDetails: rentalRecord.payment_details,
    })
    : false;
  const billingStatusLabel = getPaymentStatusLabel(billingSync?.payment_status);
  const canOpenBillingAccount = Boolean(rentalRecord?.billing_account_id);
  const { data: linkedLatestReceipt } = useQuery({
    queryKey: ["source_latest_receipt", "rental", rentalId],
    queryFn: () => getSourceLatestReceipt("rental", rentalId),
    enabled: isBillingLinked && rentalId > 0,
  });
  const { data: linkedReceiptStats } = useQuery({
    queryKey: ["source_receipt_stats", "rental", rentalId],
    queryFn: () => getSourceReceiptStats("rental", rentalId),
    enabled: isBillingLinked && rentalId > 0,
  });
  const effectiveReceiptUrl =
    linkedLatestReceipt?.receipt_url || rentalRecord?.receipt_url || null;
  const hasMissingReceipt = !rentalRecord
    ? false
    : isBillingLinked
      ? Boolean(linkedReceiptStats?.payments_missing_receipt) ||
        (rentalRecord.status === "Completed" && !effectiveReceiptUrl)
      : rentalRecord.status === "Completed" && !effectiveReceiptUrl;
  const canManageSourceReceipt = Boolean(rentalRecord) && !isTechnician;

  if (!rentalRecord) return null;
  const rentalData = rentalRecord;

  const handleOpenReceipt = async () => {
    if (!effectiveReceiptUrl || openingReceipt) return;

    setOpeningReceipt(true);
    try {
      const signedUrl = await getSignedReceiptUrl(effectiveReceiptUrl);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open receipt attachment."
      );
    } finally {
      setOpeningReceipt(false);
    }
  };

  const handleSourceReceiptUpload = async (file: File | null) => {
    if (!file || !canManageSourceReceipt) return;

    const sourceId = rentalData.id;
    const previousReceiptPath = effectiveReceiptUrl || null;
    let uploadedReceiptPath: string | null = null;
    setIsUploadingSourceReceipt(true);
    try {
      uploadedReceiptPath = await uploadReceiptFile({
        sourceType: "rental",
        sourceId,
        file,
      });

      await updateSourceReceipt("rental", sourceId, uploadedReceiptPath);

      if (
        previousReceiptPath &&
        previousReceiptPath !== uploadedReceiptPath
      ) {
        try {
          await deleteReceiptFile(previousReceiptPath);
        } catch (cleanupError) {
          console.error("Failed to clean up previous receipt file", cleanupError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({
        queryKey: ["source_latest_receipt", "rental", sourceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["source_receipt_stats", "rental", sourceId],
      });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
      toast.success(previousReceiptPath ? "Receipt replaced." : "Receipt attached.");
    } catch (error) {
      if (uploadedReceiptPath) {
        try {
          await deleteReceiptFile(uploadedReceiptPath);
        } catch (deleteError) {
          console.error("Failed to rollback source receipt upload", deleteError);
        }
      }
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update receipt."
      );
    } finally {
      setIsUploadingSourceReceipt(false);
      if (sourceReceiptInputRef.current) {
        sourceReceiptInputRef.current.value = "";
      }
    }
  };

  const livePaymentTotal = adjustedGrandTotal;

  const openBillingImpactGuard = (action: () => Promise<void>) => {
    if (!isBillingLinked) {
      void action();
      return;
    }

    setBillingImpactAction(() => action);
    setBillingImpactDialogOpen(true);
  };

  const handleBillingImpactProceed = async () => {
    if (!billingImpactAction) return;

    setBillingImpactPending(true);
    try {
      await billingImpactAction();
      await recalculateLinkedSourceBilling("rental", rentalData.id, {
        reason: "Rental modification recalculation",
      });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      toast.success(
        "Billing has been updated based on your changes. Previous payments were adjusted."
      );
      setBillingImpactDialogOpen(false);
      setBillingImpactAction(null);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to recalculate linked billing record."
      );
    } finally {
      setBillingImpactPending(false);
    }
  };

  async function performStatusChange(status: RentalStatus) {
    if (status === "Returned") {
      setInspectionOpen(true);
      return;
    }

    if (status === "Completed") {
      if (livePaymentTotal <= 0) {
        await statusMutation.mutateAsync({ ids: [rentalData.id], status: "Completed" });
        onOpenChange(false);
        return;
      }

      setPaymentDialogTotal(livePaymentTotal);
      console.log("Form Total:", livePaymentTotal);
      console.log("Dialog Total:", livePaymentTotal);
      setPaymentOpen(true);
      return;
    }

    await statusMutation.mutateAsync({ ids: [rentalData.id], status });
    if (status === "Cancelled") {
      onOpenChange(false);
    }
  }

  function handleStatusChange(status: RentalStatus) {
    if (status === rentalData.status) return;

    if (isBillingLinked && rentalData.status === "Completed") {
      openBillingImpactGuard(() => performStatusChange(status));
      return;
    }

    void performStatusChange(status);
  }

  async function handlePaymentSubmit(
    payments: Record<string, number>,
    receiptFile?: File | null
  ) {
    const expectedTotal = paymentDialogTotal || livePaymentTotal;
    const totalPayment = Object.values(payments).reduce(
      (sum, amount) => sum + amount,
      0
    );
    console.log("Form Total:", expectedTotal);
    console.log("Dialog Total:", expectedTotal);
    if (Math.abs(totalPayment - expectedTotal) > 0.01) {
      throw new Error(
        `The total payment amount (${totalPayment}) does not match the rental total (${expectedTotal}).`
      );
    }

    let uploadedReceiptPath: string | null = null;
    try {
      if (receiptFile) {
        uploadedReceiptPath = await uploadReceiptFile({
          sourceType: "rental",
          sourceId: rentalData.id,
          file: receiptFile,
        });
      }

      await applySourcePayment("rental", rentalData.id, payments, {
        receiptUrl: uploadedReceiptPath,
      });
      await statusMutation.mutateAsync({
        ids: [rentalData.id],
        status: "Completed",
      });
      onOpenChange(false);
    } catch (error) {
      if (uploadedReceiptPath) {
        try {
          await deleteReceiptFile(uploadedReceiptPath);
        } catch (deleteError) {
          console.error("Failed to rollback receipt upload", deleteError);
        }
      }
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process payment."
      );
      throw error;
    }
  }

  function handleClientSelect(client: Client) {
    setSelectedClient(client);
    form.setValue("client_id", client.id as number);
    form.setValue("name", client.name || "");
    form.setValue("contact_number", client.contact_number || "");
    form.setValue("email", client.email || "");
  }

  const hasHighImpactRentalChanges = (values: RentalFormValues) => {
    const hasNumberChange = (current: number, next: number) =>
      Math.abs(Number(current || 0) - Number(next || 0)) > 0.009;

    return (
      Number(values.rental_asset_id) !== Number(rentalRecord.rental_asset_id) ||
      values.rental_type !== rentalRecord.rental_type ||
      (values.start_date || "") !== (rentalRecord.start_date || "") ||
      (values.end_date || "") !== (rentalRecord.end_date || "") ||
      (values.due_date || "") !== (rentalRecord.due_date || "") ||
      hasNumberChange(Number(rentalRecord.rate_amount || 0), Number(values.rate_amount || 0)) ||
      hasNumberChange(Number(rentalRecord.discount || 0), Number(selectedDiscount ?? 0)) ||
      hasNumberChange(
        Number(rentalRecord.downpayment || 0),
        Number(downpaymentValue ?? 0)
      )
    );
  };

  function onSubmit(values: RentalFormValues) {
    const updatePayload = {
      rental_asset_id: values.rental_asset_id,
      client_id: values.client_id || undefined,
      name: values.name,
      contact_number: values.contact_number,
      email: values.email,
      technician_id: values.technician_id,
      branch_id: values.branch_id,
      start_date: values.start_date,
      end_date: values.end_date,
      due_date: values.due_date,
      rental_type: values.rental_type,
      rate_amount: values.rate_amount,
      discount: selectedDiscount ?? 0,
      downpayment: downpaymentValue ?? 0,
      notes: values.notes,
    };

    const performUpdate = async () => {
      await updateMutation.mutateAsync({
        rentalId: rentalData.id,
        data: updatePayload,
      });
      setIsEditMode(false);
    };

    if (isBillingLinked && hasHighImpactRentalChanges(values)) {
      openBillingImpactGuard(performUpdate);
      return;
    }

    void performUpdate();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="min-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="sr-only">Rental Details</SheetTitle>
            {/* Header: edit/cancel + status actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {canEdit && !isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isBillingLinked) {
                        openBillingImpactGuard(async () => {
                          setIsEditMode(true);
                        });
                        return;
                      }
                      setIsEditMode(true);
                    }}
                    className="px-3 py-1 h-fit text-xs flex items-center gap-1"
                  >
                    <Edit size={12} strokeWidth={1.5} />
                    Edit
                  </Button>
                )}
                {isEditMode && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1 h-fit text-xs"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditMode(false);
                        form.reset(getDefaultValues(rental));
                      }}
                      className="px-3 py-1 h-fit text-xs flex items-center gap-1"
                    >
                      <X size={12} strokeWidth={1.5} />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {transitions.map((t) => (
                  <Button
                    key={t.status}
                    size="sm"
                    variant={t.variant}
                    onClick={() => handleStatusChange(t.status)}
                    disabled={statusMutation.isPending}
                    className="px-3 py-1 h-fit text-xs flex items-center gap-1"
                  >
                    <ChevronRight size={12} />
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Rental number + status badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-primaryRed text-white px-3 py-0.5 rounded-full text-xs font-medium">
                {rental.rental_no}
              </span>
              <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${getStatusClass(rental.status)}`}>
                {rental.status}
              </span>
              {isBillingLinked && (
                <div className="flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Link2 size={10} />
                  <span>Linked to Billing Account</span>
                  <span className="opacity-80">Status: {billingStatusLabel}</span>
                  {canOpenBillingAccount && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-blue-800"
                      onClick={() => navigate(`/billing/${rental.billing_account_id}`)}
                    >
                      Open
                    </Button>
                  )}
                </div>
              )}
              {effectiveReceiptUrl && (
                <div className="flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <span>Receipt attached</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-emerald-800"
                    onClick={handleOpenReceipt}
                    disabled={openingReceipt}
                  >
                    {openingReceipt ? "Opening..." : "View Attachment"}
                  </Button>
                  {canManageSourceReceipt && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-emerald-800"
                      onClick={() => sourceReceiptInputRef.current?.click()}
                      disabled={isUploadingSourceReceipt}
                    >
                      {isUploadingSourceReceipt ? "Uploading..." : "Replace"}
                    </Button>
                  )}
                </div>
              )}
              {!effectiveReceiptUrl && hasMissingReceipt && (
                <div className="flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <span>⚠ Missing Receipt</span>
                  {canManageSourceReceipt && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-amber-800"
                      onClick={() => sourceReceiptInputRef.current?.click()}
                      disabled={isUploadingSourceReceipt}
                    >
                      {isUploadingSourceReceipt ? "Uploading..." : "Upload Receipt"}
                    </Button>
                  )}
                </div>
              )}
              {!effectiveReceiptUrl && !hasMissingReceipt && canManageSourceReceipt && (
                <div className="flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  <span>No Receipt Attached</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-slate-700"
                    onClick={() => sourceReceiptInputRef.current?.click()}
                    disabled={isUploadingSourceReceipt}
                  >
                    {isUploadingSourceReceipt ? "Uploading..." : "Upload Receipt"}
                  </Button>
                </div>
              )}
              {rental.is_overdue && (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                  <AlertTriangle size={10} />
                  Overdue
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                <Clock size={12} />
                {new Date(rental.created_at).toLocaleDateString()}
              </span>
            </div>

            <Separator className="my-2" />
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={isEditMode ? "ring-2 ring-blue-200 rounded-lg p-2" : ""}
            >
              {/* Client Name */}
              {isFormReadonly ? (
                <div className="text-3xl font-bold mb-2">
                  {rental.clients?.name || "—"}
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="name"
                  render={() => (
                    <FormItem className="mb-2">
                      <FormControl>
                        <ClientAutoSuggest
                          selectedClient={selectedClient}
                          onClientSelect={handleClientSelect}
                          onClientCreate={handleClientSelect}
                          initialName={form.watch("name")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Basic Information */}
              <div>
                <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
                  Basic Information
                </h2>
                <div className="grid md:grid-cols-3 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
                  <FormField
                    control={form.control}
                    name="contact_number"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel>Contact No.</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={field.value}
                            onChange={field.onChange}
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                            disabled={isFormReadonly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel>Client Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="client@email.com"
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                            disabled={isFormReadonly}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="technician_id"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel>Technician</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value ?? undefined}
                            disabled={isFormReadonly}
                          >
                            <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0">
                              <SelectValue placeholder="Select a Technician" />
                            </SelectTrigger>
                            <SelectContent align="end">
                              <SelectGroup>
                                <SelectLabel>Technicians</SelectLabel>
                                {filteredTechnicians.map((tech: any) => (
                                  <SelectItem key={tech.id} value={tech.id}>
                                    {tech.fullname || tech.email}
                                    {tech.id === user?.id ? " - (Me)" : ""}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Rental Details */}
              <div>
                <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
                  Rental Details
                </h2>

                {isAdmin && branches && (
                  <FormField
                    control={form.control}
                    name="branch_id"
                    render={({ field }) => (
                      <FormItem className="border-b py-2">
                        <div className="space-y-0 flex justify-between items-center w-full">
                          <FormLabel>Branch</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(Number(val))}
                            defaultValue={field.value?.toString()}
                            disabled={isFormReadonly}
                          >
                            <FormControl>
                              <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                                <SelectValue placeholder="Select branch" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent align="end">
                              {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage className="text-right" />
                      </FormItem>
                    )}
                  />
                )}

                {!isAdmin && (
                  <div className="border-b py-2">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-sm font-medium">Branch</span>
                      <span className="text-sm">{rental.branches?.name || "—"}</span>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="rental_asset_id"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Printer</FormLabel>
                        <FormControl>
                          <RentalAssetSelect
                            value={field.value}
                            onChange={(id, asset) => {
                              field.onChange(id);
                              const type = form.getValues("rental_type");
                              form.setValue(
                                "rate_amount",
                                type === "DAILY" ? asset.daily_rate : asset.monthly_rate
                              );
                            }}
                            branchId={selectedBranchId || branchId}
                            disabled={isFormReadonly}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rental_type"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Rental Type</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isFormReadonly}
                          >
                            <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                              <SelectItem value="DAILY">Daily</SelectItem>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Pick start date"
                            disabled={isFormReadonly}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />

                {watchedRentalType === "MONTHLY" ? (
                  <div className="border-b py-2">
                    <div className="space-y-0 flex justify-between items-center w-full">
                      <span className="text-sm font-medium">Duration (months)</span>
                      {isEditMode ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="px-2 border rounded-full text-sm"
                            onClick={() => rentalMonths > 1 && setRentalMonths(rentalMonths - 1)}
                          >-</button>
                          <span className="text-sm font-medium w-6 text-center">{rentalMonths}</span>
                          <button
                            type="button"
                            className="px-2 border rounded-full text-sm"
                            onClick={() => setRentalMonths(rentalMonths + 1)}
                          >+</button>
                        </div>
                      ) : (
                        <span className="text-sm">{rentalMonths} month{rentalMonths > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {watchedStartDate && (
                      <p className="text-xs text-muted-foreground text-right mt-1">
                        Ends on{" "}
                        {format(
                          new Date(
                            new Date(watchedStartDate + "T00:00:00").setMonth(
                              new Date(watchedStartDate + "T00:00:00").getMonth() + rentalMonths
                            )
                          ),
                          "MMM d, yyyy"
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem className="border-b py-2">
                          <div className="space-y-0 flex justify-between items-center w-full">
                            <FormLabel>End Date *</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Pick end date"
                                disabled={isFormReadonly}
                              />
                            </FormControl>
                          </div>
                          <FormMessage className="text-right" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem className="border-b py-2">
                          <div className="space-y-0 flex justify-between items-center w-full">
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Pick due date"
                                disabled={isFormReadonly}
                              />
                            </FormControl>
                          </div>
                          <FormMessage className="text-right" />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="rate_amount"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Rate Amount</FormLabel>
                        <span className="text-sm font-medium">₱{Number(field.value).toFixed(2)}</span>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Consumables */}
              <div>
                <h2 className="text-xs mb-1 mt-4 font-bold opacity-40 flex items-center gap-1.5">
                  <Package size={12} /> Consumables
                </h2>
                <RentalConsumableManager
                  rentalId={rental.id}
                  consumables={consumables}
                  branchId={rental.branch_id}
                  canEdit={canEdit}
                  onFinancialImpactChange={
                    isBillingLinked ? openBillingImpactGuard : undefined
                  }
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-0 w-full my-3">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this rental..."
                        disabled={isFormReadonly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {/* Summary — same as JO form */}
          <div className="w-fit px-5 py-3 bg-slate-100 rounded-lg flex flex-col mb-3 text-sm ml-auto">
            <h2 className="mb-2 uppercase font-bold font-mono text-base">
              Rental Summary
            </h2>
            <div className="py-3 mb-3 border-dashed border-y-2 border-gray-300">
              <p>Subtotal</p>
              <div className="flex justify-between">
                <p className="opacity-60">Rate</p>
                <p>
                  {Number(watchedRateAmount || rental.rate_amount || 0) > 0
                    ? `₱${formatNumberWithCommas(
                        Number(watchedRateAmount || rental.rate_amount || 0)
                      )}`
                    : "---"}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="opacity-60">Consumables</p>
                <p>
                  {rentalConsumablesTotal > 0
                    ? `₱${formatNumberWithCommas(rentalConsumablesTotal)}`
                    : "---"}
                </p>
              </div>
              <div className="flex justify-between gap-8">
                <p className="opacity-60">Discount</p>
                {selectedDiscount ? (
                  <div className="flex items-center gap-1">
                    <Button
                      className="h-fit w-fit p-[1px] rounded-full"
                      size="icon"
                      variant="destructive"
                      type="button"
                      onClick={() => setSelectedDiscount(null)}
                      disabled={isFormReadonly || updateMutation.isPending}
                    >
                      <X size={10} />
                    </Button>
                    <Button
                      className="h-fit w-fit p-0"
                      variant="link"
                      type="button"
                      onClick={() => setDiscountDialogOpen(true)}
                      disabled={isFormReadonly || updateMutation.isPending}
                    >
                      ₱{formatNumberWithCommas(selectedDiscount)}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="h-fit w-fit p-0"
                    variant="link"
                    type="button"
                    onClick={() => setDiscountDialogOpen(true)}
                    disabled={isFormReadonly || updateMutation.isPending}
                  >
                    Select a discount
                  </Button>
                )}
              </div>
              <div className="flex justify-between items-start gap-4">
                <p className="opacity-60">Downpayment</p>
                {downpaymentValue || downpaymentInputVisible ? (
                  <div className="flex-col items-end justify-end w-[115px]">
                    {isFormReadonly ? (
                      <p className="text-right">
                        ₱{downpaymentValue !== null
                          ? formatNumberWithCommas(downpaymentValue)
                          : rental.downpayment
                            ? formatNumberWithCommas(rental.downpayment)
                            : "0"}
                      </p>
                    ) : (
                      <input
                        type="number"
                        value={downpaymentValue ?? ""}
                        onChange={handleDownpaymentChange}
                        className="w-full text-right bg-transparent focus:outline-none"
                        placeholder="Enter amount"
                        min="0"
                        disabled={isFormReadonly || updateMutation.isPending}
                      />
                    )}
                    {downpaymentError && !isFormReadonly && (
                      <p className="text-red-500 text-xs mt-1 text-right">
                        {downpaymentError}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button
                    className="h-fit w-fit p-0"
                    variant="link"
                    type="button"
                    onClick={() => setDownpaymentInputVisible(true)}
                    disabled={isFormReadonly || updateMutation.isPending}
                  >
                    Add downpayment
                  </Button>
                )}
              </div>
            </div>
            <div className="flex justify-between gap-4">
              <p className="font-black">Grand Total</p>
              <div>
                <p>
                  {adjustedGrandTotal > 0
                    ? `₱${formatNumberWithCommas(adjustedGrandTotal)}`
                    : "---"}
                </p>
                {selectedDiscount !== null && selectedDiscount > 0 && (
                  <p className="line-through text-xs text-right text-slate-500">
                    ₱{formatNumberWithCommas(rentalSubTotal)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DiscountDialog
            open={discountDialogOpen}
            onOpenChange={setDiscountDialogOpen}
            grandTotal={rentalSubTotal}
            onSelectDiscount={(d) => {
              setSelectedDiscount(d);
              setDiscountDialogOpen(false);
            }}
          />

          {/* Billing */}
          {rental && <RentalBillingSection rental={rental} />}

          {/* Inspection */}
          {inspection && (
            <div>
              <h2 className="text-xs mb-1 mt-4 font-bold opacity-40 flex items-center gap-1.5">
                <ClipboardCheck size={12} /> Return Inspection
              </h2>
              <div className="px-4 py-2 border rounded-xl">
                <div className="grid md:grid-cols-2 grid-cols-1 gap-x-6 gap-y-2 text-sm">
                  <div className="border-b py-1.5">
                    <span className="text-muted-foreground text-xs">Physical Condition</span>
                    <p className="font-medium">{inspection.physical_condition || "—"}</p>
                  </div>
                  <div className="border-b py-1.5">
                    <span className="text-muted-foreground text-xs">Print Quality</span>
                    <p className="font-medium">{inspection.print_quality || "—"}</p>
                  </div>
                  {inspection.meter_reading_start != null && (
                    <div className="border-b py-1.5">
                      <span className="text-muted-foreground text-xs">Meter (Start)</span>
                      <p className="font-medium">{inspection.meter_reading_start}</p>
                    </div>
                  )}
                  {inspection.meter_reading_end != null && (
                    <div className="border-b py-1.5">
                      <span className="text-muted-foreground text-xs">Meter (End)</span>
                      <p className="font-medium">{inspection.meter_reading_end}</p>
                    </div>
                  )}
                  {inspection.missing_items && (
                    <div className="border-b py-1.5 col-span-2">
                      <span className="text-muted-foreground text-xs">Missing Items</span>
                      <p className="font-medium text-red-600">{inspection.missing_items}</p>
                    </div>
                  )}
                  {inspection.damage_assessment && (
                    <div className="border-b py-1.5 col-span-2">
                      <span className="text-muted-foreground text-xs">Damage Assessment</span>
                      <p className="font-medium">{inspection.damage_assessment}</p>
                    </div>
                  )}
                  {inspection.damage_penalty > 0 && (
                    <div className="border-b py-1.5">
                      <span className="text-muted-foreground text-xs">Damage Penalty</span>
                      <p className="font-medium text-red-600">₱{Number(inspection.damage_penalty).toFixed(2)}</p>
                    </div>
                  )}
                  {inspection.notes && (
                    <div className="py-1.5 col-span-2">
                      <span className="text-muted-foreground text-xs">Notes</span>
                      <p className="font-medium">{inspection.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <input
        ref={sourceReceiptInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        disabled={isUploadingSourceReceipt}
        onChange={(event) =>
          void handleSourceReceiptUpload(event.target.files?.[0] || null)
        }
      />

      <ReturnInspectionDialog
        open={inspectionOpen}
        onOpenChange={setInspectionOpen}
        rental={rental}
        existingInspection={inspection}
      />

      <RentalPaymentDialog
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setPaymentDialogTotal(0);
        }}
        onSubmit={handlePaymentSubmit}
        totalAmount={paymentDialogTotal}
        rentalNo={rental.rental_no}
        isBillingLinked={isBillingLinked}
      />
      <BillingImpactConfirmDialog
        open={billingImpactDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (billingImpactPending) return;
            setBillingImpactDialogOpen(false);
            setBillingImpactAction(null);
            return;
          }
          setBillingImpactDialogOpen(open);
        }}
        onProceed={handleBillingImpactProceed}
        isPending={billingImpactPending}
      />
    </>
  );
}

function getDefaultValues(rental: RentalData | null): Partial<RentalFormValues> {
  if (!rental) {
    return {
      branch_id: undefined,
      client_id: null,
      name: "",
      contact_number: "",
      email: "",
      rental_asset_id: undefined,
      technician_id: null,
      start_date: "",
      end_date: "",
      due_date: "",
      rental_type: "MONTHLY",
      rate_amount: 0,
      discount: 0,
      downpayment: 0,
      notes: "",
      consumables: [],
      billing_account_id: null,
    };
  }
  return {
    branch_id: rental.branch_id,
    client_id: rental.client_id,
    name: rental.clients?.name || "",
    contact_number: rental.clients?.contact_number || "",
    email: rental.clients?.email || "",
    rental_asset_id: rental.rental_asset_id,
    technician_id: rental.technician_id,
    start_date: rental.start_date || "",
    end_date: rental.end_date || "",
    due_date: rental.due_date || "",
    rental_type: rental.rental_type,
    rate_amount: rental.rate_amount,
    discount: rental.discount || 0,
    downpayment: rental.downpayment || 0,
    notes: rental.notes || "",
    consumables: [],
    billing_account_id: rental.billing_account_id,
  };
}
