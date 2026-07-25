import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash, Clock, X, Check, ChevronsUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getMaterialStocks } from "../../services/apiMaterials";
import { useBranchValidation } from "../../hooks/useBranchValidation";
import { BranchWarning } from "../ui/branch-warning";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import DiscountDialog from "./discount-option-dialog";
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
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import {
  QuotationItem,
  CreateQuotationData,
  MaterialStocks,
} from "../../lib/types";
import { formatNumberWithCommas } from "../../lib/helpers";
import { cn } from "../../lib/utils";
import { supabase } from "../../services/supabase";
import {
  computeQuotationTotal,
  resolveQuotationDownpayment,
} from "../../lib/quotation-totals";
import { getServerNow } from "../../lib/server-time";

const quotationItemSchema = z
  .object({
    description: z.string().min(1, "Description is required"),
    qty: z.number().min(1, "Quantity must be at least 1"),
    unit_price: z.number().min(0, "Unit price must be non-negative"),
    amount: z.number().min(0, "Amount must be non-negative"),
    material_id: z.string().optional(),
    is_manual: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If it's manual, material_id is optional, otherwise it's required
      if (data.is_manual) {
        return true; // Manual items don't need material_id
      }
      return data.material_id && data.material_id.trim() !== "";
    },
    {
      message: "Please select an inventory item or enable manual input",
      path: ["material_id"],
    }
  );

// Function to validate quote number uniqueness
const validateQuoteNumberUniqueness = async (
  quoteNo: string
): Promise<boolean> => {
  if (!quoteNo || quoteNo.trim() === "") return true; // Empty is valid (will be auto-generated)

  try {
    const { data, error } = await supabase
      .from("quotations")
      .select("quote_no")
      .eq("quote_no", quoteNo.trim())
      .single();

    if (error && error.code === "PGRST116") {
      // No rows found - quote number is unique
      return true;
    }

    if (data) {
      // Quote number already exists
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating quote number:", error);
    return false;
  }
};

const quotationSchema = z.object({
  company: z.string().optional(),
  address: z.string().optional(),
  validity_months: z.number().min(1, "Validity period is required"),
  labor_rate: z.number().min(0, "Labor rate must be non-negative"),
  amount: z.number().min(0, "Amount must be non-negative"),
  note: z.string().optional(),
  quotation_items: z.array(quotationItemSchema).optional(),
  auto_generate_quote_no: z.boolean().default(true),
  manual_quote_no: z
    .string()
    .optional()
    .refine(
      async (value) => {
        if (!value || value.trim() === "") return true;
        return await validateQuoteNumberUniqueness(value);
      },
      {
        message:
          "Quote number already exists. Please choose a different number.",
      }
    ),
});

type QuotationFormData = z.infer<typeof quotationSchema>;

interface QuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (quotationData: CreateQuotationData) => void;
  initialData?: Partial<CreateQuotationData>;
  clientData?: {
    name: string;
    contact_number: string;
    email: string;
    brand_model: string;
    serial_number: string;
    machine_type: string;
    problem_statement: string;
  };
  onClientDataChange?: (clientData: {
    name: string;
    contact_number: string;
    email: string;
    brand_model: string;
    serial_number: string;
    machine_type: string;
    problem_statement: string;
  }) => void;
  jobOrderMaterials?: Array<{
    material: string;
    quantity: number;
    unitPrice: number;
    material_id: string;
  }>;
  onMaterialsChange?: (
    materials: Array<{
      material: string;
      quantity: number;
      unitPrice: number;
      material_id: string;
    }>
  ) => void;
  selectedBranchId?: number | null;
  jobOrderRate?: number;
  jobOrderAmount?: number;
  onLaborRateChange?: (rate: number) => void;
  onAmountChange?: (amount: number) => void;
  isManualRateMode?: boolean;
  onRateModeChange?: (isManual: boolean) => void;
  jobOrderWarrantyMonths?: number;
  onWarrantyMonthsChange?: (months: number) => void;
  jobOrderDiscount?: number;
  onDiscountChange?: (discount: number) => void;
  jobOrderDownpayment?: number;
  onDownpaymentChange?: (downpayment: number) => void;
}

const validityOptions = [
  { label: "No warranty", value: 0 },
  { label: "1 Month", value: 1 },
  { label: "2 Months", value: 2 },
  { label: "3 Months", value: 3 },
];

const rateOptions = [
  { label: "Walk-in Service", value: 1500 },
  { label: "Walk-in Check-up", value: 250 },
  { label: "Walk-in CISS", value: 600 },
  { label: "Office/Home Service", value: 2000 },
  { label: "Office/Home Check-up", value: 500 },
  { label: "Office/Home CISS", value: 1100 },
  { label: "Return for Warranty", value: 0 },
];

interface InventoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  materials: MaterialStocks[] | undefined;
  disabled: boolean;
  branchId: number | null | undefined;
  quotationItems: QuotationItem[];
}

const InventoryCombobox: React.FC<InventoryComboboxProps> = ({
  value,
  onChange,
  materials,
  disabled,
  branchId,
  quotationItems,
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
      const isMaterialSelected = quotationItems.some(
        (item) => String(item.material_id) === String(stock.id)
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
    ? `${selectedMaterial.material_name}${
        selectedMaterial.brand ? ` - ${selectedMaterial.brand}` : ""
      }`
    : "Select inventory item";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit"
          disabled={disabled}
        >
          <span className="truncate max-w-[200px] text-left">
            {value ? selectedMaterialName : "Select inventory item"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]" align="start">
        <Command>
          <CommandInput
            placeholder="Search inventory..."
            onValueChange={setSearchValue}
          />
          <CommandEmpty>No inventory item found.</CommandEmpty>
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

export default function QuotationDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  clientData,
  onClientDataChange,
  jobOrderMaterials = [],
  onMaterialsChange,
  selectedBranchId,
  jobOrderRate = 0,
  jobOrderAmount = 0,
  onLaborRateChange,
  onAmountChange,
  isManualRateMode = false,
  onRateModeChange,
  jobOrderWarrantyMonths = 1,
  onWarrantyMonthsChange,
  jobOrderDiscount = 0,
  onDiscountChange,
  jobOrderDownpayment = 0,
  onDownpaymentChange,
}: QuotationDialogProps) {
  const [discount, setDiscount] = useState(
    Number(initialData?.discount ?? jobOrderDiscount ?? 0)
  );
  const [downpayment, setDownpayment] = useState(
    Number(
      resolveQuotationDownpayment(
        initialData?.downpayment,
        jobOrderDownpayment
      ) ?? 0
    )
  );
  const [downpaymentInputVisible, setDownpaymentInputVisible] = useState(
    Number(
      resolveQuotationDownpayment(
        initialData?.downpayment,
        jobOrderDownpayment
      ) ?? 0
    ) > 0
  );
  const [downpaymentError, setDownpaymentError] = useState<string | null>(null);
  const [laborRate, setLaborRate] = useState(
    initialData?.labor_rate || jobOrderRate || 0
  );
  const [amount, setAmount] = useState(initialData?.amount || jobOrderAmount || 0);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [isManualRate, setIsManualRate] = useState(isManualRateMode);
  const [validityMonths, setValidityMonths] = useState(
    jobOrderWarrantyMonths ?? 1
  );
  const [savedFixedRate, setSavedFixedRate] = useState(jobOrderRate);
  const [specifyInputValue, setSpecifyInputValue] = useState("");
  const [editedClientData, setEditedClientData] = useState(
    clientData || {
      name: "",
      contact_number: "",
      email: "",
      brand_model: "",
      serial_number: "",
      machine_type: "",
      problem_statement: "",
    }
  );

  // Ref to prevent infinite sync loops
  const isSyncingRef = useRef(false);

  const updateDiscountValue = useCallback(
    (nextDiscount: number) => {
      const normalizedDiscount = Math.max(Number(nextDiscount || 0), 0);
      setDiscount(normalizedDiscount);
      if (onDiscountChange) {
        onDiscountChange(normalizedDiscount);
      }
    },
    [onDiscountChange]
  );

  // Branch validation - use the selected branch from job order form
  const { branchId, hasValidBranch, warningMessage } =
    useBranchValidation(selectedBranchId);

  // Watch for branch changes in the parent form (if any)
  const [currentBranchId, setCurrentBranchId] = useState(branchId);

  useEffect(() => {
    setCurrentBranchId(branchId);
  }, [branchId]);

  // Fetch material stocks for inventory selection
  const { data: materialStocks } = useQuery({
    queryKey: ["material_stocks", { branchId: currentBranchId }],
    queryFn: () => getMaterialStocks({ fetchAll: false }),
  });

  // Update editedClientData when clientData prop changes
  useEffect(() => {
    if (clientData) {
      setEditedClientData(clientData);
    }
  }, [clientData]);

  const buildInitialQuotationItems = useCallback(
    (itemsFromInitialData?: QuotationItem[]) => {
      if (itemsFromInitialData && itemsFromInitialData.length > 0) {
        return itemsFromInitialData.map((item) => ({
          ...item,
          is_manual: item.is_manual ?? false,
        }));
      }

      // Otherwise, create from job order materials (inventory-based only)
      const items: QuotationItem[] = [];

      // Add materials from job order that have material_id (inventory items)
      jobOrderMaterials.forEach((material) => {
        if (material.material && material.quantity > 0 && material.material_id) {
          items.push({
            description: material.material,
            qty: material.quantity,
            unit_price: material.unitPrice,
            amount: material.quantity * material.unitPrice,
            material_id: material.material_id,
            is_manual: false,
          });
        }
      });

      return items;
    },
    [jobOrderMaterials]
  );

  // Create initial quotation items from existing data or job order materials
  const createInitialQuotationItems = () => {
    const fromInitialData = initialData?.quotation_items as QuotationItem[] | undefined;
    return buildInitialQuotationItems(fromInitialData);
  };

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      company: initialData?.company || "",
      address: initialData?.address || "",
      validity_months: jobOrderWarrantyMonths ?? 1,
      labor_rate: initialData?.labor_rate || jobOrderRate || 0,
      amount: initialData?.amount || jobOrderAmount || 0,
      note: initialData?.note || "",
      quotation_items: createInitialQuotationItems(),
      auto_generate_quote_no:
        !initialData?.quote_no || initialData?.quote_no === "", // Auto-generate if no existing quote_no
      manual_quote_no: initialData?.quote_no || "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "quotation_items",
  });

  const watchedItems = form.watch("quotation_items") || [];

  const quotationTotals = computeQuotationTotal({
    labor_rate: laborRate,
    labor_amount: amount,
    quotation_items: watchedItems,
    discount,
    downpayment,
  });

  const materialTotal = quotationTotals.material_total;
  const subtotal = quotationTotals.subtotal;
  const totalQuote = quotationTotals.grand_total;

  const setDownpaymentStrict = (nextDownpayment: number) => {
    const normalizedDownpayment = Math.max(Number(nextDownpayment || 0), 0);
    const maxDownpayment = Math.max(
      Number(quotationTotals.total_before_downpayment || 0),
      0
    );

    if (normalizedDownpayment > maxDownpayment) {
      setDownpaymentError("Downpayment cannot exceed the total amount.");
      return false;
    }

    setDownpaymentError(null);
    setDownpayment(normalizedDownpayment);
    if (onDownpaymentChange) {
      onDownpaymentChange(normalizedDownpayment);
    }
    return true;
  };

  const handleAddDownpayment = () => {
    setDownpaymentInputVisible(true);
  };

  useEffect(() => {
    console.log("Labor:", quotationTotals.labor_total);
    console.log("Materials:", quotationTotals.material_total);
    console.log("Final:", quotationTotals.grand_total);
  }, [
    quotationTotals.labor_total,
    quotationTotals.material_total,
    quotationTotals.grand_total,
  ]);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const initialDiscount = Number(
        jobOrderDiscount ?? initialData?.discount ?? 0
      );
      const initialDownpayment = Number(
        resolveQuotationDownpayment(
          initialData?.downpayment,
          jobOrderDownpayment
        ) ?? 0
      );
      const initialLaborRate = Number(
        initialData?.labor_rate || jobOrderRate || 0
      );
      const initialAmount = Number(initialData?.amount || jobOrderAmount || 0);
      const initialValidityMonths = Number(jobOrderWarrantyMonths ?? 1);
      const initialItems = buildInitialQuotationItems(
        initialData?.quotation_items as QuotationItem[] | undefined
      );

      setDiscount(initialDiscount);
      setDownpayment(initialDownpayment);
      setDownpaymentInputVisible(initialDownpayment > 0);
      setDownpaymentError(null);
      setLaborRate(initialLaborRate);
      setAmount(initialAmount);
      setValidityMonths(initialValidityMonths);

      form.reset({
        company: initialData?.company || "",
        address: initialData?.address || "",
        validity_months: initialValidityMonths,
        labor_rate: initialLaborRate,
        amount: initialAmount,
        note: initialData?.note || "",
        quotation_items: initialItems,
        auto_generate_quote_no:
          !initialData?.quote_no || initialData?.quote_no === "",
        manual_quote_no: initialData?.quote_no || "",
      });
    }

    wasOpenRef.current = open;
  }, [
    open,
    initialData?.company,
    initialData?.address,
    initialData?.quote_no,
    initialData?.note,
    initialData?.discount,
    initialData?.downpayment,
    initialData?.labor_rate,
    initialData?.amount,
    initialData?.quotation_items,
    jobOrderDiscount,
    jobOrderDownpayment,
    buildInitialQuotationItems,
    jobOrderWarrantyMonths,
    jobOrderRate,
    jobOrderAmount,
    form,
  ]);

  useEffect(() => {
    if (!open) return;

    const normalizedDiscount = Number(jobOrderDiscount || 0);
    if (normalizedDiscount !== discount) {
      setDiscount(normalizedDiscount);
    }
  }, [open, jobOrderDiscount, discount]);

  useEffect(() => {
    if (!open || initialData?.downpayment !== undefined) return;

    const normalizedDownpayment = Number(jobOrderDownpayment || 0);
    if (normalizedDownpayment !== downpayment) {
      setDownpayment(normalizedDownpayment);
      setDownpaymentError(null);
    }
    if (normalizedDownpayment > 0) {
      setDownpaymentInputVisible(true);
    }
  }, [open, initialData?.downpayment, jobOrderDownpayment, downpayment]);

  // Sync labor rate and amount with job order
  useEffect(() => {
    if (jobOrderRate !== undefined && jobOrderRate !== laborRate) {
      setLaborRate(jobOrderRate);
      form.setValue("labor_rate", jobOrderRate);
    }
  }, [jobOrderRate, laborRate, form]);

  useEffect(() => {
    if (jobOrderAmount !== undefined && jobOrderAmount !== amount) {
      setAmount(jobOrderAmount);
      form.setValue("amount", jobOrderAmount);
    }
  }, [jobOrderAmount, amount, form]);

  // Sync manual rate mode from job order form
  useEffect(() => {
    if (isManualRateMode !== isManualRate) {
      setIsManualRate(isManualRateMode);
    }
  }, [isManualRateMode, isManualRate]);

  // Sync warranty/validity months from job order to quotation (Job Order -> Quotation)
  useEffect(() => {
    const currentValidityMonths = form.getValues("validity_months");
    if (
      jobOrderWarrantyMonths !== undefined &&
      jobOrderWarrantyMonths !== currentValidityMonths
    ) {
      setValidityMonths(jobOrderWarrantyMonths);
      form.setValue("validity_months", jobOrderWarrantyMonths);
    }
  }, [jobOrderWarrantyMonths, form]);

  // Bidirectional sync with conflict prevention
  useEffect(() => {
    if (!open) return;

    console.log(
      "Quotation dialog received jobOrderMaterials:",
      jobOrderMaterials
    );
    console.log("isSyncingRef.current:", isSyncingRef.current);

    if (isSyncingRef.current) {
      console.log("Skipping sync - already syncing");
      return; // Prevent infinite loops
    }
    if (!jobOrderMaterials) {
      console.log("Skipping sync - no material payload");
      return;
    }

    console.log("Starting sync from job order to quotation");

    // Debounce the sync to prevent conflicts with user input
    const timeoutId = setTimeout(() => {
      // Get current quotation items to preserve manual items
      const currentItems = form.getValues("quotation_items") || [];

      // Preserve manual items and in-progress inventory rows (no material_id yet)
      const manualItems = currentItems.filter((item) => item.is_manual);
      const draftInventoryItems = currentItems.filter(
        (item) => !item.is_manual && !item.material_id
      );

      // Convert job order materials to quotation items (inventory only)
      const inventoryItems: QuotationItem[] = jobOrderMaterials
        .filter((material) => material.material_id)
        .map((material) => ({
          description: material.material,
          qty: material.quantity,
          unit_price: material.unitPrice,
          amount: material.quantity * material.unitPrice,
          material_id: material.material_id,
          is_manual: false, // Items from job order are inventory-based
        }));

      // Combine preserved draft rows with updated inventory items from JO
      const updatedItems = [...manualItems, ...draftInventoryItems, ...inventoryItems];

      console.log("Preserving manual items:", manualItems);
      console.log("Preserving draft inventory items:", draftInventoryItems);
      console.log("Adding inventory items:", inventoryItems);
      console.log("Combined quotation items:", updatedItems);

      // Set sync flag
      isSyncingRef.current = true;

      // Update quotation items with combined items (manual + inventory)
      replace(updatedItems);
      form.setValue("quotation_items", updatedItems);

      console.log("Quotation dialog updated with preserved manual items");

      // Reset sync flag after a short delay
      setTimeout(() => {
        isSyncingRef.current = false;
        console.log("Sync flag reset");
      }, 100);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [
    open,
    jobOrderMaterials,
    form,
    replace,
    initialData?.quotation_items,
  ]);

  useEffect(() => {
    if (!open) return;

    const maxDownpayment = Math.max(
      Number(quotationTotals.total_before_downpayment || 0),
      0
    );
    if (downpayment <= maxDownpayment) {
      setDownpaymentError(null);
      return;
    }

    setDownpaymentStrict(maxDownpayment);
  }, [open, downpayment, quotationTotals.total_before_downpayment]);

  const handleItemChange = (
    index: number,
    field: keyof QuotationItem,
    value: string | number
  ) => {
    const items = [...(form.getValues("quotation_items") || [])];
    if (!items[index]) return;
    items[index] = { ...items[index], [field]: value };

    // Auto-calculate amount when qty or unit_price changes
    if (field === "qty" || field === "unit_price") {
      const qty = field === "qty" ? Number(value) : items[index].qty;
      const unitPrice =
        field === "unit_price" ? Number(value) : items[index].unit_price;
      items[index].amount = qty * unitPrice;
    }

    // Update form without triggering focus loss
    if (field === "description") {
      form.setValue(`quotation_items.${index}.description`, value as string);
    } else if (field === "qty") {
      form.setValue(`quotation_items.${index}.qty`, value as number);
    } else if (field === "unit_price") {
      form.setValue(`quotation_items.${index}.unit_price`, value as number);
    }

    if (field === "qty" || field === "unit_price") {
      form.setValue(`quotation_items.${index}.amount`, items[index].amount);
    }

    // Sync materials back to job order form
    handleMaterialsChange(items);
  };

  const handleAddItem = () => {
    append({
      description: "",
      qty: 1,
      unit_price: 0,
      amount: 0,
      material_id: "",
      is_manual: false,
    });
  };

  const handleRemoveItem = (index: number) => {
    if ((fields || []).length > 1) {
      remove(index);
      // Sync materials after removing
      setTimeout(() => {
        const currentItems = form.getValues("quotation_items");
        handleMaterialsChange(currentItems || []);
      }, 0);
    }
  };

  const handleInventorySelection = (index: number, materialId: string) => {
    const selectedMaterial = materialStocks?.find(
      (stock) => String(stock.id) === materialId
    );

    if (selectedMaterial) {
      // Update the form with the selected material details
      form.setValue(`quotation_items.${index}.material_id`, materialId);
      form.setValue(
        `quotation_items.${index}.description`,
        selectedMaterial.material_name
      );
      form.setValue(
        `quotation_items.${index}.unit_price`,
        selectedMaterial.price
      );

      // Recalculate amount
      const currentQty = form.getValues(`quotation_items.${index}.qty`) || 1;
      const newAmount = currentQty * selectedMaterial.price;
      form.setValue(`quotation_items.${index}.amount`, newAmount);

      // Sync with latest quotation item values
      const items = form.getValues("quotation_items") || [];

      // Sync materials back to job order form
      handleMaterialsChange(items);
    }
  };

  const handleManualToggle = (index: number, isManual: boolean) => {
    // Update the manual flag
    form.setValue(`quotation_items.${index}.is_manual`, isManual);

    if (isManual) {
      // Clear material_id when switching to manual
      form.setValue(`quotation_items.${index}.material_id`, "");
      // Enable editing of description and unit_price
    } else {
      // Clear description and unit_price when switching to inventory
      form.setValue(`quotation_items.${index}.description`, "");
      form.setValue(`quotation_items.${index}.unit_price`, 0);
      // Recalculate amount
      form.setValue(`quotation_items.${index}.amount`, 0);
    }

    const items = form.getValues("quotation_items") || [];

    // Sync materials back to job order form
    handleMaterialsChange(items);
  };

  const handleSelectDiscount = (discount: number) => {
    updateDiscountValue(discount);
    setDiscountDialogOpen(false);
  };

  const handleDownpaymentInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawValue = event.target.value.trim();
    if (rawValue === "") {
      setDownpaymentError(null);
      setDownpayment(0);
      if (onDownpaymentChange) {
        onDownpaymentChange(0);
      }
      return;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      setDownpaymentError("Enter a valid downpayment amount.");
      return;
    }

    setDownpaymentStrict(parsedValue);
  };

  const getValidityEndDate = (months: number) => {
    const endDate = getServerNow();
    endDate.setMonth(endDate.getMonth() + months);
    return endDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleClientDataChange = (field: string, value: string) => {
    setEditedClientData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Immediately update the parent form
    if (onClientDataChange) {
      const updatedData = { ...editedClientData, [field]: value };
      onClientDataChange(updatedData);
    }
  };

  const handleMaterialsChange = (
    updatedMaterials: QuotationItem[] | undefined
  ) => {
    // Prevent infinite loops
    if (isSyncingRef.current) return;

    console.log(
      "Quotation dialog syncing materials to job order:",
      updatedMaterials
    );

    // Only sync non-manual items to job order
    const inventoryItems = (updatedMaterials || []).filter(
      (item) => !item.is_manual && item.material_id
    );

    // Convert quotation items to job order material format
    const nextJobOrderMaterials = inventoryItems.map((item) => ({
      material: item.description,
      quantity: item.qty,
      unitPrice: item.unit_price,
      material_id: item.material_id!,
    }));

    console.log(
      "Converted to job order format (inventory only):",
      nextJobOrderMaterials
    );

    // Sync materials back to job order form
    if (onMaterialsChange) {
      console.log("Calling onMaterialsChange with:", nextJobOrderMaterials);
      onMaterialsChange(nextJobOrderMaterials);
    } else {
      console.log("onMaterialsChange is not available");
    }
  };

  // DISABLED: Auto-sync from quotation to job order to prevent quantity conflicts
  // Manual sync will happen only when user explicitly saves the quotation

  const onSubmit = (data: QuotationFormData) => {
    if (downpaymentError) {
      return;
    }

    // Calculate end date based on validity months
    const endDate = getServerNow();
    endDate.setMonth(endDate.getMonth() + data.validity_months);

    const computedTotals = computeQuotationTotal({
      labor_rate: data.labor_rate,
      labor_amount: data.amount,
      quotation_items: data.quotation_items || [],
      discount,
      downpayment,
    });

    console.log("Labor:", computedTotals.labor_total);
    console.log("Materials:", computedTotals.material_total);
    console.log("Final:", computedTotals.grand_total);

    const quotationData: CreateQuotationData = {
      quote_no: data.auto_generate_quote_no ? "" : data.manual_quote_no || "", // Empty string for auto-generation, manual value otherwise
      job_order_id: 0, // Will be set when job order is created
      end_date: endDate.toISOString().split("T")[0],
      company: data.company || "",
      address: data.address || "",
      note: data.note || "",
      subtotal: computedTotals.subtotal,
      discount: computedTotals.discount,
      downpayment: computedTotals.downpayment,
      labor_rate: computedTotals.labor_rate,
      amount: computedTotals.labor_amount,
      service_fee: computedTotals.service_fee,
      total_quote: computedTotals.grand_total,
      quotation_items: data.quotation_items || [],
      auto_generate_quote_no: data.auto_generate_quote_no,
      manual_quote_no: data.manual_quote_no,
    };

    // Manual sync: Update job order form with quotation materials when saving
    // Only sync inventory items (non-manual) to job order
    const inventoryItems = (data.quotation_items || []).filter(
      (item) => !item.is_manual && item.material_id && item.material_id !== ""
    );
    handleMaterialsChange(inventoryItems);

    onSave(quotationData);
    onOpenChange(false); // Close the dialog after saving
  };

  const date = getServerNow().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold">
            {initialData?.quote_no
              ? `Edit Quotation #${initialData.quote_no}`
              : "Create Quotation"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header with date */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="px-3 py-1 bg-gray-200 rounded-full text-gray-600 text-xs w-fit flex items-center gap-1">
                <Clock size={12} strokeWidth={1.5} />
                {date}
              </div>
            </div>

            {/* Client Name - matches job order form */}
            <div>
              <FormControl>
                <Input
                  className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-3xl text-3xl font-bold rounded-none mb-2"
                  placeholder="Client Name"
                  autoFocus
                  value={editedClientData.name}
                  onChange={(e) =>
                    handleClientDataChange("name", e.target.value)
                  }
                />
              </FormControl>
            </div>

            {/* Basic Information */}
            <div>
              <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
                Basic Information
              </h2>
              <div className="grid md:grid-cols-2 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
                <div className="space-y-0">
                  <FormLabel>Contact No.</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Client Contact"
                      className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={editedClientData.contact_number}
                      onChange={(e) => {
                        let input = e.target.value.replace(/[^0-9+]/g, "");
                        if (!input.startsWith("+63")) {
                          input = "+63";
                        }
                        let digits = input.substring(3).replace(/\D/g, "");
                        digits = digits.substring(0, 10);
                        let formattedInput = `+63 ${digits.substring(
                          0,
                          3
                        )} ${digits.substring(3, 6)} ${digits.substring(
                          6,
                          10
                        )}`.trim();
                        formattedInput = formattedInput.substring(0, 16);
                        handleClientDataChange(
                          "contact_number",
                          formattedInput
                        );
                      }}
                    />
                  </FormControl>
                </div>
                <div className="space-y-0">
                  <FormLabel>Client Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Client Email"
                      className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={editedClientData.email}
                      onChange={(e) =>
                        handleClientDataChange("email", e.target.value)
                      }
                    />
                  </FormControl>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div>
              <div className="grid lg:grid-cols-2 grid-cols-1 lg:gap-10 gap-2">
                <div>
                  <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
                    Order Details
                  </h2>
                  <div className="space-y-0 border-b py-2">
                    <div className="space-y-0 flex justify-between items-center w-full">
                      <FormLabel>Brand Model</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Brother MFC-J4335DW"
                          className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                          value={editedClientData.brand_model}
                          onChange={(e) =>
                            handleClientDataChange(
                              "brand_model",
                              e.target.value
                            )
                          }
                        />
                      </FormControl>
                    </div>
                  </div>
                  <div className="space-y-0 border-b py-2">
                    <div className="space-y-0 flex justify-between items-center w-full">
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., XYZ123456789"
                          className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                          value={editedClientData.serial_number}
                          onChange={(e) =>
                            handleClientDataChange(
                              "serial_number",
                              e.target.value
                            )
                          }
                        />
                      </FormControl>
                    </div>
                  </div>
                  <div className="space-y-0 border-b py-2">
                    <div className="space-y-0 flex justify-between items-center w-full">
                      <FormLabel>Machine Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          handleClientDataChange("machine_type", value);
                        }}
                        value={editedClientData.machine_type}
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
                    {editedClientData.machine_type === "others" && (
                      <Input
                        placeholder="Specify machine type"
                        value={specifyInputValue}
                        onChange={(e) => {
                          setSpecifyInputValue(e.target.value);
                          handleClientDataChange(
                            "machine_type",
                            e.target.value
                          );
                        }}
                        className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-full text-right"
                      />
                    )}
                  </div>
                  <div className="space-y-0 w-full my-3">
                    <FormLabel>Problem Statement</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the issue"
                        value={editedClientData.problem_statement}
                        onChange={(e) =>
                          handleClientDataChange(
                            "problem_statement",
                            e.target.value
                          )
                        }
                      />
                    </FormControl>
                  </div>
                </div>
                <div>
                  <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
                    Company Information
                  </h2>
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem className="border-b py-2">
                        <div className="space-y-0 flex justify-between items-center w-full">
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter company name"
                              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
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
                    name="address"
                    render={({ field }) => (
                      <FormItem className="border-b py-2">
                        <div className="space-y-0 flex justify-between items-center w-full">
                          <FormLabel>Company Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter company address"
                              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="text-right" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Validity and Note */}
            <div>
              <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
                Quotation Details
              </h2>
              <div className="px-4 py-2 border rounded-xl space-y-4">
                <FormField
                  control={form.control}
                  name="labor_rate"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Labor Rate</FormLabel>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className="group inline-flex items-center gap-2"
                            data-state={isManualRate ? "checked" : "unchecked"}
                          >
                            <span
                              className="group-data-[state=checked]:text-muted-foreground/70 cursor-pointer text-right text-xs font-medium"
                              onClick={() => {
                                setIsManualRate(false);
                                if (onRateModeChange) {
                                  onRateModeChange(false);
                                }
                                // Restore saved fixed rate
                                if (savedFixedRate) {
                                  field.onChange(savedFixedRate);
                                  setLaborRate(savedFixedRate);
                                  if (onLaborRateChange) {
                                    onLaborRateChange(savedFixedRate);
                                  }
                                }
                              }}
                            >
                              Fixed
                            </span>
                            <Switch
                              checked={isManualRate}
                              onCheckedChange={(checked) => {
                                setIsManualRate(checked);
                                if (onRateModeChange) {
                                  onRateModeChange(checked);
                                }
                                // When switching to fixed, restore saved rate
                                if (!checked && savedFixedRate) {
                                  field.onChange(savedFixedRate);
                                  setLaborRate(savedFixedRate);
                                  if (onLaborRateChange) {
                                    onLaborRateChange(savedFixedRate);
                                  }
                                }
                              }}
                            />
                            <span
                              className="group-data-[state=unchecked]:text-muted-foreground/70 cursor-pointer text-left text-xs font-medium"
                              onClick={() => {
                                setIsManualRate(true);
                                if (onRateModeChange) {
                                  onRateModeChange(true);
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
                                setLaborRate(rateValue);
                                setSavedFixedRate(rateValue);
                                // Sync back to job order form
                                if (onLaborRateChange) {
                                  onLaborRateChange(rateValue);
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                                  <SelectValue placeholder="Select Service Type" />
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
                                  const rateValue = value
                                    ? parseFloat(value)
                                    : 0;
                                  field.onChange(rateValue);
                                  setLaborRate(rateValue);
                                  // Sync back to job order form
                                  if (onLaborRateChange) {
                                    onLaborRateChange(rateValue);
                                  }
                                }}
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
                        <div className="flex items-center">
                          <span className="absolute pointer-events-none text-sm mr-1">
                            ₱
                          </span>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="ml-3 border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                              {...field}
                              onChange={(e) => {
                                const amountValue = Number(e.target.value) || 0;
                                field.onChange(amountValue);
                                setAmount(amountValue);
                                // Sync back to job order form
                                if (onAmountChange) {
                                  onAmountChange(amountValue);
                                }
                              }}
                            />
                          </FormControl>
                        </div>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validity_months"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Validity Period</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            const months = Number(value);
                            field.onChange(months);
                            setValidityMonths(months);
                            // Sync back to job order form (Quotation -> Job Order)
                            if (onWarrantyMonthsChange) {
                              onWarrantyMonthsChange(months);
                            }
                          }}
                          value={field.value !== undefined ? field.value.toString() : "1"}
                        >
                          <FormControl>
                            <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                              <SelectValue placeholder="Select validity period" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent align="end">
                            <SelectGroup>
                              <SelectLabel>Validity Period</SelectLabel>
                              {validityOptions.map((option) => (
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
                      </div>
                      <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg mt-2">
                        <span className="font-medium">Valid until: </span>
                        {getValidityEndDate(validityMonths)}
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />

                {/* Quote Number Section */}
                <div className="border-b py-2">
                  <div className="space-y-0 flex justify-between items-center w-full mb-2">
                    <FormLabel>Quote Number</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name="auto_generate_quote_no"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={(e) =>
                                  field.onChange(e.target.checked)
                                }
                                className="rounded border-gray-300"
                              />
                            </FormControl>
                            <FormLabel className="text-xs text-gray-600">
                              Auto-generate
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {form.watch("auto_generate_quote_no") ? (
                    <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                      {initialData?.quote_no ? (
                        <span>
                          Current quote number:{" "}
                          <strong>{initialData.quote_no}</strong>{" "}
                          (auto-generated)
                        </span>
                      ) : (
                        <span>
                          Quote number will be automatically generated (e.g.,
                          00001, 00002, etc.)
                        </span>
                      )}
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="manual_quote_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Enter custom quote number"
                              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-full text-right"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-right" />
                          <div className="text-xs text-gray-500 mt-1">
                            Enter a unique quote number. System will validate
                            uniqueness before saving.
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Note (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes for the quotation"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator className="mt-6 mb-3 h-[0.5px]" />

            {/* Quotation Items */}
            <div>
              <h2 className="text-xs font-bold mb-1 opacity-40">
                Quotation Items
              </h2>
              <div className="grid grid-cols-[0.2fr_1fr_0.3fr_0.5fr_0.5fr_0.2fr] gap-4 px-4 py-3 border rounded-xl">
                <h2 className="text-sm">Type</h2>
                <h2 className="text-sm">Item</h2>
                <h2 className="text-sm">Qty</h2>
                <h2 className="text-sm">Unit Price</h2>
                <h2 className="text-sm">Amount</h2>
                <h2></h2>

                {(fields || []).map((field, index) => (
                  <React.Fragment key={field.id}>
                    {/* Manual/Inventory Toggle */}
                    <FormField
                      control={form.control}
                      name={`quotation_items.${index}.is_manual`}
                      render={({ field }) => (
                        <FormItem className="space-y-0 w-full">
                          <FormControl>
                            <div className="flex flex-col gap-0.5">
                              <Switch
                                checked={field.value || false}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  handleManualToggle(index, checked);
                                }}
                                className="scale-75"
                              />
                              <span className="text-xs text-gray-500">
                                {field.value ? "Manual" : "Inventory"}
                              </span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Item Description/Selection */}
                    <FormField
                      control={form.control}
                      name={`quotation_items.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="space-y-0 w-full">
                          <FormControl>
                            {form.watch(
                              `quotation_items.${index}.is_manual`
                            ) ? (
                              // Manual input
                              <Input
                                placeholder="Enter item description"
                                className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                                {...field}
                              />
                            ) : (
                              // Inventory selection
                              <div className="flex items-center gap-2">
                                <InventoryCombobox
                                  value={
                                    form.getValues(
                                      `quotation_items.${index}.material_id`
                                    ) || ""
                                  }
                                  onChange={(value) =>
                                    handleInventorySelection(index, value)
                                  }
                                  materials={materialStocks}
                                  disabled={!hasValidBranch}
                                  branchId={currentBranchId}
                                  key={`inventory-${index}-${currentBranchId}`}
                                  quotationItems={watchedItems || []}
                                />
                                {!hasValidBranch && (
                                  <BranchWarning message={warningMessage} />
                                )}
                              </div>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`quotation_items.${index}.qty`}
                      render={({ field }) => (
                        <FormItem className="space-y-0 w-full">
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                              {...field}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "qty",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`quotation_items.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem className="space-y-0 relative">
                          <FormControl>
                            <div className="flex items-center">
                              <span className="absolute pointer-events-none text-sm">
                                ₱
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="ml-3 border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                                {...field}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "unit_price",
                                    Number(e.target.value)
                                  )
                                }
                                disabled={
                                  !form.watch(
                                    `quotation_items.${index}.is_manual`
                                  )
                                }
                                placeholder={
                                  form.watch(
                                    `quotation_items.${index}.is_manual`
                                  )
                                    ? "0.00"
                                    : "Auto-filled"
                                }
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
                        {isNaN((watchedItems || [])[index]?.amount)
                          ? 0
                          : (watchedItems || [])[index]?.amount?.toFixed(2) ||
                            "0.00"}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="text-xs p-2 h-fit self-center w-fit justify-self-center"
                      onClick={() => handleRemoveItem(index)}
                      disabled={(fields || []).length === 1}
                    >
                      <Trash size={12} strokeWidth={1.5} />
                    </Button>
                  </React.Fragment>
                ))}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-dashed border-2 border-slate-800 col-span-3"
                  onClick={handleAddItem}
                >
                  <Plus size={14} strokeWidth={1.5} className="mr-2" />
                  Add Item
                </Button>

                <div className="col-start-4">
                  <h3 className="text-sm font-bold">Materials Total</h3>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold">₱</p>
                    <p className="text-sm">{materialTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Totals Section */}
            <div className="w-fit px-5 py-3 bg-slate-100 rounded-lg flex flex-col mb-3 text-sm">
              <h2 className="mb-2 uppercase font-bold font-mono text-base">
                Quotation Summary
              </h2>
              <div className="py-3 mb-3 border-dashed border-y-2 border-gray-300">
                <div className="flex justify-between">
                  <p className="opacity-60">Materials</p>
                  <p>₱{formatNumberWithCommas(materialTotal)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="opacity-60">Labor</p>
                  <p>₱{formatNumberWithCommas(quotationTotals.labor_total)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="opacity-60">Subtotal</p>
                  <p>₱{formatNumberWithCommas(subtotal)}</p>
                </div>
                <div className="flex justify-between gap-8">
                  <p className="opacity-60">Discount</p>
                  {discount > 0 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        className="h-fit w-fit p-[1px] rounded-full"
                        size={"icon"}
                        variant={"destructive"}
                        onClick={() => updateDiscountValue(0)}
                      >
                        <X size={10} />
                      </Button>
                      <Button
                        type="button"
                        className="h-fit w-fit p-0"
                        variant={"link"}
                        onClick={(e) => {
                          e.preventDefault();
                          setDiscountDialogOpen(true);
                        }}
                      >
                        ₱{formatNumberWithCommas(discount)}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      className="h-fit w-fit p-0"
                      variant={"link"}
                      onClick={(e) => {
                        e.preventDefault();
                        setDiscountDialogOpen(true);
                      }}
                      disabled={!subtotal}
                    >
                      Select a discount
                    </Button>
                  )}
                </div>
                <div className="flex justify-between items-start gap-4">
                  <p className="opacity-60 gap-1">Downpayment</p>
                  {downpayment > 0 || downpaymentInputVisible ? (
                    <div className="flex-col items-end justify-end w-[115px]">
                      <input
                        type="number"
                        value={downpayment > 0 ? downpayment : ""}
                        onChange={handleDownpaymentInputChange}
                        className="w-full text-right placeholder:right bg-transparent focus:outline-none"
                        placeholder="Enter amount"
                        min="0"
                      />
                      {downpaymentError ? (
                        <p className="text-red-500 text-xs mt-1 text-right">
                          {downpaymentError}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      className="h-fit w-fit p-0"
                      variant={"link"}
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddDownpayment();
                      }}
                      disabled={!quotationTotals.total_before_downpayment}
                    >
                      Add downpayment
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-between gap-4">
                <p className="font-black">Total</p>
                <div>
                  <p>₱{formatNumberWithCommas(totalQuote)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={Boolean(downpaymentError)}>
                Save Quotation
              </Button>
            </div>
          </form>
        </Form>

        <DiscountDialog
          open={discountDialogOpen}
          onOpenChange={setDiscountDialogOpen}
          grandTotal={subtotal}
          onSelectDiscount={handleSelectDiscount}
        />
      </DialogContent>
    </Dialog>
  );
}
