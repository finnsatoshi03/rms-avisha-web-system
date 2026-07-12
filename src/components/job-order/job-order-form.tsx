import React, { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Edit,
  Info,
  Link2,
  Loader2,
  Mail,
  Plus,
  Trash,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";

import AccessoriesSection from "./accessories-section";
import JoBillingSection from "../billing/jo-billing-section";
import ClientAutoSuggest from "./client-auto-suggest";
import PhoneInput from "../ui/phone-input";
import { useFeatureOnboarding } from "../onboarding/useFeatureOnboarding";
import FeatureAnnouncementModal from "../onboarding/feature-announcement-modal";
import GuidedTour from "../onboarding/guided-tour";
import TourReplayButton from "../onboarding/tour-replay-button";
import {
  Client,
  MaterialItem,
  JobOrderData,
  CreateJobOrderData,
  User,
  QuotationItem,
} from "../../lib/types";
import PrintOptionsDialog from "./print-option-dialog";
import {
  formatNumberWithCommas,
  formatReadableDate,
  renderWarrantyInfo,
} from "../../lib/helpers";
import { createEditJobOrder } from "../../services/apiJobOrders";
import {
  deleteReceiptFile,
  getSignedReceiptUrl,
  getSourceLatestReceipt,
  getSourceReceiptStats,
  recalculateLinkedSourceBilling,
  updateSourceReceipt,
  uploadReceiptFile,
} from "../../services/apiBilling";
import { getMaterialStocks } from "../../services/apiMaterials";
import {
  getQuotationEmailLogs,
  getQuotationsByJobOrder,
  sendQuotationEmail,
} from "../../services/apiQuotations";
import { getBranches } from "../../services/apiBranches";
import { useUser } from "../auth/useUser";
import { useBranchValidation } from "../../hooks/useBranchValidation";
import { BranchWarning } from "../ui/branch-warning";
import DiscountDialog from "./discount-option-dialog";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { baseSchema } from "./jobOrderSchema";
import { useDownpayment } from "./useDownpayment";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import QuotationDialog from "./quotation-dialog";
import { CreateQuotationData } from "../../lib/types";
import PrintSelectionDialog from "./print-selection-dialog";
import QuotationPrintDialog from "./quotation-print-dialog";
import QuotationDeleteDialog from "./quotation-delete-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { cn } from "../../lib/utils";
import { useClientChildren } from "../clients/useClients";
import { getClientDisplayName } from "../../lib/client-hierarchy";
import {
  getBillingSyncSnapshot,
  getPaymentStatusLabel,
  isBillingLinkedSource,
} from "../../lib/billing-sync";
import { computeTransactionTotal } from "../../lib/transaction-totals";
import {
  resolveQuotationDownpayment,
  withComputedQuotationTotals,
} from "../../lib/quotation-totals";
import BillingImpactConfirmDialog from "../billing/billing-impact-confirm-dialog";
import ReceiptMissingConfirmDialog from "../billing/receipt-missing-confirm-dialog";
import { EmailComposePayload } from "../email/document-email-composer";

const rateOptions = [
  { label: "Walk-in Service", value: 1500 },
  { label: "Walk-in Check-up", value: 250 },
  { label: "Walk-in CISS", value: 600 },
  { label: "Office/Home Service", value: 2000 },
  { label: "Office/Home Check-up", value: 500 },
  { label: "Office/Home CISS", value: 1100 },
  { label: "Return for Warranty", value: 0 },
];

const QUOTATION_PRINT_DELAY_MS = 300;
const QUOTATION_EMAIL_SUBJECT_DEFAULT = "Quotation from RMS Avisha";

const normalizeFileNamePart = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_");

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  return btoa(
    new Uint8Array(buffer).reduce(
      (acc, byte) => acc + String.fromCharCode(byte),
      ""
    )
  );
};

interface MaterialStockItem {
  id: number;
  material_name: string;
  price: number;
  stocks: number;
  branch_id: number;
  deleted?: boolean;
  brand?: string;
  cost?: number;
}

interface MaterialOrderItem {
  material_id: string | number;
  material?: string;
  quantity?: number;
  unitPrice?: number;
  used?: boolean;
}

interface MaterialComboboxProps {
  value: string;
  onChange: (value: string) => void;
  materials: MaterialStockItem[] | undefined;
  disabled: boolean;
  branchId: number | undefined;
  materialsJobOrder: MaterialOrderItem[];
}

const MaterialCombobox: React.FC<MaterialComboboxProps> = ({
  value,
  onChange,
  materials,
  disabled,
  branchId,
  materialsJobOrder,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Reset selection when branch changes
  useEffect(() => {
    if (value) {
      const selectedMaterial = materials?.find(
        (stock) => String(stock.id) === value && stock.branch_id === branchId
      );
      if (!selectedMaterial) {
        onChange(""); // Clear selection if material is not available in new branch
      }
    }
  }, [branchId, value, materials, onChange]);

  const filteredMaterials =
    materials?.filter((stock) => {
      const isMaterialSelected = materialsJobOrder.some(
        (material) => String(material.material_id) === String(stock.id)
      );
      return (
        (disabled || !stock.deleted) &&
        stock.branch_id === branchId &&
        (isMaterialSelected || stock.stocks > 0)
      );
    }) || [];

  // Get selected material name for display
  const selectedMaterial = filteredMaterials.find(
    (material) => String(material.id) === value
  );
  const selectedMaterialName = selectedMaterial
    ? `${selectedMaterial.material_name}${selectedMaterial.brand ? ` - ${selectedMaterial.brand}` : ""
    }`
    : "Select material";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit"
          disabled={disabled}
        >
          <span className="truncate max-w-[200px] text-left">
            {value ? selectedMaterialName : "Select material"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]">
        <Command>
          <CommandInput
            placeholder="Search materials..."
            onValueChange={setSearchValue}
            value={searchValue}
          />
          <CommandEmpty>No material found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {filteredMaterials
              .filter(
                (stock) =>
                  stock.material_name
                    .toLowerCase()
                    .includes(searchValue.toLowerCase()) ||
                  (stock.brand &&
                    stock.brand
                      .toLowerCase()
                      .includes(searchValue.toLowerCase()))
              )
              .map((stock) => (
                <CommandItem
                  key={stock.id}
                  value={stock.material_name.toLowerCase()}
                  onSelect={() => {
                    onChange(String(stock.id));
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="flex items-center"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 flex-shrink-0",
                      value === String(stock.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {stock.material_name}{" "}
                    {stock.brand ? `- ${stock.brand}` : ""}
                  </span>
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default function JobOrderForm({
  jobOrderToEdit = {} as JobOrderData,
  readonly = false,
  technicians = [] as User[],
  onClose,
  onSaved,
}: {
  jobOrderToEdit?: JobOrderData;
  readonly?: boolean;
  technicians?: User[];
  onClose?: () => void;
  onSaved?: (savedOrder: Partial<JobOrderData> & { id: number }) => void;
}) {
  // State to track if we're in edit mode (overrides readonly when true)
  const [isEditMode, setIsEditMode] = useState(false);

  // Determine if form should be readonly based on props and edit mode
  const isFormReadonly = readonly && !isEditMode;
  const {
    id: editId,
    clients,
    materials: editMaterials,
    ...editValues
  } = jobOrderToEdit;
  const editSession = Boolean(editId);

  const existingTechnicalReport = editSession
    ? jobOrderToEdit.technical_report || ""
    : "";

  const {
    id: clientId,
    name,
    contact_number,
    email,
    ...restClient
  } = clients || {};
  const materialsJobOrder =
    editMaterials?.map((material: MaterialItem) => ({
      material: material.material_description,
      quantity: material.quantity,
      unitPrice: material.unit_price,
      material_id: String(material.material_id),
      used: material.used,
    })) || [];

  const editValuesWithClient = {
    name: editValues.is_copy ? `(Copy) ${name}` : name || "",
    contact_number: contact_number || "",
    email: email || "",
    materials: materialsJobOrder,
    ...editValues,
    ...restClient,
    rate: Number(editValues.rate) || 0,
    brand_model: editValues.brand_model || "",
    serial_number: editValues.serial_number || "",
    machine_type: editValues.machine_type || "",
    problem_statement: editValues.problem_statement || "",
    additional_comments: editValues.additional_comments || "",
    labor_description: editValues.labor_description || "",
    amount: editValues.amount || 0,
    accessories: editValues.accessories || [],
    warranty_months: editValues.warranty_months ?? 0,
  };

  const accessoriesString = editValuesWithClient.accessories;
  const parsedAccessories =
    editSession && typeof accessoriesString === "string"
      ? JSON.parse(accessoriesString)
      : [];

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [contactNumber, setContactNumber] = useState("+63 ");
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    editSession && clients ? (clients as Client) : null
  );
  const [selectedSubClientId, setSelectedSubClientId] = useState<string>("none");
  const { children: childClients } = useClientChildren(
    selectedClient && selectedClient.parent_client_id == null
      ? selectedClient.id
      : null
  );
  const selectedSubClient =
    selectedSubClientId !== "none"
      ? childClients.find((child) => String(child.id) === selectedSubClientId) ||
        null
      : null;
  const effectiveSelectedClient = selectedSubClient || selectedClient;
  const [selectedMachineType, setSelectedMachineType] = useState(
    editSession ? editValuesWithClient?.machine_type : ""
  );
  const [specifyInputValue, setSpecifyInputValue] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>(
    editSession ? parsedAccessories : []
  );

  const [jobOrderDataForPrinting, setJobOrderDataForPrinting] =
    useState<CreateJobOrderData | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<number | null>(
    editValues.discount ?? null
  );
  const [downpaymentInputVisible, setDownpaymentInputVisible] = useState(
    Boolean(editValues.downpayment && editValues.downpayment > 0)
  );
  const [isManualRate, setIsManualRate] = useState(
    editSession ? Boolean(editValues.is_manual_rate) : false
  );
  const [savedFixedRate, setSavedFixedRate] = useState(
    editSession ? Number(editValues.rate) || 0 : 0
  );

  // Quotation state
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [quotationData, setQuotationData] =
    useState<CreateQuotationData | null>(null);
  const [isCreatingQuotation, setIsCreatingQuotation] = useState(false);
  const [printSelectionDialogOpen, setPrintSelectionDialogOpen] =
    useState(false);
  const [quotationPrintDialogOpen, setQuotationPrintDialogOpen] =
    useState(false);
  const [quotationActionDialogInitialAction, setQuotationActionDialogInitialAction] =
    useState<"print" | "download" | "email">("print");
  const [closeParentOnQuotationActionDialogClose, setCloseParentOnQuotationActionDialogClose] =
    useState(false);
  const [latestQuotationId, setLatestQuotationId] = useState<number | null>(
    null
  );
  const hydratedQuotationDownpaymentIdRef = useRef<number | null>(null);
  const [isSendingQuotationEmail, setIsSendingQuotationEmail] = useState(false);
  const [quotationEmailError, setQuotationEmailError] = useState<string | null>(
    null
  );
  const [quotationDeleteDialogOpen, setQuotationDeleteDialogOpen] =
    useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<number | null>(
    null
  );
  const [includeManualItemsInTotal, setIncludeManualItemsInTotal] = useState(
    editSession ? editValues.include_quotation_items !== false : true
  );
  const [billingImpactDialogOpen, setBillingImpactDialogOpen] = useState(false);
  const [billingImpactPending, setBillingImpactPending] = useState(false);
  const [billingImpactAction, setBillingImpactAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [closeAfterBillingImpact, setCloseAfterBillingImpact] = useState(false);
  const [openingReceipt, setOpeningReceipt] = useState(false);
  const [postPrintReceiptSourceId, setPostPrintReceiptSourceId] = useState<
    number | null
  >(null);
  const [postPrintReceiptPromptOpen, setPostPrintReceiptPromptOpen] =
    useState(false);
  const [isUploadingPostPrintReceipt, setIsUploadingPostPrintReceipt] =
    useState(false);
  const postPrintReceiptInputRef = useRef<HTMLInputElement | null>(null);
  const sourceReceiptInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingSourceReceipt, setIsUploadingSourceReceipt] =
    useState(false);

  useEffect(() => {
    console.log("[PrintFlow] state changed", {
      isPrinting,
      printDialogOpen,
      printSelectionDialogOpen,
      quotationPrintDialogOpen,
    });
  }, [
    isPrinting,
    printDialogOpen,
    printSelectionDialogOpen,
    quotationPrintDialogOpen,
  ]);

  useEffect(() => {
    return () => {
      console.log("[PrintFlow] JobOrderForm unmounted");
    };
  }, []);

  // Feature onboarding - only active on create (not edit)
  const {
    showAnnouncement,
    showTour,
    onboardingData,
    startTour,
    completeTour,
    replayTour,
  } = useFeatureOnboarding("client_auto_suggest");

  const {
    isAdmin,
    isManager,
    isTechnician,
    branchId: currentUserBranchId,
    user,
  } = useUser();
  const currentTechnicianId = user?.id;
  const canSelectBranch = isAdmin || currentUserBranchId === null;
  const canSendQuotationEmail = isAdmin || isManager;

  // Create
  const { mutate: createJobOrder, isPending: isCreating } = useMutation({
    mutationFn: (newJobOrder: CreateJobOrderData) =>
      createEditJobOrder(newJobOrder, null, null, null),
  });

  // Edit
  const { mutate: editJobOrder, isPending: isEditing } = useMutation({
    mutationFn: ({
      newJobOrder,
      jobOrderId,
      clientId,
      originalClientName,
    }: {
      newJobOrder: CreateJobOrderData;
      jobOrderId: number;
      clientId: number;
      originalClientName: string | null;
    }) =>
      createEditJobOrder(newJobOrder, jobOrderId, clientId, originalClientName),
  });
  // console.log(editValuesWithClient.materials);

  const extendedBaseSchema = canSelectBranch
    ? baseSchema.extend({
      branch_id: z.number().min(1, "Branch is required"),
    })
    : baseSchema;

  const formSchema = extendedBaseSchema.superRefine((data, ctx) => {
    if (!data.technician_id && !data.order_received) {
      ctx.addIssue({
        path: ["technician_id"],
        message: "Either technician ID or order received must be provided.",
        code: z.ZodIssueCode.custom,
      });
      ctx.addIssue({
        path: ["order_received"],
        message: "Either technician ID or order received must be provided.",
        code: z.ZodIssueCode.custom,
      });
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editSession
      ? { ...editValuesWithClient, client_id: clientId || undefined, technical_report: existingTechnicalReport }
      : {
        branch_id: undefined,
        client_id: undefined,
        name: "",
        contact_number: "",
        email: "",
        order_received: "",
        brand_model: "",
        serial_number: "",
        machine_type: "",
        problem_statement: "",
        additional_comments: "",
        labor_description: "",
        rate: 0,
        amount: undefined,
        materials: [],
        accessories: [],
        technician_id: "",
        technical_report: "",
        downpayment: undefined,
        warranty_months: 1,
      },
  });

  useEffect(() => {
    if (!selectedSubClient) return;
    form.setValue("name", selectedSubClient.name || "");
    form.setValue("client_id", selectedSubClient.id);
    form.setValue("contact_number", selectedSubClient.contact_number || "+63 ");
    setContactNumber(selectedSubClient.contact_number || "+63 ");
    form.setValue("email", selectedSubClient.email || "");
    form.clearErrors("name");
    form.clearErrors("contact_number");
  }, [selectedSubClient, form]);

  const watchedBranchId = form.watch("branch_id");

  // Branch validation - watch for branch changes
  const { branchId, hasValidBranch, warningMessage } =
    useBranchValidation(watchedBranchId);

  const { data: materialStocks, isLoading: materialStocksLoading } = useQuery({
    queryKey: ["materialStocks", { fetchAll: true, branchId: watchedBranchId }],
    queryFn: () => getMaterialStocks({ fetchAll: true }),
  });

  const { data: branches } = useQuery({
    queryKey: ["branches", "job-order-form"],
    queryFn: getBranches,
  });

  // Fetch existing quotations for this job order
  const { data: existingQuotations, isLoading: quotationsLoading } = useQuery({
    queryKey: ["quotations", editId],
    queryFn: () => getQuotationsByJobOrder(editId!),
    enabled: Boolean(editId), // Only run if we have a job order ID
  });
  const currentQuotationId =
    latestQuotationId ??
    (existingQuotations && existingQuotations.length > 0
      ? Number(existingQuotations[0].id) || null
      : null);

  const { data: quotationEmailLogs = [] } = useQuery({
    queryKey: ["quotation_email_logs", currentQuotationId],
    queryFn: () => getQuotationEmailLogs(currentQuotationId!),
    enabled: canSendQuotationEmail && Boolean(currentQuotationId),
    staleTime: 30_000,
  });

  const hasPreviouslySentQuotation = useMemo(
    () => quotationEmailLogs.some((log) => log.status === "sent"),
    [quotationEmailLogs]
  );
  const displayedExistingQuotationTotal = useMemo(() => {
    const quotation = existingQuotations?.[0];
    if (!quotation) return 0;

    const laborRate = Number(quotation.labor_rate || 0);
    const serviceFee = Number(quotation.service_fee || 0);
    const resolvedAmount = Math.max(serviceFee - laborRate, 0);
    const sourceDiscount = Number(
      selectedDiscount ?? editValues.discount ?? quotation.discount ?? 0
    );
    const sourceDownpayment = Number(
      resolveQuotationDownpayment(
        quotation.downpayment,
        editValues.downpayment
      ) ?? 0
    );

    return withComputedQuotationTotals({
      subtotal: quotation.subtotal || 0,
      discount: sourceDiscount,
      downpayment: sourceDownpayment,
      labor_rate: laborRate,
      amount: resolvedAmount,
      service_fee: serviceFee,
      total_quote: quotation.total_quote || 0,
      quotation_items: quotation.quotation_items || [],
    }).total_quote;
  }, [
    existingQuotations,
    selectedDiscount,
    editValues.discount,
    editValues.downpayment,
  ]);

  const isPending = isCreating || isEditing || materialStocksLoading;
  const onWarranty = editSession && Boolean(editValues.warranty);

  const [initialFormValues, setInitialFormValues] = useState(form.getValues());
  const [isFormChanged, setIsFormChanged] = useState(false);

  const materials = form.watch("materials");

  // Set quotation data when existing quotations are loaded
  useEffect(() => {
    if (existingQuotations && existingQuotations.length > 0) {
      // Use the first quotation if multiple exist
      const quotation = existingQuotations[0];
      const laborRate = Number(quotation.labor_rate || 0);
      const serviceFee = Number(quotation.service_fee || 0);
      const resolvedAmount = Math.max(serviceFee - laborRate, 0);
      const sourceDiscount = Number(
        selectedDiscount ?? editValues.discount ?? quotation.discount ?? 0
      );
      const sourceDownpayment = Number(
        resolveQuotationDownpayment(
          quotation.downpayment,
          editValues.downpayment
        ) ?? 0
      );
      const normalizedTotals = withComputedQuotationTotals({
        subtotal: quotation.subtotal || 0,
        discount: sourceDiscount,
        downpayment: sourceDownpayment,
        labor_rate: laborRate,
        amount: resolvedAmount,
        service_fee: serviceFee,
        total_quote: quotation.total_quote || 0,
        quotation_items: quotation.quotation_items || [],
      });

      setLatestQuotationId(Number(quotation.id) || null);
      setQuotationData({
        job_order_id: editId!,
        quote_no: quotation.quote_no,
        end_date: quotation.end_date || "",
        company: quotation.company || "",
        address: quotation.address || "",
        note: quotation.note || "",
        subtotal: normalizedTotals.subtotal,
        discount: normalizedTotals.discount,
        downpayment: normalizedTotals.downpayment,
        labor_rate: normalizedTotals.labor_rate,
        amount: normalizedTotals.amount,
        service_fee: normalizedTotals.service_fee,
        total_quote: normalizedTotals.total_quote,
        quotation_items: quotation.quotation_items || [],
      });
      return;
    }

    if (editSession) {
      setLatestQuotationId(null);
    }
  }, [
    existingQuotations,
    editId,
    selectedDiscount,
    editValues.discount,
    editValues.downpayment,
    editSession,
  ]);

  // Watch for material changes and sync to quotation dialog
  useEffect(() => {
    console.log("Job order materials changed:", materials);

    // Only sync if quotation dialog is open and we have materials
    if (quotationDialogOpen && materials && materials.length > 0) {
      console.log("Syncing job order materials to quotation dialog");
      // The quotation dialog will automatically receive the updated materials
      // through the jobOrderMaterials prop
    }
  }, [materials, quotationDialogOpen]);

  // Create a reactive materials array that will trigger re-renders
  const [reactiveMaterials, setReactiveMaterials] = useState(materials || []);

  // Update reactive materials when form materials change
  useEffect(() => {
    console.log("Updating reactive materials:", materials);
    setReactiveMaterials(materials || []);
  }, [materials]);

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  // Calculate total from job order materials (inventory items)
  const inventoryMaterialsPrice =
    materials?.reduce(
      (total, { quantity = 0, unitPrice = 0 }) => total + quantity * unitPrice,
      0
    ) ?? 0;

  // Calculate total from manual quotation items
  const manualQuotationItemsPrice = useMemo(() => {
    if (!quotationData?.quotation_items) return 0;

    return quotationData.quotation_items
      .filter((item) => item.is_manual) // Only manual items
      .reduce((total, item) => total + (item.amount || 0), 0);
  }, [quotationData?.quotation_items]);

  // Combined material total (inventory + manual quotation items if included)
  const totalMaterialsPrice =
    inventoryMaterialsPrice +
    (includeManualItemsInTotal ? manualQuotationItemsPrice : 0);

  const totalMaterialsCost = materials?.reduce(
    (total, { quantity = 0, material_id }) => {
      const cost =
        materialStocks?.find((stock) => stock.id === Number(material_id))
          ?.cost || 0;
      return total + quantity * cost;
    },
    0
  );
  const laborTotal =
    Number(form.watch("rate") || 0) + Number(form.watch("amount") || 0);
  const totalsBeforeDownpayment = computeTransactionTotal({
    subTotal: totalMaterialsPrice + laborTotal,
    discount: selectedDiscount ?? 0,
    downpayment: 0,
  });
  const grandTotal = totalsBeforeDownpayment.subTotal;
  const totalBeforeDownpayment = totalsBeforeDownpayment.totalBeforeDownpayment;
  const {
    downpaymentValue,
    downpaymentError,
    handleDownpaymentChange,
    setDownpaymentValueStrict,
  } = useDownpayment(totalBeforeDownpayment, editValues.downpayment || undefined);
  useEffect(() => {
    const quotation = existingQuotations?.[0];
    const quotationId = Number(quotation?.id || 0);
    if (!quotation || !quotationId) {
      hydratedQuotationDownpaymentIdRef.current = null;
      return;
    }

    if (hydratedQuotationDownpaymentIdRef.current === quotationId) return;

    const quotationDownpayment =
      resolveQuotationDownpayment(
        quotation.downpayment,
        editValues.downpayment
      ) ?? 0;
    if (setDownpaymentValueStrict(quotationDownpayment)) {
      hydratedQuotationDownpaymentIdRef.current = quotationId;
      setDownpaymentInputVisible(quotationDownpayment > 0);
    }
  }, [
    existingQuotations,
    editValues.downpayment,
    setDownpaymentValueStrict,
  ]);
  const totals = computeTransactionTotal({
    subTotal: grandTotal,
    discount: selectedDiscount ?? 0,
    downpayment: downpaymentValue ?? 0,
  });
  const adjustedGrandTotal = totals.totalAmount;
  const billingSync = getBillingSyncSnapshot(jobOrderToEdit.payment_details);
  const isBillingLinked = editSession
    ? isBillingLinkedSource({
        sourceType: "job_order",
        sourceId: Number(editId || 0),
        transferredToBilling: jobOrderToEdit.transferred_to_billing,
        paymentDetails: jobOrderToEdit.payment_details,
      })
    : false;
  const billingStatusLabel = getPaymentStatusLabel(billingSync?.payment_status);
  const canOpenBillingAccount = Boolean(jobOrderToEdit.billing_account_id);
  const { data: linkedLatestReceipt } = useQuery({
    queryKey: ["source_latest_receipt", "job_order", Number(editId)],
    queryFn: () => getSourceLatestReceipt("job_order", Number(editId)),
    enabled: editSession && isBillingLinked && Boolean(editId),
  });
  const { data: linkedReceiptStats } = useQuery({
    queryKey: ["source_receipt_stats", "job_order", Number(editId)],
    queryFn: () => getSourceReceiptStats("job_order", Number(editId)),
    enabled: editSession && isBillingLinked && Boolean(editId),
  });
  const effectiveReceiptUrl =
    linkedLatestReceipt?.receipt_url || jobOrderToEdit.receipt_url || null;
  const hasMissingReceipt = editSession
    ? isBillingLinked
      ? Boolean(linkedReceiptStats?.payments_missing_receipt) ||
        (editValuesWithClient.status === "Completed" && !effectiveReceiptUrl)
      : editValuesWithClient.status === "Completed" && !effectiveReceiptUrl
    : false;
  const canManageSourceReceipt =
    editSession && Boolean(editId) && !isTechnician;

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

    const sourceId = Number(editId || 0);
    if (!Number.isFinite(sourceId) || sourceId <= 0) return;

    const previousReceiptPath = effectiveReceiptUrl || null;
    let uploadedReceiptPath: string | null = null;
    setIsUploadingSourceReceipt(true);
    try {
      uploadedReceiptPath = await uploadReceiptFile({
        sourceType: "job_order",
        sourceId,
        file,
      });

      await updateSourceReceipt("job_order", sourceId, uploadedReceiptPath);

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

      queryClient.invalidateQueries({ queryKey: ["job_order"] });
      queryClient.invalidateQueries({
        queryKey: ["source_latest_receipt", "job_order", sourceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["source_receipt_stats", "job_order", sourceId],
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

  const openBillingImpactGuard = (
    action: () => Promise<void>,
    options?: { closeAfterSuccess?: boolean }
  ) => {
    if (!isBillingLinked) {
      void action();
      return;
    }

    setCloseAfterBillingImpact(Boolean(options?.closeAfterSuccess));
    setBillingImpactAction(() => action);
    setBillingImpactDialogOpen(true);
  };

  const handleBillingImpactProceed = async () => {
    if (!billingImpactAction) return;

    setBillingImpactPending(true);
    try {
      await billingImpactAction();
      await recalculateLinkedSourceBilling("job_order", Number(editId), {
        reason: "Job order modification recalculation",
      });
      queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      toast.success(
        "Billing has been updated based on your changes. Previous payments were adjusted."
      );
      if (closeAfterBillingImpact && onClose) onClose();
      setBillingImpactDialogOpen(false);
      setBillingImpactAction(null);
      setCloseAfterBillingImpact(false);
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

  const filteredTechnicians = useMemo(() => {
    if (isFormReadonly) {
      return technicians;
    }
    if (branchId !== null) {
      return technicians.filter(
        (technician) =>
          technician.branch_id === branchId || technician.branch_id === null
      );
    }
    return technicians;
  }, [
    technicians,
    branchId,
    isFormReadonly,
  ]);

  const resolveBranchForPdf = (id: number | null | undefined) => {
    if (id === null || id === undefined) return undefined;
    return (branches || []).find((branch) => branch.id === id);
  };

  const handleAddDownpayment = () => {
    setDownpaymentInputVisible(true);
  };

  const handleSelectDiscount = (discount: number) => {
    setSelectedDiscount(discount);
    setDiscountDialogOpen(false);
  };

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "materials",
  });

  const finalizePrintFlow = () => {
    if (postPrintReceiptSourceId) {
      setPostPrintReceiptPromptOpen(true);
      return;
    }

    if (onClose) {
      onClose();
    }
  };

  const clearPostPrintReceiptPrompt = () => {
    setPostPrintReceiptPromptOpen(false);
    setPostPrintReceiptSourceId(null);
    if (postPrintReceiptInputRef.current) {
      postPrintReceiptInputRef.current.value = "";
    }
  };

  const handlePostPrintReceiptUpload = async (file: File | null) => {
    if (!file || !postPrintReceiptSourceId) {
      return;
    }

    let uploadedReceiptPath: string | null = null;
    setIsUploadingPostPrintReceipt(true);

    try {
      uploadedReceiptPath = await uploadReceiptFile({
        sourceType: "job_order",
        sourceId: postPrintReceiptSourceId,
        file,
      });

      await updateSourceReceipt("job_order", postPrintReceiptSourceId, uploadedReceiptPath);
      queryClient.invalidateQueries({ queryKey: ["job_order"] });
      queryClient.invalidateQueries({
        queryKey: ["source_latest_receipt", "job_order", postPrintReceiptSourceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["source_receipt_stats", "job_order", postPrintReceiptSourceId],
      });
      toast.success("Receipt attached to job order.");
      clearPostPrintReceiptPrompt();
      if (onClose) {
        onClose();
      }
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

  const generatePDF = async (
    data: CreateJobOrderData,
    type?: "company" | "client" | "both" | null
  ) => {
    setIsPrinting(true);
    console.log("[PrintFlow] Job order print started", {
      orderNo: data.order_no,
      copyType: type,
    });

    // Find the technician by order_received ID
    const orderReceivedTechnician = technicians.find(
      (tech) => tech.id === data.order_received
    );
    const orderReceivedTechnicianName = orderReceivedTechnician
      ? orderReceivedTechnician.fullname
      : "---";

    // Find the technician by technician_id
    const technician = technicians.find(
      (tech) => tech.id === data.technician_id
    );
    const technicianName = technician ? technician.fullname : "---";

    const pdfData = {
      ...data,
      order_received: orderReceivedTechnicianName,
      technician_id: technicianName,
      branch: resolveBranchForPdf(data.branch_id),
    };

    const [{ pdf }, { default: JobOrderPDF }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./job-order-pdf"),
    ]);
    const doc = <JobOrderPDF data={pdfData} type={type} />;
    const asBlob = await pdf(doc).toBlob();

    const src = URL.createObjectURL(asBlob);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    iframe.onload = function () {
      setTimeout(function () {
        console.log("[PrintFlow] Job order before print");
        iframe.contentWindow?.print();
        console.log("[PrintFlow] Job order print call returned");
      }, 1);
    };

    iframe.src = src;

    const afterPrint = () => {
      console.log("[PrintFlow] Job order after print");
      setIsPrinting(false);
      setPrintDialogOpen(false);
      setPrintSelectionDialogOpen(false);
      setQuotationPrintDialogOpen(false);
      saveAs(asBlob, `job-order-${type || "both"}.pdf`);
      URL.revokeObjectURL(src);
      finalizePrintFlow();
    };

    window.addEventListener("focus", afterPrint, { once: true });
  };

  const buildQuotationPDFBlob = async (quotationData: CreateQuotationData) => {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const sourceDiscount = Number(
      quotationData.discount ?? selectedDiscount ?? 0
    );
    const sourceDownpayment = Number(
      quotationData.downpayment ?? downpaymentValue ?? 0
    );

    const normalizedTotals = withComputedQuotationTotals({
      subtotal: quotationData.subtotal,
      discount: sourceDiscount,
      downpayment: sourceDownpayment,
      labor_rate: quotationData.labor_rate,
      amount: quotationData.amount,
      service_fee: quotationData.service_fee,
      total_quote: quotationData.total_quote,
      quotation_items: quotationData.quotation_items || [],
    });

    const quoteNo = quotationData?.quote_no || "";
    const jobOrderNo = quotationData?.job_order_no || "";
    const clientName = form.getValues("name") || "client";
    const quotationPDFData = {
      ...quotationData,
      subtotal: normalizedTotals.subtotal,
      discount: normalizedTotals.discount,
      downpayment: normalizedTotals.downpayment,
      labor_rate: normalizedTotals.labor_rate,
      amount: normalizedTotals.amount,
      service_fee: normalizedTotals.service_fee,
      total_quote: normalizedTotals.total_quote,
      quote_no: quoteNo,
      end_date: quotationData?.end_date || endDate.toISOString().split("T")[0],
      clientData: {
        name: form.getValues("name") || "",
        contact_number: form.getValues("contact_number") || "",
        email: form.getValues("email") || "",
        brand_model: form.getValues("brand_model") || "",
        serial_number: form.getValues("serial_number") || "",
        machine_type: form.getValues("machine_type") || "",
        problem_statement: form.getValues("problem_statement") || "",
      },
      branch_id: watchedBranchId ?? currentUserBranchId ?? 0,
      branch: resolveBranchForPdf(watchedBranchId ?? currentUserBranchId),
      job_order_no: jobOrderNo,
      date: new Date().toISOString().split("T")[0],
    };

    const [{ pdf }, { default: QuotationPDF }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./quotation-pdf"),
    ]);
    const doc = <QuotationPDF data={quotationPDFData} type="both" />;
    const asBlob = await pdf(doc).toBlob();

    const normalizedQuoteNo = normalizeFileNamePart(quoteNo || "quotation");
    const normalizedClientName = normalizeFileNamePart(clientName);
    const filename = `Quotation_${normalizedQuoteNo}_${normalizedClientName}.pdf`;

    return {
      asBlob,
      filename,
      quoteNo,
      jobOrderNo,
      clientName,
      totalQuote: normalizedTotals.total_quote,
      downpayment: normalizedTotals.downpayment,
    };
  };

  const generateQuotationPDF = async (quotationData: CreateQuotationData) => {
    setIsPrinting(true);
    console.log("[PrintFlow] Quotation print started", {
      quoteNo: quotationData?.quote_no,
      jobOrderNo: quotationData?.job_order_no,
    });

    try {
      const { asBlob } = await buildQuotationPDFBlob(quotationData);
      const src = URL.createObjectURL(asBlob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      iframe.onload = function () {
        setTimeout(function () {
          console.log("[PrintFlow] Quotation before print");
          iframe.contentWindow?.print();
          console.log("[PrintFlow] Quotation print call returned");
        }, QUOTATION_PRINT_DELAY_MS);
      };

      iframe.src = src;

      const afterPrint = () => {
        console.log("[PrintFlow] Quotation after print");
        setIsPrinting(false);
        setPrintDialogOpen(false);
        setPrintSelectionDialogOpen(false);
        setQuotationPrintDialogOpen(false);
        saveAs(asBlob, `quotation-${Date.now()}.pdf`);
        URL.revokeObjectURL(src);
        finalizePrintFlow();
      };

      window.addEventListener("focus", afterPrint, { once: true });
    } catch (error) {
      console.error("Error generating quotation PDF:", error);
      setIsPrinting(false);
      toast.error("Failed to print quotation PDF.");
    }
  };

  const downloadQuotationPDF = async (quotationData: CreateQuotationData) => {
    setIsPrinting(true);
    try {
      const { asBlob, filename } = await buildQuotationPDFBlob(quotationData);
      saveAs(asBlob, filename);
      setQuotationPrintDialogOpen(false);
      toast.success("Quotation PDF downloaded.");
    } catch (error) {
      console.error("Error downloading quotation PDF:", error);
      toast.error("Failed to download quotation PDF.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSendQuotationByEmail = async ({
    to,
    cc,
    bcc,
    subject,
    message,
  }: EmailComposePayload) => {
    if (!canSendQuotationEmail) {
      toast.error("Only admin and manager accounts can send quotation emails.");
      return;
    }

    if (!quotationData || !currentQuotationId) {
      toast.error("Quotation data is incomplete. Save quotation first.");
      return;
    }

    const shouldForceSend =
      hasPreviouslySentQuotation &&
      window.confirm(
        "This quotation has already been emailed.\n\nSend again?"
      );

    if (hasPreviouslySentQuotation && !shouldForceSend) {
      return;
    }

    setIsSendingQuotationEmail(true);
    setQuotationEmailError(null);

    try {
      const {
        asBlob,
        quoteNo,
        jobOrderNo,
        clientName,
        totalQuote,
        downpayment: quotationDownpayment,
      } =
        await buildQuotationPDFBlob(quotationData);
      const pdfBase64 = await blobToBase64(asBlob);
      const emailPayload = {
        quotation_id: currentQuotationId,
        to,
        cc,
        bcc,
        subject,
        message,
        pdf_base64: pdfBase64,
        pdf_filename: `Quotation-${normalizeFileNamePart(quoteNo || String(currentQuotationId))}.pdf`,
        force_send: shouldForceSend,
        client_name: clientName,
        quote_no: quoteNo,
        job_order_no: jobOrderNo,
        quotation_date: new Date().toISOString().split("T")[0],
        total_quote: Number(totalQuote ?? 0),
        downpayment: Number(quotationDownpayment ?? 0),
        branch_name:
          resolveBranchForPdf(watchedBranchId ?? currentUserBranchId)?.name ||
          undefined,
      };
      let result = await sendQuotationEmail(emailPayload);

      if (!result.success && result.already_sent_before && !shouldForceSend) {
        const confirmResend = window.confirm(
          "This quotation has already been emailed.\n\nSend again?"
        );

        if (!confirmResend) {
          return;
        }

        result = await sendQuotationEmail({
          ...emailPayload,
          force_send: true,
        });
      }

      if (!result.success) {
        const failureMessage = [
          result.error || "Failed to send quotation email.",
          result.reason_code ? `(code: ${result.reason_code})` : null,
          result.details || null,
        ]
          .filter(Boolean)
          .join(" ");
        setQuotationEmailError(failureMessage);
        toast.error("Failed to send email.");
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["quotation_email_logs", currentQuotationId],
      });
      queryClient.invalidateQueries({ queryKey: ["email_logs"] });
      setQuotationEmailError(null);
      setQuotationPrintDialogOpen(false);
      toast.success("Quotation sent successfully");
    } catch (error) {
      console.error("Error sending quotation email:", error);
      const failureMessage =
        error instanceof Error
          ? error.message
          : "Failed to send quotation email.";
      setQuotationEmailError(failureMessage);
      toast.error("Failed to send email.");
    } finally {
      setIsSendingQuotationEmail(false);
    }
  };

  const generateMergedPDF = async (
    jobOrderData: CreateJobOrderData,
    quotationData: CreateQuotationData
  ) => {
    setIsPrinting(true);
    console.log("[PrintFlow] Merged print started", {
      orderNo: jobOrderData?.order_no,
      quoteNo: quotationData?.quote_no,
    });

    const sourceDiscount = Number(
      quotationData.discount ?? selectedDiscount ?? 0
    );
    const sourceDownpayment = Number(
      quotationData.downpayment ?? downpaymentValue ?? 0
    );
    const normalizedTotals = withComputedQuotationTotals({
      subtotal: quotationData.subtotal,
      discount: sourceDiscount,
      downpayment: sourceDownpayment,
      labor_rate: quotationData.labor_rate,
      amount: quotationData.amount,
      service_fee: quotationData.service_fee,
      total_quote: quotationData.total_quote,
      quotation_items: quotationData.quotation_items || [],
    });

    const quotationPDFData = {
      ...quotationData,
      subtotal: normalizedTotals.subtotal,
      discount: normalizedTotals.discount,
      downpayment: normalizedTotals.downpayment,
      labor_rate: normalizedTotals.labor_rate,
      amount: normalizedTotals.amount,
      service_fee: normalizedTotals.service_fee,
      total_quote: normalizedTotals.total_quote,
      job_order_no: quotationData.job_order_no || "",
      quote_no: quotationData.quote_no || "",
      branch: resolveBranchForPdf(jobOrderData.branch_id),
    };

    try {
      // Find the technician by order_received ID
      const orderReceivedTechnician = technicians.find(
        (tech) => tech.id === jobOrderData.order_received
      );
      const orderReceivedTechnicianName = orderReceivedTechnician
        ? orderReceivedTechnician.fullname
        : "---";

      // Find the technician by technician_id
      const technician = technicians.find(
        (tech) => tech.id === jobOrderData.technician_id
      );
      const technicianName = technician ? technician.fullname : "---";

      const [{ pdf }, { default: MergedPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./merged-pdf"),
      ]);
      const doc = (
        <MergedPDF
          jobOrderData={{
            ...jobOrderData,
            branch: resolveBranchForPdf(jobOrderData.branch_id),
          }}
          quotationData={quotationPDFData}
          orderReceivedTechnicianName={orderReceivedTechnicianName || "---"}
          technicianName={technicianName || "---"}
        />
      );
      const asBlob = await pdf(doc).toBlob();

      const src = URL.createObjectURL(asBlob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      iframe.onload = function () {
        setTimeout(function () {
          console.log("[PrintFlow] Merged before print");
          iframe.contentWindow?.print();
          console.log("[PrintFlow] Merged print call returned");
        }, 1);
      };

      iframe.src = src;

      const afterPrint = () => {
        console.log("[PrintFlow] Merged after print");
        setIsPrinting(false);
        setPrintDialogOpen(false);
        setPrintSelectionDialogOpen(false);
        setQuotationPrintDialogOpen(false);
        saveAs(asBlob, `job-order-with-quotation-${Date.now()}.pdf`);
        URL.revokeObjectURL(src);
        finalizePrintFlow();
      };

      window.addEventListener("focus", afterPrint, { once: true });
    } catch (error) {
      console.error("Error generating merged PDF:", error);
      setIsPrinting(false);
    }
  };

  const normalizeMaterialEntries = (
    items: Array<{
      material_id?: string | number;
      material?: string;
      quantity?: number;
      unitPrice?: number;
      used?: boolean | null;
    }> = []
  ) =>
    items
      .map((item) => ({
        material_id: Number(item.material_id || 0),
        material: String(item.material || "").trim().toLowerCase(),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        used: Boolean(item.used),
      }))
      .sort((a, b) => {
        if (a.material_id !== b.material_id) {
          return a.material_id - b.material_id;
        }
        if (a.material !== b.material) {
          return a.material.localeCompare(b.material);
        }
        return a.quantity - b.quantity;
      });

  const hasHighImpactJobOrderChanges = (submittedValues: CreateJobOrderData) => {
    const hasNumberChange = (current: number, next: number) =>
      Math.abs(Number(current || 0) - Number(next || 0)) > 0.009;

    const currentMaterials = normalizeMaterialEntries(
      (jobOrderToEdit.materials || []).map((material) => ({
        material_id: material.material_id,
        material: material.material_description,
        quantity: material.quantity,
        unitPrice: material.unit_price,
        used: material.used,
      }))
    );
    const nextMaterials = normalizeMaterialEntries(
      (submittedValues.materials || []).map((material) => ({
        material_id: material.material_id,
        material: material.material,
        quantity: material.quantity,
        unitPrice: material.unitPrice,
        used: material.used,
      }))
    );

    return (
      hasNumberChange(Number(editValues.rate || 0), Number(submittedValues.rate || 0)) ||
      hasNumberChange(Number(editValues.amount || 0), Number(submittedValues.amount || 0)) ||
      hasNumberChange(
        Number(editValues.material_total || 0),
        Number(submittedValues.material_total || 0)
      ) ||
      hasNumberChange(
        Number(editValues.labor_total || 0),
        Number(submittedValues.labor_total || 0)
      ) ||
      hasNumberChange(
        Number(editValues.discount || 0),
        Number(submittedValues.discount || 0)
      ) ||
      hasNumberChange(
        Number(editValues.downpayment || 0),
        Number(submittedValues.downpayment || 0)
      ) ||
      hasNumberChange(
        Number(editValues.grand_total || 0),
        Number(submittedValues.grand_total || 0)
      ) ||
      JSON.stringify(currentMaterials) !== JSON.stringify(nextMaterials)
    );
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Filter out any undefined or null material entries
    const filteredMaterials = values.materials
      ?.filter((material) => material.material && material.material_id)
      .map((material) => ({
        ...material,
        material_id: Number(material.material_id),
      }));

    const exceededStock = filteredMaterials?.some((material) => {
      const currentStock = getStockForMaterial(material.material_id);

      const originalMaterial = editMaterials?.find(
        (m) => String(m.material_id) === String(material.material_id)
      );

      const isQuantityExceedingStock =
        material.quantity > currentStock &&
        (!originalMaterial || material.quantity > originalMaterial.quantity);

      return isQuantityExceedingStock;
    });

    if (exceededStock) {
      toast.error("One or more materials exceed the available stock.");
      return;
    }

    if (values.machine_type === "others" && !specifyInputValue.trim()) {
      form.setError("machine_type", {
        type: "manual",
        message: "Specify machine type if 'Other' is selected",
      });
      return;
    }

    // Update the materials field with the filtered materials
    const submittedValues: CreateJobOrderData = {
      ...values,
      client_id: effectiveSelectedClient?.id || values.client_id || null,
      materials: filteredMaterials,
      order_received:
        values.order_received?.trim() === "" ? null : values.order_received,
      technician_id:
        values.technician_id?.trim() === "" ? null : values.technician_id,
      labor_total: laborTotal,
      material_total: totalMaterialsPrice ?? 0,
      materials_expense: totalMaterialsCost ?? 0,
      downpayment: downpaymentValue ?? 0,
      discount: selectedDiscount ?? 0,
      sub_total: grandTotal,
      grand_total: adjustedGrandTotal,
      net_sales: adjustedGrandTotal - (totalMaterialsCost ?? 0),
      date: editSession
        ? String(jobOrderToEdit.created_at)
        : new Date().toISOString(),
      branch_id: branchId ?? currentUserBranchId ?? values.branch_id ?? 0,
      warranty: editSession ? editValues.warranty ?? undefined : undefined,
      warranty_months:
        values.warranty_months !== undefined ? values.warranty_months : 1,
      brand_model: values.brand_model || "",
      serial_number: values.serial_number || "",
      machine_type: values.machine_type || "",
      include_quotation_items: includeManualItemsInTotal,
      problem_statement: values.problem_statement || "",
      additional_comments: values.additional_comments || "",
      labor_description: values.labor_description || "",
      amount: values.amount || 0,
      accessories: values.accessories || [],
      isCreatingQuotation: isCreatingQuotation,
      is_manual_rate: isManualRate,
    };

    const submitEditedJobOrder = async (
      payload: CreateJobOrderData,
      options?: { closeAfterSuccess?: boolean }
    ) => {
      await new Promise<void>((resolve, reject) => {
        editJobOrder(
          {
            newJobOrder: payload,
            jobOrderId: editId,
            clientId,
            originalClientName: clients?.name || null,
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ["job_order"] });
              if (editId) {
                onSaved?.({
                  id: Number(editId),
                  sub_total: payload.sub_total,
                  discount: payload.discount ?? 0,
                  downpayment: payload.downpayment ?? 0,
                  grand_total: payload.grand_total,
                  labor_total: payload.labor_total,
                  material_total: payload.material_total,
                });
              }
              toast.success("Job order successfully edited!");
              if (options?.closeAfterSuccess !== false && onClose) {
                onClose();
              }
              resolve();
            },
            onError: (error) => {
              console.error(error);
              toast.error("An error occurred. Please try again.");
              reject(error);
            },
          }
        );
      });
    };

    if (editSession) {
      const requiresBillingRecalculation =
        isBillingLinked && hasHighImpactJobOrderChanges(submittedValues);
      const syncQuotationForEditedJobOrder = async () => {
        if (!quotationData || !isCreatingQuotation) return;

        try {
          const sourceDiscount = Number(
            selectedDiscount ?? quotationData.discount ?? 0
          );
          const sourceDownpayment = Number(
            downpaymentValue ?? quotationData.downpayment ?? 0
          );
          const normalizedTotals = withComputedQuotationTotals({
            subtotal: quotationData.subtotal,
            discount: sourceDiscount,
            downpayment: sourceDownpayment,
            labor_rate: quotationData.labor_rate,
            amount: quotationData.amount,
            service_fee: quotationData.service_fee,
            total_quote: quotationData.total_quote,
            quotation_items: quotationData.quotation_items || [],
          });

          const finalQuotationData = {
            ...quotationData,
            subtotal: normalizedTotals.subtotal,
            discount: normalizedTotals.discount,
            downpayment: normalizedTotals.downpayment,
            labor_rate: normalizedTotals.labor_rate,
            amount: normalizedTotals.amount,
            service_fee: normalizedTotals.service_fee,
            total_quote: normalizedTotals.total_quote,
            status: "approved" as const,
            is_final: true,
            is_active: true,
          };

          if (existingQuotations && existingQuotations.length > 0) {
            const { updateQuotation } = await import(
              "../../services/apiQuotations"
            );
            await updateQuotation(existingQuotations[0].id!, finalQuotationData);
            toast.success("Quotation updated successfully!");
            return;
          }

          const { addQuotationToJobOrder } = await import(
            "../../services/apiQuotations"
          );
          const response = await addQuotationToJobOrder(editId, finalQuotationData);
          const finalUpdatedQuotationData = {
            ...finalQuotationData,
            quote_no: response.quote_no,
            job_order_no: response.job_order_no,
          };
          toast.success("Quotation created successfully!");
          setQuotationData(finalUpdatedQuotationData);
          setLatestQuotationId(Number(response.id) || null);
          setQuotationActionDialogInitialAction("print");
          setCloseParentOnQuotationActionDialogClose(true);
          setQuotationEmailError(null);
          setQuotationPrintDialogOpen(true);
        } catch (error) {
          console.error("Error saving quotation:", error);
          toast.error(
            "Job order updated but quotation failed. Please create quotation manually."
          );
        }
      };

      const runEditFlow = async (closeAfterSuccess: boolean) => {
        await submitEditedJobOrder(submittedValues, { closeAfterSuccess });
        await syncQuotationForEditedJobOrder();
      };

      if (requiresBillingRecalculation) {
        openBillingImpactGuard(
          async () => {
            await runEditFlow(false);
          },
          { closeAfterSuccess: true }
        );
      } else {
        void runEditFlow(true);
      }
    } else {
      createJobOrder(submittedValues, {
        onSuccess: async (response) => {
          queryClient.invalidateQueries({ queryKey: ["job_order"] });
          toast.success("Job order created successfully!");
          console.log(response);

          // Create quotation if one was prepared
          if (quotationData && isCreatingQuotation) {
            try {
              const { createQuotation } = await import(
                "../../services/apiQuotations"
              );
              const sourceDiscount = Number(
                selectedDiscount ?? quotationData.discount ?? 0
              );
              const sourceDownpayment = Number(
                downpaymentValue ?? quotationData.downpayment ?? 0
              );
              const normalizedTotals = withComputedQuotationTotals({
                subtotal: quotationData.subtotal,
                discount: sourceDiscount,
                downpayment: sourceDownpayment,
                labor_rate: quotationData.labor_rate,
                amount: quotationData.amount,
                service_fee: quotationData.service_fee,
                total_quote: quotationData.total_quote,
                quotation_items: quotationData.quotation_items || [],
              });
              const quotationToCreate = {
                ...quotationData,
                subtotal: normalizedTotals.subtotal,
                discount: normalizedTotals.discount,
                downpayment: normalizedTotals.downpayment,
                labor_rate: normalizedTotals.labor_rate,
                amount: normalizedTotals.amount,
                service_fee: normalizedTotals.service_fee,
                total_quote: normalizedTotals.total_quote,
                job_order_id: response.jobOrder,
                status: "approved" as const,
                is_final: true,
                is_active: true,
                // quote_no will be generated automatically by database trigger
              };

              const createdQuotation = await createQuotation(quotationToCreate);
              // Update quotation data with the returned data (including generated quote_no)
              const updatedQuotationData = {
                ...quotationToCreate,
                quote_no: createdQuotation.quote_no,
                job_order_id: createdQuotation.job_order_id,
                job_order_no: createdQuotation.job_order_no,
                status: "approved" as const,
                is_final: true,
                is_active: true,
              };
              setQuotationData(updatedQuotationData);
              setLatestQuotationId(Number(createdQuotation.id) || null);
              toast.success("Quotation created successfully!");
              // Set the updated quotation data for printing
              setQuotationData(updatedQuotationData);
            } catch (error) {
              console.error("Error creating quotation:", error);
              toast.error(
                "Job order created but quotation failed. Please create quotation manually."
              );
            }
          }

          setJobOrderDataForPrinting({
            ...submittedValues,
            order_no: response.order_no,
          });
          setPostPrintReceiptSourceId(response.jobOrder);

          // Show print selection dialog if in quotation mode, otherwise show regular print dialog
          if (isCreatingQuotation && quotationData) {
            setPrintSelectionDialogOpen(true);
          } else {
            setPrintDialogOpen(true);
          }
        },
        onError: (error) => {
          toast.error("An error occurred. Please try again.");
          console.error(error);
        },
      });
    }
  }

  const handleMaterialChange = (index: number, materialId: number) => {
    console.log("Job order material changed:", { index, materialId });
    const selectedMaterial = materialStocks?.find((m) => m.id === materialId);
    if (selectedMaterial) {
      form.setValue(
        `materials.${index}.material`,
        selectedMaterial.material_name
      );
      form.setValue(`materials.${index}.material_id`, String(materialId));
      form.setValue(`materials.${index}.unitPrice`, selectedMaterial.price);

      // Update reactive materials state
      const values = form.getValues();
      const updatedMaterials = [...(values?.materials || [])];
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        material: selectedMaterial.material_name,
        material_id: String(materialId),
        unitPrice: selectedMaterial.price,
      };
      setReactiveMaterials(updatedMaterials);

      console.log("Job order material updated:", selectedMaterial);
    }
  };

  const handleContactNumberChange = (
    value: string,
    onChange: (value: string) => void
  ) => {
    setContactNumber(value);
    onChange(value);
  };

  const handleAccessorySelection = (
    accessory: string,
    action?: "add" | "remove"
  ) => {
    if (isFormReadonly) return;

    if (action === "remove" || selectedAccessories.includes(accessory)) {
      // Remove accessory
      setSelectedAccessories((prev: string[]) =>
        prev.filter((item) => item !== accessory)
      );
    } else {
      // Add accessory
      setSelectedAccessories((prev: string[]) => [...prev, accessory]);
    }
  };

  // Quotation handlers
  const handleCreateQuotation = () => {
    // If there's an existing quotation, load its data
    if (existingQuotations && existingQuotations.length > 0) {
      const quotation = existingQuotations[0];
      const laborRate = Number(quotation.labor_rate || 0);
      const serviceFee = Number(quotation.service_fee || 0);
      const resolvedAmount = Math.max(serviceFee - laborRate, 0);
      const sourceDiscount = Number(
        selectedDiscount ?? editValues.discount ?? quotation.discount ?? 0
      );
      const sourceDownpayment = Number(
        resolveQuotationDownpayment(
          quotation.downpayment,
          downpaymentValue ?? editValues.downpayment,
        ) ?? 0
      );
      const normalizedTotals = withComputedQuotationTotals({
        subtotal: quotation.subtotal || 0,
        discount: sourceDiscount,
        downpayment: sourceDownpayment,
        labor_rate: laborRate,
        amount: resolvedAmount,
        service_fee: serviceFee,
        total_quote: quotation.total_quote || 0,
        quotation_items: quotation.quotation_items || [],
      });

      setQuotationData({
        job_order_id: editId!,
        quote_no: quotation.quote_no,
        end_date: quotation.end_date || "",
        company: quotation.company || "",
        address: quotation.address || "",
        note: quotation.note || "",
        subtotal: normalizedTotals.subtotal,
        discount: normalizedTotals.discount,
        downpayment: normalizedTotals.downpayment,
        labor_rate: normalizedTotals.labor_rate,
        amount: normalizedTotals.amount,
        service_fee: normalizedTotals.service_fee,
        total_quote: normalizedTotals.total_quote,
        quotation_items: quotation.quotation_items || [],
      });
      setIsCreatingQuotation(true);
    }
    setQuotationDialogOpen(true);
  };

  const handleSaveQuotation = (quotation: CreateQuotationData) => {
    const sourceDiscount = Number(quotation.discount ?? selectedDiscount ?? 0);
    const sourceDownpayment = Number(
      quotation.downpayment ?? downpaymentValue ?? 0
    );
    const normalizedTotals = withComputedQuotationTotals({
      subtotal: quotation.subtotal,
      discount: sourceDiscount,
      downpayment: sourceDownpayment,
      labor_rate: quotation.labor_rate,
      amount: quotation.amount,
      service_fee: quotation.service_fee,
      total_quote: quotation.total_quote,
      quotation_items: quotation.quotation_items || [],
    });

    // Always set quotations as final
    const finalQuotation = {
      ...quotation,
      subtotal: normalizedTotals.subtotal,
      discount: normalizedTotals.discount,
      downpayment: normalizedTotals.downpayment,
      labor_rate: normalizedTotals.labor_rate,
      amount: normalizedTotals.amount,
      service_fee: normalizedTotals.service_fee,
      total_quote: normalizedTotals.total_quote,
      status: "approved" as const,
      is_final: true,
      is_active: true,
    };

    setSelectedDiscount(normalizedTotals.discount);
    setDownpaymentValueStrict(normalizedTotals.downpayment);
    setQuotationData(finalQuotation);
    setIsCreatingQuotation(true);
    setQuotationDialogOpen(false);
    // Mark form as changed to enable save button
    setIsFormChanged(true);
  };

  const handlePrintSelection = (option: "quotation" | "job_order" | "both") => {
    console.log("[PrintFlow] Print selection chosen", { option });
    setPrintSelectionDialogOpen(false);

    if (option === "quotation") {
      // Handle quotation printing
      if (quotationData) {
        // Use the current quotation data from state which should have the updated quote_no
        generateQuotationPDF(quotationData);
      }
    } else if (option === "job_order") {
      // Handle job order printing
      if (jobOrderDataForPrinting) {
        generatePDF(jobOrderDataForPrinting, "company");
      }
    } else if (option === "both") {
      // Handle both - generate merged PDF with both documents
      if (jobOrderDataForPrinting && quotationData) {
        generateMergedPDF(jobOrderDataForPrinting, quotationData);
      }
    }
  };

  const handleDeleteQuotation = (quotationId: number) => {
    setQuotationToDelete(quotationId);
    setQuotationDeleteDialogOpen(true);
  };

  const openQuotationEmailDialog = () => {
    if (!quotationData) {
      toast.error("No quotation available to send.");
      return;
    }

    if (!canSendQuotationEmail) {
      toast.error("Only admin and manager accounts can send quotation emails.");
      return;
    }

    setQuotationEmailError(null);
    setQuotationActionDialogInitialAction("email");
    setCloseParentOnQuotationActionDialogClose(false);
    setQuotationPrintDialogOpen(true);
  };

  const confirmDeleteQuotation = async () => {
    if (!quotationToDelete) return;

    try {
      const { deleteQuotation } = await import("../../services/apiQuotations");
      await deleteQuotation(quotationToDelete);

      // Reset quotation state
      setQuotationData(null);
      setIsCreatingQuotation(false);
      setLatestQuotationId(null);
      setQuotationEmailError(null);

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["quotations", editId] });
      queryClient.invalidateQueries({
        queryKey: ["jobOrderQuotations", editId],
      });
      queryClient.invalidateQueries({ queryKey: ["quotation_email_logs"] });
      queryClient.invalidateQueries({ queryKey: ["archive"] });

      toast.success("Quotation removed successfully!");
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast.error("Failed to remove quotation. Please try again.");
    } finally {
      setQuotationDeleteDialogOpen(false);
      setQuotationToDelete(null);
    }
  };

  const handleClientDataChange = (updatedClientData: {
    name: string;
    contact_number: string;
    email: string;
    brand_model: string;
    serial_number: string;
    machine_type: string;
    problem_statement: string;
  }) => {
    // Update the job order form with the new client data
    form.setValue("name", updatedClientData.name);
    form.setValue("contact_number", updatedClientData.contact_number);
    form.setValue("email", updatedClientData.email);
    form.setValue("brand_model", updatedClientData.brand_model);
    form.setValue("serial_number", updatedClientData.serial_number);
    form.setValue("machine_type", updatedClientData.machine_type);
    form.setValue("problem_statement", updatedClientData.problem_statement);
  };

  const handleMaterialsChange = (
    updatedMaterials: Array<{
      material: string;
      quantity: number;
      unitPrice: number;
      material_id: string;
    }>
  ) => {
    console.log("Job order form received materials update:", updatedMaterials);

    const normalizedMaterials = (updatedMaterials || []).map((material) => ({
      material: material.material || "",
      quantity: Number(material.quantity || 0),
      unitPrice: Number(material.unitPrice || 0),
      material_id: String(material.material_id || ""),
      used: false,
    }));

    replace(normalizedMaterials);

    // Update the job order form materials with the new material data
    form.setValue("materials", normalizedMaterials, {
      shouldDirty: true,
      shouldValidate: true,
    });

    // Update reactive materials state
    setReactiveMaterials(normalizedMaterials);

    // Trigger form validation and re-render
    form.trigger("materials");

    // Force a re-render by updating a dummy state if needed
    // This ensures the form updates are reflected in the UI
    console.log(
      "Job order form materials updated to:",
      form.getValues("materials")
    );
  };

  const getStockForMaterial = (materialId: number) => {
    const material = materialStocks?.find((stock) => stock.id === materialId);
    return material ? material.stocks : 0;
  };

  const canAddMaterial = () => {
    const values = form.getValues();
    return (
      values?.materials?.every((item) => item.material.trim() !== "") ?? true
    );
  };

  const decrement = (index: number) => {
    console.log("Job order decrement called for index:", index);
    const values = form.getValues();
    const newQuantity = (values?.materials?.[index]?.quantity ?? 0) - 1;
    const finalQuantity = newQuantity < 0 ? 0 : newQuantity;

    console.log("Decrementing quantity:", {
      index,
      newQuantity,
      finalQuantity,
    });

    form.setValue(`materials.${index}.quantity`, finalQuantity);

    // Update reactive materials state
    const updatedMaterials = [...(values?.materials || [])];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      quantity: finalQuantity,
    };
    setReactiveMaterials(updatedMaterials);

    console.log("Quantity updated to:", finalQuantity);
  };

  const increment = (index: number) => {
    console.log("Job order increment called for index:", index);
    const values = form.getValues();
    const materialId = values?.materials?.[index]?.material_id;
    const currentStock = getStockForMaterial(Number(materialId));
    const newQuantity = (values?.materials?.[index]?.quantity ?? 0) + 1;

    console.log("Incrementing quantity:", {
      materialId,
      newQuantity,
      currentStock,
    });

    if (newQuantity <= currentStock) {
      form.setValue(`materials.${index}.quantity`, newQuantity);

      // Update reactive materials state
      const updatedMaterials = [...(values?.materials || [])];
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        quantity: newQuantity,
      };
      setReactiveMaterials(updatedMaterials);

      console.log("Quantity updated to:", newQuantity);
    } else {
      toast.error(`Not enough stock for material ID ${materialId}`);
    }
  };

  useEffect(() => {
    if (selectedMachineType === "others") {
      form.setValue("machine_type", specifyInputValue);
    }
  }, [selectedMachineType, specifyInputValue, form]);

  useEffect(() => {
    form.setValue("accessories", selectedAccessories);
  }, [selectedAccessories, form]);

  useEffect(() => {
    if (editSession && editValuesWithClient.contact_number) {
      setContactNumber(editValuesWithClient.contact_number);
      form.setValue("contact_number", editValuesWithClient.contact_number);
    }
  }, [editSession, editValuesWithClient.contact_number, form]);

  useEffect(() => {
    setInitialFormValues(form.getValues());
  }, [editSession, form]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      const isChanged =
        JSON.stringify(values) !== JSON.stringify(initialFormValues);
      setIsFormChanged(isChanged);
    });

    return () => subscription.unsubscribe();
  }, [form, initialFormValues]);

  // Track checkbox changes to enable update button
  useEffect(() => {
    if (editSession) {
      const hasCheckboxChanged =
        includeManualItemsInTotal !==
        Boolean(editValues.include_quotation_items);
      if (hasCheckboxChanged) {
        setIsFormChanged(true);
      }
    }
  }, [
    includeManualItemsInTotal,
    editSession,
    editValues.include_quotation_items,
  ]);

  useEffect(() => {
    if (!quotationData) return;

    const sourceDiscount = Number(selectedDiscount ?? quotationData.discount ?? 0);
    const sourceDownpayment = Number(
      quotationData.downpayment ?? downpaymentValue ?? 0
    );

    const normalizedTotals = withComputedQuotationTotals({
      subtotal: quotationData.subtotal,
      discount: sourceDiscount,
      downpayment: sourceDownpayment,
      labor_rate: quotationData.labor_rate,
      amount: quotationData.amount,
      service_fee: quotationData.service_fee,
      total_quote: quotationData.total_quote,
      quotation_items: quotationData.quotation_items || [],
    });

    const nextQuotationData: CreateQuotationData = {
      ...quotationData,
      subtotal: normalizedTotals.subtotal,
      discount: normalizedTotals.discount,
      downpayment: normalizedTotals.downpayment,
      labor_rate: normalizedTotals.labor_rate,
      amount: normalizedTotals.amount,
      service_fee: normalizedTotals.service_fee,
      total_quote: normalizedTotals.total_quote,
    };

    if (
      Number(quotationData.discount ?? 0) === nextQuotationData.discount &&
      Number(quotationData.downpayment ?? 0) ===
        Number(nextQuotationData.downpayment ?? 0) &&
      Number(quotationData.subtotal ?? 0) === nextQuotationData.subtotal &&
      Number(quotationData.total_quote ?? 0) === nextQuotationData.total_quote
    ) {
      return;
    }

    setQuotationData(nextQuotationData);
  }, [selectedDiscount, downpaymentValue, quotationData]);

  const normalizedQuotationTotals = useMemo(() => {
    if (!quotationData) return null;

    return withComputedQuotationTotals({
      subtotal: quotationData.subtotal,
      discount: quotationData.discount ?? selectedDiscount ?? 0,
      downpayment: quotationData.downpayment ?? downpaymentValue ?? 0,
      labor_rate: quotationData.labor_rate,
      amount: quotationData.amount,
      service_fee: quotationData.service_fee,
      total_quote: quotationData.total_quote,
      quotation_items: quotationData.quotation_items || [],
    });
  }, [quotationData, selectedDiscount, downpaymentValue]);

  const quotationEmailRecipient = (form.getValues("email") || "").trim();
  const quotationEmailClientName = (form.getValues("name") || "Client").trim();
  const quotationReference = quotationData?.quote_no?.trim() || "N/A";
  const quotationEmailDate = format(new Date(), "MMM d, yyyy");
  const quotationTotalAmount = Number(normalizedQuotationTotals?.total_quote ?? 0);
  const quotationBranchName =
    resolveBranchForPdf(watchedBranchId ?? currentUserBranchId)?.name || "";
  const quotationEmailDefaultMessage = [
    `Hello ${quotationEmailClientName || "Client"},`,
    "",
    "Please find your quotation below:",
    "",
    "Quotation Details:",
    `Reference: ${quotationReference}`,
    `Date: ${quotationEmailDate}`,
    `Total: ₱${formatNumberWithCommas(quotationTotalAmount)}`,
    ...(quotationBranchName ? [`Branch: ${quotationBranchName}`] : []),
    "",
    "Attached is the full quotation document.",
    "",
    "Thank you,",
    "RMS Avisha",
  ].join("\n");

  return (
    <>
      {/* Feature onboarding */}
      {!editSession && (
        <>
          <FeatureAnnouncementModal
            open={showAnnouncement}
            onboarding={onboardingData}
            onStartTour={startTour}
          />
          <GuidedTour
            featureKey="client_auto_suggest"
            active={showTour}
            onComplete={completeTour}
          />
        </>
      )}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={
            isEditMode ? "border-2 border-blue-200 rounded-lg p-4" : ""
          }
        >
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <div className="px-3 py-1 bg-gray-200 rounded-full text-gray-600 text-xs w-fit flex items-center gap-1">
              <Clock size={12} strokeWidth={1.5} />
              {editSession ? formatReadableDate(editValues.created_at) : date}
            </div>
            {!editSession && !readonly && (
              <TourReplayButton onClick={replayTour} label="How to use client search" />
            )}
            {(editSession || readonly) && (
              <div className="px-3 py-1 bg-red-200 rounded-full text-red-600 text-xs w-fit flex items-center gap-1">
                #{editSession ? editValuesWithClient.order_no : ""}
              </div>
            )}
            {editValuesWithClient.warranty && (
              <div className="px-3 py-1 bg-green-200 rounded-full text-green-600 text-xs w-fit flex items-center gap-1">
                {editSession || readonly
                  ? `Warranty: ${renderWarrantyInfo(
                    editValuesWithClient.warranty
                  )}`
                  : ""}
              </div>
            )}
            {isBillingLinked && (
              <div className="px-3 py-1 bg-blue-100 rounded-full text-blue-800 text-xs w-fit flex items-center gap-2">
                <Link2 size={12} strokeWidth={1.5} />
                <span>Linked to Billing Account</span>
                <span className="opacity-80">Status: {billingStatusLabel}</span>
                {canOpenBillingAccount && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-blue-800"
                    onClick={() =>
                      navigate(`/billing/${jobOrderToEdit.billing_account_id}`)
                    }
                  >
                    Open
                  </Button>
                )}
              </div>
            )}
            {effectiveReceiptUrl && (
              <div className="px-3 py-1 bg-emerald-100 rounded-full text-emerald-800 text-xs w-fit flex items-center gap-2">
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
              <div className="px-3 py-1 bg-amber-100 rounded-full text-amber-800 text-xs w-fit flex items-center gap-2">
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
              <div className="px-3 py-1 bg-slate-100 rounded-full text-slate-700 text-xs w-fit flex items-center gap-2">
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
            {readonly && !isEditMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="px-3 py-1 h-fit text-xs flex items-center gap-1"
              >
                <Edit size={12} strokeWidth={1.5} />
                Edit
              </Button>
            )}
            {readonly && isEditMode && (
              <>
                <div className="px-3 py-1 bg-blue-200 rounded-full text-blue-600 text-xs w-fit flex items-center gap-1">
                  <Edit size={12} strokeWidth={1.5} />
                  Edit Mode
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(false)}
                  className="px-3 py-1 h-fit text-xs flex items-center gap-1"
                >
                  <X size={12} strokeWidth={1.5} />
                  Cancel
                </Button>
              </>
            )}
          </div>
          {isFormReadonly ? (
            <div className="text-3xl font-bold mb-2">
              {getClientDisplayName(selectedClient, "") || form.getValues("name") || "—"}
              {selectedClient?.type === "company" && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full align-middle">
                  company
                </span>
              )}
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
                      onClientSelect={(client) => {
                        setSelectedClient(client);
                        setSelectedSubClientId("none");
                        form.setValue("name", client.name);
                        form.setValue("client_id", client.id);
                        form.setValue("contact_number", client.contact_number || "+63 ");
                        setContactNumber(client.contact_number || "+63 ");
                        form.setValue("email", client.email || "");
                        form.clearErrors("name");
                        form.clearErrors("contact_number");
                      }}
                      onClientCreate={(client) => {
                        setSelectedClient(client);
                        setSelectedSubClientId("none");
                        form.setValue("name", client.name);
                        form.setValue("client_id", client.id);
                        form.setValue("contact_number", client.contact_number || "+63 ");
                        setContactNumber(client.contact_number || "+63 ");
                        form.setValue("email", client.email || "");
                        form.clearErrors("name");
                        form.clearErrors("contact_number");
                      }}
                      disabled={onWarranty}
                      initialName={form.getValues("name")}
                    />
                  </FormControl>
                  {selectedClient &&
                    selectedClient.parent_client_id == null &&
                    childClients.length > 0 && (
                      <div className="mt-2 p-2 border rounded-lg bg-muted/20">
                        <p className="text-xs text-muted-foreground mb-1">
                          Department / Branch (optional)
                        </p>
                        <Select
                          value={selectedSubClientId}
                          onValueChange={(value) => {
                            setSelectedSubClientId(value);
                            if (value === "none" && selectedClient) {
                              form.setValue("name", selectedClient.name || "");
                              form.setValue("client_id", selectedClient.id);
                              form.setValue(
                                "contact_number",
                                selectedClient.contact_number || "+63 "
                              );
                              setContactNumber(
                                selectedClient.contact_number || "+63 "
                              );
                              form.setValue("email", selectedClient.email || "");
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Parent-level (all departments)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              Parent-level (all departments)
                            </SelectItem>
                            {childClients.map((child) => (
                              <SelectItem key={child.id} value={String(child.id)}>
                                {child.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <div>
            <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
              Basic Information
            </h2>
            <div className="grid md:grid-cols-3 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
              {/* Hide contact number based on security conditions */}
              {!(editSession && !isAdmin && !isManager) && (
                <FormField
                  control={form.control}
                  name="contact_number"
                  render={({ field }) => {
                    const {
                      onChange: fieldOnChange,
                      value: fieldValue,
                    } = field;
                    return (
                      <FormItem className="space-y-0">
                        <FormLabel>Contact No.</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={contactNumber || fieldValue}
                            onChange={(val) =>
                              handleContactNumberChange(val, fieldOnChange)
                            }
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                            disabled={isFormReadonly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel>Client Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Client Email"
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
                name="order_received"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="space-y-0">
                      <FormLabel>Order Received By</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value ?? undefined}
                          disabled={
                            readonly ||
                            (canSelectBranch && !form.watch("branch_id"))
                          }
                        >
                          <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0">
                            <SelectValue
                              placeholder={
                                canSelectBranch && !form.watch("branch_id")
                                  ? "Select a branch first"
                                  : "Select Receiver"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent align="end">
                            <SelectGroup>
                              <SelectLabel>Technicians</SelectLabel>
                              {filteredTechnicians.map((technician) => (
                                <SelectItem
                                  key={technician.id}
                                  value={technician.id}
                                >
                                  {technician.fullname || technician.email}
                                  <span className="font-bold">
                                    {technician.id === currentTechnicianId
                                      ? " - (Me)"
                                      : ""}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div>
            <div className="grid lg:grid-cols-2 grid-cols-1 lg:gap-10 gap-2">
              <div>
                <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
                  Order Details
                </h2>
                {canSelectBranch && (
                  <FormField
                    control={form.control}
                    name="branch_id"
                    render={({ field }) => (
                      <FormItem className="border-b py-2">
                        <div className="space-y-0 flex justify-between items-center w-full">
                          <FormLabel>Branch</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(Number(value));
                            }}
                            // defaultValue={String(field.value)}
                            disabled={isFormReadonly || onWarranty}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right"
                                autoFocus={!editSession && !field.value}
                              >
                                <SelectValue
                                  placeholder={`${form.watch("branch_id")
                                      ? (branches || []).find(
                                        (branch) => branch.id === field.value
                                      )?.name || `Branch ${field.value}`
                                      : "Select a branch"
                                    }`}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent align="end">
                              <SelectGroup>
                                <SelectLabel>Branches</SelectLabel>
                                {(branches || []).map((branch) => (
                                  <SelectItem
                                    key={branch.id}
                                    value={String(branch.id)}
                                  >
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage className="text-right" />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="brand_model"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Brand Model</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Brother MFC-J4335DW"
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                            disabled={isFormReadonly}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., XYZ123456789"
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                            disabled={isFormReadonly}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="machine_type"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Machine Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedMachineType(value);
                          }}
                          defaultValue={field.value}
                          disabled={isFormReadonly}
                        >
                          <FormControl>
                            <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                              <SelectValue placeholder="Select a Machine Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent align="end">
                            <SelectGroup>
                              <SelectLabel>Machine Types</SelectLabel>
                              <SelectItem value="printer">Printer</SelectItem>
                              <SelectItem value="laptop">Laptop</SelectItem>
                              <SelectItem value="desktop_pc">
                                Desktop/PC
                              </SelectItem>
                              <SelectItem value="electric_typewriter">
                                Electric Typewriter
                              </SelectItem>
                              <SelectItem value="others">Others</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedMachineType === "others" && (
                        <Input
                          placeholder="Specify machine type"
                          value={specifyInputValue}
                          onChange={(e) => setSpecifyInputValue(e.target.value)}
                          className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-full text-right"
                        />
                      )}
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="problem_statement"
                  render={({ field }) => (
                    <FormItem className="space-y-0 w-full my-3">
                      <FormLabel>Problem Statement</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the issue"
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
                  name="additional_comments"
                  render={({ field }) => (
                    <FormItem className="space-y-0 w-full my-3">
                      <FormLabel>Additional Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any extra details"
                          disabled={isFormReadonly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1 lg:mt-4 mt-0">
                  <h2 className="text-xs font-bold opacity-40">
                    Labor Details
                  </h2>
                </div>
                <FormField
                  control={form.control}
                  name="technician_id"
                  render={({ field }) => (
                    <FormItem className="space-y-0 border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Technician</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value ?? undefined}
                            disabled={isFormReadonly || onWarranty}
                          >
                            <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                              <SelectValue placeholder="Select a Technician" />
                            </SelectTrigger>
                            <SelectContent align="end">
                              <SelectGroup>
                                <SelectLabel>Technicians</SelectLabel>
                                {filteredTechnicians.map((technician) => (
                                  <SelectItem
                                    key={technician.id}
                                    value={technician.id}
                                  >
                                    {technician.fullname || technician.email}
                                    <span className="font-bold">
                                      {technician.id === currentTechnicianId
                                        ? " - (Me)"
                                        : ""}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
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
                  name="labor_description"
                  render={({ field }) => (
                    <FormItem className="space-y-0 w-full mt-2 mb-3">
                      <FormLabel>Labor Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the work performed"
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
                  name="rate"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Rate</FormLabel>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className="group inline-flex items-center gap-2"
                            data-state={isManualRate ? "checked" : "unchecked"}
                          >
                            <span
                              className="group-data-[state=checked]:text-muted-foreground/70 cursor-pointer text-right text-xs font-medium"
                              onClick={() => {
                                if (!isFormReadonly) {
                                  setIsManualRate(false);
                                  // Restore saved fixed rate
                                  if (savedFixedRate) {
                                    field.onChange(savedFixedRate);
                                  }
                                }
                              }}
                            >
                              Fixed
                            </span>
                            <Switch
                              checked={isManualRate}
                              onCheckedChange={(checked) => {
                                if (!isFormReadonly) {
                                  setIsManualRate(checked);
                                  // When switching to fixed, restore saved rate
                                  if (!checked && savedFixedRate) {
                                    field.onChange(savedFixedRate);
                                  }
                                }
                              }}
                              disabled={isFormReadonly}
                            />
                            <span
                              className="group-data-[state=unchecked]:text-muted-foreground/70 cursor-pointer text-left text-xs font-medium"
                              onClick={() => {
                                if (!isFormReadonly) {
                                  setIsManualRate(true);
                                }
                              }}
                            >
                              Manual
                            </span>
                          </div>
                          {!isManualRate ? (
                            <Select
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => {
                                const rateValue = Number(value);
                                field.onChange(rateValue);
                                setSavedFixedRate(rateValue);
                              }}
                              disabled={isFormReadonly}
                            >
                              <FormControl>
                                <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                                  <SelectValue placeholder="Select a Service Type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent align="end">
                                <SelectGroup>
                                  <SelectLabel>Service Type</SelectLabel>
                                  {rateOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value.toString()}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          ) : (
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Enter rate"
                                className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /[^0-9.]/g,
                                    ""
                                  );
                                  field.onChange(
                                    value ? parseFloat(value) : ""
                                  );
                                }}
                                disabled={isFormReadonly}
                              />
                            </FormControl>
                          )}
                        </div>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter Amount"
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(
                                /[^0-9.]/g,
                                ""
                              );
                              field.onChange(value ? parseFloat(value) : "");
                            }}
                            disabled={isFormReadonly}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />
                <div className="flex justify-between items-center w-full border-b py-2 text-sm">
                  <h2 className="font-bold">Labor Total</h2>
                  <p>
                    <span className="mr-1 font-bold">₱</span>
                    {laborTotal.toFixed(2)}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="warranty_months"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                          <FormLabel>Warranty</FormLabel>
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info
                                  size={14}
                                  className="text-gray-500 cursor-help"
                                />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  Warranty period starts when job order is
                                  marked as "Completed"
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(Number(value));
                          }}
                          value={field.value?.toString() || "1"}
                          disabled={isFormReadonly}
                        >
                          <FormControl>
                            <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                              <SelectValue placeholder="Select warranty period" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent align="end">
                            <SelectGroup>
                              <SelectLabel>Warranty Period</SelectLabel>
                              <SelectItem value="0">No warranty</SelectItem>
                              <SelectItem value="1">1 month</SelectItem>
                              <SelectItem value="2">2 months</SelectItem>
                              <SelectItem value="3">3 months</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />
                {/* Quotation Section */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xs font-bold opacity-40">Quotation</h2>
                  </div>

                  {/* Show existing quotation if any */}
                  {existingQuotations && existingQuotations.length > 0 && (
                    <div className="mb-3 px-3 py-2 bg-gray-50 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Quote #{existingQuotations[0].quote_no}
                          </span>
                          {/* Manual items indicator */}
                          {existingQuotations[0].quotation_items?.some(
                            (item: QuotationItem) => item.is_manual
                          ) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                                      <Info size={10} />
                                      Manual Items
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      This quotation contains manual items that
                                      don't sync with inventory
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            ₱
                            {formatNumberWithCommas(
                              displayedExistingQuotationTotal
                            )}
                          </span>
                          {!isFormReadonly && (
                            <Button
                              size="sm"
                              variant="link"
                              type="button"
                              disabled={isFormReadonly}
                              onClick={() =>
                                handleDeleteQuotation(existingQuotations[0].id!)
                              }
                              className="text-red-600 p-0 w-fit h-fit hover:text-red-700 hover:bg-red-50"
                            >
                              <X size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span>
                          Valid until:{" "}
                          {formatReadableDate(existingQuotations[0].end_date)}
                        </span>
                      </div>
                      {canSendQuotationEmail &&
                        quotationData &&
                        currentQuotationId && (
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={openQuotationEmailDialog}
                              disabled={isSendingQuotationEmail || isPending}
                              className="text-xs h-7"
                            >
                              {isSendingQuotationEmail ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Mail className="mr-1 h-3 w-3" />
                              )}
                              {hasPreviouslySentQuotation
                                ? "Send Again"
                                : "Send Email"}
                            </Button>
                            {hasPreviouslySentQuotation && (
                              <span className="text-[11px] text-amber-700">
                                This quotation has already been emailed.
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {(!isFormReadonly || quotationData) && (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant={quotationData ? "default" : "outline"}
                              size="sm"
                              onClick={handleCreateQuotation}
                              disabled={isPending || quotationsLoading}
                              className={`px-3 py-1 w-full text-xs flex items-center gap-1 ${quotationData
                                  ? "bg-green-600/10 hover:bg-green-700/10 text-black border"
                                  : ""
                                }`}
                            >
                              {!quotationData && (
                                <Plus size={12} strokeWidth={1.5} />
                              )}
                              {quotationData
                                ? "View/Edit Quotation"
                                : isCreatingQuotation
                                  ? "Edit Quotation"
                                  : existingQuotations &&
                                    existingQuotations.length > 0
                                    ? "Edit Existing Quotation"
                                    : "Create Quotation"}
                              {quotationData && (
                                <ChevronRight size={12} strokeWidth={1.5} />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">
                              {existingQuotations &&
                                existingQuotations.length > 0
                                ? "Edit the existing quotation for this job order. Only one quotation per job order is allowed."
                                : quotationData
                                  ? "View or edit the existing quotation for this job order."
                                  : "Create a quotation for this job order. Client details can be edited within the quotation dialog."}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-bold opacity-40">
                Material and Accessories
              </h2>
            </div>

            {/* Read-only Materials Display (All Items: Inventory + Manual Quotation) */}
            {quotationData?.quotation_items &&
              quotationData.quotation_items.length > 0 && (
                <div className="mb-4 px-4 py-3 bg-gray-50 border rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-700">
                      All Materials (Read-only)
                    </h3>
                    <span className="text-xs text-gray-500">
                      Updated via Quotation
                    </span>
                  </div>
                  <div className="grid grid-cols-[0.15fr_1fr_0.3fr_0.5fr_0.5fr] gap-4 text-xs">
                    <h4 className="font-medium text-gray-600">Type</h4>
                    <h4 className="font-medium text-gray-600">Material</h4>
                    <h4 className="font-medium text-gray-600">Quantity</h4>
                    <h4 className="font-medium text-gray-600">Unit Price</h4>
                    <h4 className="font-medium text-gray-600">Amount</h4>

                    {/* Inventory items from job order */}
                    {materials?.map((material, index) => (
                      <React.Fragment key={`inv-${index}`}>
                        <div className="flex items-center">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">
                            Inventory
                          </span>
                        </div>
                        <div className="text-gray-700">{material.material}</div>
                        <div className="text-gray-700">{material.quantity}</div>
                        <div className="text-gray-700">
                          ₱{material.unitPrice?.toFixed(2)}
                        </div>
                        <div className="text-gray-700 font-medium">
                          ₱
                          {(
                            (material.quantity || 0) * (material.unitPrice || 0)
                          ).toFixed(2)}
                        </div>
                      </React.Fragment>
                    ))}

                    {/* Manual items from quotation */}
                    {quotationData.quotation_items
                      .filter((item) => item.is_manual)
                      .map((item, index) => (
                        <React.Fragment key={`manual-${index}`}>
                          <div className="flex items-center">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                              Manual
                            </span>
                          </div>
                          <div className="text-gray-700">
                            {item.description}
                          </div>
                          <div className="text-gray-700">{item.qty}</div>
                          <div className="text-gray-700">
                            ₱{item.unit_price.toFixed(2)}
                          </div>
                          <div className="text-gray-700 font-medium">
                            ₱{item.amount.toFixed(2)}
                          </div>
                        </React.Fragment>
                      ))}
                  </div>
                </div>
              )}

            {/* Editable Inventory Materials Section */}
            <div className="grid grid-cols-[0.2fr_1fr_0.3fr_0.5fr_0.5fr_0.2fr] gap-4 px-4 py-3 border rounded-xl">
              <h2 className="text-sm">Used</h2>
              <h2 className="text-sm">Material (Inventory Only)</h2>
              <h2 className="text-sm">Quantity</h2>
              <h2 className="text-sm">Unit Price</h2>
              <h2 className="text-sm">Amount</h2>
              <h2></h2>
              {fields.map((item, index) => (
                <React.Fragment key={item.id}>
                  <FormField
                    control={form.control}
                    name={`materials.${index}.used`}
                    render={({ field }) => (
                      <FormItem className="space-y-0 w-full">
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={Boolean(field.value)}
                              onCheckedChange={(checked) =>
                                field.onChange(checked)
                              }
                              disabled={isFormReadonly}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`materials.${index}.material_id`}
                    render={({ field }) => (
                      <FormItem className="space-y-0 w-full">
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <MaterialCombobox
                              value={field.value ? String(field.value) : ""}
                              onChange={(value) => {
                                handleMaterialChange(index, Number(value));
                                field.onChange(String(value));
                              }}
                              materials={materialStocks}
                              disabled={isFormReadonly || !hasValidBranch}
                              branchId={branchId || 0}
                              key={`material-${index}-${branchId}`}
                              materialsJobOrder={materialsJobOrder}
                            />
                            {!hasValidBranch && (
                              <BranchWarning message={warningMessage} />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`materials.${index}.material`}
                    render={({ field }) => (
                      <FormItem className="space-y-0 w-full hidden">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`materials.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="space-y-0 w-full">
                        <FormControl>
                          <div className="flex items-center space-x-2 text-sm">
                            <button
                              type="button"
                              className="px-1 border rounded-full"
                              onClick={() => decrement(index)}
                              disabled={isFormReadonly}
                            >
                              -
                            </button>
                            <div className="text-center">{field.value}</div>
                            <button
                              type="button"
                              className="px-1 border rounded-full"
                              onClick={() => increment(index)}
                              disabled={isFormReadonly}
                            >
                              +
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`materials.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative">
                        <FormControl>
                          <div className="flex items-center">
                            <span className="absolute pointer-events-none text-sm">
                              ₱
                            </span>
                            <Input
                              placeholder="Price per unit"
                              className="ml-3 border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^0-9.]/g,
                                  ""
                                );
                                field.onChange(value ? parseFloat(value) : "");
                              }}
                              disabled
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-1">
                    <p className="text-sm">₱</p>
                    <p className="text-sm">
                      {isNaN(
                        form.watch(`materials.${index}.quantity`) *
                        form.watch(`materials.${index}.unitPrice`)
                      )
                        ? 0
                        : (
                          form.watch(`materials.${index}.quantity`) *
                          form.watch(`materials.${index}.unitPrice`)
                        ).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="text-xs p-2 h-fit self-center w-fit justify-self-center"
                    onClick={() => remove(index)}
                    disabled={isFormReadonly}
                  >
                    <Trash size={12} strokeWidth={1.5} />
                  </Button>
                </React.Fragment>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-dashed border-2 border-slate-800 col-span-2"
                onClick={() => {
                  if (canAddMaterial()) {
                    append({
                      material: "",
                      quantity: 1,
                      unitPrice: 0,
                      material_id: "",
                    });
                  } else {
                    alert(
                      "Please fill out all material fields before adding a new one."
                    );
                  }
                }}
                disabled={isFormReadonly}
              >
                <Plus size={14} strokeWidth={1.5} className="mr-2" />
                Add Material
              </Button>
              <div className="col-start-5">
                <h3 className="text-sm font-bold">Material Total</h3>
                {manualQuotationItemsPrice > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <span>Inventory:</span>
                      <span>₱{inventoryMaterialsPrice.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <span>Quotation Only:</span>
                        <span>₱{manualQuotationItemsPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                          id="include-manual-items"
                          checked={includeManualItemsInTotal}
                          onCheckedChange={(checked) =>
                            setIncludeManualItemsInTotal(Boolean(checked))
                          }
                          disabled={isFormReadonly}
                          className="h-3 w-3"
                        />
                        <label
                          htmlFor="include-manual-items"
                          className="text-xs text-gray-600 cursor-pointer"
                        >
                          Include in total
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t">
                      <p className="text-sm font-bold">₱</p>
                      <p className="text-sm">
                        {totalMaterialsPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold">₱</p>
                    <p className="text-sm">{totalMaterialsPrice.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
            {form.formState.errors.materials && (
              <p className="text-red-600 text-sm">
                {form.formState.errors.materials.message}
              </p>
            )}
            <div>
              <AccessoriesSection
                selectedAccessories={selectedAccessories}
                handleAccessorySelection={handleAccessorySelection}
                selectedMachineType={selectedMachineType}
              />
            </div>
          </div>
          {editSession && (
            <>
              <Separator className="mt-4" />
              <FormField
                control={form.control}
                name="technical_report"
                render={({ field }) => (
                  <FormItem className="space-y-0 w-full mt-2 mb-3">
                    <FormLabel>Technical Report</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the issues diagnosed and actions taken on the unit"
                        disabled={isFormReadonly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          <div className="flex md:flex-row flex-col md:justify-between mt-2">
            {!isFormReadonly && (
              <Button type="submit" disabled={isPending || !isFormChanged}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editSession ? "Updating.." : "Creating.."}
                  </>
                ) : editSession ? (
                  "Update Job Order"
                ) : (
                  "Create Job Order"
                )}
              </Button>
            )}
            <div className="w-fit px-5 py-3 bg-slate-100 rounded-lg flex flex-col mb-3 text-sm">
              <h2 className="mb-2 uppercase font-bold font-mono text-base">
                Job Order Summary
              </h2>
              <div className="py-3 mb-3 border-dashed border-y-2 border-gray-300">
                <p>Subtotal</p>
                <div className="flex justify-between">
                  <p className="opacity-60">Labor</p>
                  <p>
                    {laborTotal > 0
                      ? `₱${formatNumberWithCommas(laborTotal)}`
                      : "---"}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="opacity-60">Material</p>
                  <p>
                    {totalMaterialsPrice && totalMaterialsPrice > 0
                      ? `₱${formatNumberWithCommas(totalMaterialsPrice)}`
                      : "---"}
                  </p>
                </div>
                <div className="flex justify-between gap-8">
                  <p className="opacity-60">Discount</p>
                  {selectedDiscount ? (
                    <div className="flex items-center gap-1">
                      <Button
                        className="h-fit w-fit p-[1px] rounded-full"
                        size={"icon"}
                        variant={"destructive"}
                        onClick={() => setSelectedDiscount(null)}
                        disabled={isFormReadonly || isPending}
                      >
                        <X size={10} />
                      </Button>
                      <Button
                        className="h-fit w-fit p-0"
                        variant={"link"}
                        onClick={(e) => {
                          e.preventDefault();
                          setDiscountDialogOpen(true);
                        }}
                        disabled={isFormReadonly || isPending || !grandTotal}
                      >
                        ₱{formatNumberWithCommas(selectedDiscount)}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="h-fit w-fit p-0"
                      variant={"link"}
                      onClick={(e) => {
                        e.preventDefault();
                        setDiscountDialogOpen(true);
                      }}
                      disabled={isFormReadonly || isPending || !grandTotal}
                    >
                      Select a discount
                    </Button>
                  )}
                </div>
                <div className="flex justify-between items-start gap-4">
                  <p className="opacity-60 gap-1">Downpayment</p>
                  {downpaymentValue || downpaymentInputVisible ? (
                    <div className="flex-col items-end justify-end w-[115px]">
                      {readonly ? (
                        <p className="text-right">
                          ₱
                          {downpaymentValue !== null
                            ? formatNumberWithCommas(downpaymentValue)
                            : editValues.downpayment
                              ? formatNumberWithCommas(editValues.downpayment)
                              : "0"}
                        </p>
                      ) : (
                        <input
                          type="number"
                          value={downpaymentValue ?? ""}
                          onChange={handleDownpaymentChange}
                          className="w-full text-right placeholder:right bg-transparent focus:outline-none"
                          placeholder="Enter amount"
                          min="0"
                          disabled={isFormReadonly || isPending}
                        />
                      )}
                      {downpaymentError && !readonly && (
                        <p className="text-red-500 text-xs mt-1 text-right">
                          {downpaymentError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="h-fit w-fit p-0"
                      variant={"link"}
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddDownpayment();
                      }}
                      disabled={isFormReadonly || isPending || !grandTotal}
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
                  {selectedDiscount !== null &&
                    selectedDiscount !== undefined &&
                    selectedDiscount !== 0 && (
                      <p className="line-through text-xs text-right text-slate-500">
                        ₱{formatNumberWithCommas(grandTotal)}
                      </p>
                    )}
                </div>
              </div>
            </div>

          </div>

          {/* Billing Section - visible in readonly mode for non-technicians */}
          {isFormReadonly && editSession && jobOrderToEdit && (
            <JoBillingSection jobOrder={jobOrderToEdit} />
          )}
        </form>
      </Form>
      <DiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        grandTotal={grandTotal}
        onSelectDiscount={handleSelectDiscount}
      />
      <BillingImpactConfirmDialog
        open={billingImpactDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (billingImpactPending) return;
            setBillingImpactDialogOpen(false);
            setBillingImpactAction(null);
            setCloseAfterBillingImpact(false);
            return;
          }
          setBillingImpactDialogOpen(open);
        }}
        onProceed={handleBillingImpactProceed}
        isPending={billingImpactPending}
      />
      <PrintOptionsDialog
        open={printDialogOpen}
        onClose={() => {
          setPrintDialogOpen(false);
          setPostPrintReceiptSourceId(null);
          if (onClose) {
            onClose();
          }
        }}
        onSelectOption={(option) => {
          if (jobOrderDataForPrinting) {
            generatePDF(
              jobOrderDataForPrinting,
              option as "client" | "both" | "company" | null
            );
          }
        }}
        loading={isPrinting}
      />

      <QuotationDialog
        open={quotationDialogOpen}
        onOpenChange={setQuotationDialogOpen}
        onSave={handleSaveQuotation}
        initialData={quotationData || undefined}
        clientData={{
          name: form.getValues("name") || "",
          contact_number: form.getValues("contact_number") || "",
          email: form.getValues("email") || "",
          brand_model: form.getValues("brand_model") || "",
          serial_number: form.getValues("serial_number") || "",
          machine_type: form.getValues("machine_type") || "",
          problem_statement: form.getValues("problem_statement") || "",
        }}
        onClientDataChange={handleClientDataChange}
        jobOrderMaterials={reactiveMaterials}
        onMaterialsChange={handleMaterialsChange}
        selectedBranchId={watchedBranchId}
        jobOrderRate={form.getValues("rate") || 0}
        jobOrderAmount={form.getValues("amount") || 0}
        isManualRateMode={isManualRate}
        onLaborRateChange={(rate) => {
          form.setValue("rate", rate);
        }}
        onAmountChange={(amount) => {
          form.setValue("amount", amount);
        }}
        onRateModeChange={(isManual) => {
          setIsManualRate(isManual);
        }}
        jobOrderWarrantyMonths={form.getValues("warranty_months") ?? 1}
        onWarrantyMonthsChange={(months) => {
          form.setValue("warranty_months", months);
        }}
        jobOrderDiscount={selectedDiscount ?? 0}
        onDiscountChange={(discount) => {
          setSelectedDiscount(discount);
        }}
        jobOrderDownpayment={downpaymentValue ?? 0}
        onDownpaymentChange={(downpayment) => {
          setDownpaymentValueStrict(downpayment);
        }}
      />

      <PrintSelectionDialog
        open={printSelectionDialogOpen}
        onClose={() => {
          setPrintSelectionDialogOpen(false);
          setPostPrintReceiptSourceId(null);
          if (onClose) onClose();
        }}
        onSelectOption={handlePrintSelection}
        loading={isPrinting}
      />

      <QuotationPrintDialog
        open={quotationPrintDialogOpen}
        onClose={() => {
          console.log("[PrintFlow] Quotation print prompt dismissed");
          setQuotationPrintDialogOpen(false);
          setQuotationActionDialogInitialAction("print");
          setQuotationEmailError(null);
          setPostPrintReceiptSourceId(null);
          if (closeParentOnQuotationActionDialogClose && onClose) {
            onClose();
          }
          setCloseParentOnQuotationActionDialogClose(false);
        }}
        onPrint={() => {
          console.log("[PrintFlow] Quotation print prompt confirmed");
          if (quotationData) {
            generateQuotationPDF(quotationData);
          }
        }}
        onDownload={() => {
          if (quotationData) {
            downloadQuotationPDF(quotationData);
          }
        }}
        onSendEmail={handleSendQuotationByEmail}
        loading={isPrinting}
        isSendingEmail={isSendingQuotationEmail}
        canSendEmail={canSendQuotationEmail}
        defaultRecipient={quotationEmailRecipient}
        defaultCc=""
        defaultBcc=""
        defaultSubject={QUOTATION_EMAIL_SUBJECT_DEFAULT}
        defaultMessage={quotationEmailDefaultMessage}
        initialAction={quotationActionDialogInitialAction}
        hasSentBefore={hasPreviouslySentQuotation}
        emailError={quotationEmailError}
      />
      <ReceiptMissingConfirmDialog
        open={postPrintReceiptPromptOpen}
        onOpenChange={setPostPrintReceiptPromptOpen}
        title="Attach Receipt or Document"
        description="Would you like to attach a receipt or supporting document now?"
        onAttachNow={() => {
          setPostPrintReceiptPromptOpen(false);
          postPrintReceiptInputRef.current?.click();
        }}
        onContinueWithoutReceipt={() => {
          clearPostPrintReceiptPrompt();
          if (onClose) {
            onClose();
          }
        }}
      />
      <input
        ref={postPrintReceiptInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        disabled={isUploadingPostPrintReceipt}
        onChange={(event) =>
          void handlePostPrintReceiptUpload(event.target.files?.[0] || null)
        }
      />
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

      <QuotationDeleteDialog
        open={quotationDeleteDialogOpen}
        onOpenChange={setQuotationDeleteDialogOpen}
        onConfirm={confirmDeleteQuotation}
        loading={isPending}
      />
    </>
  );
}
