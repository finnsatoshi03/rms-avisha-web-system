import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Trash,
  Clock,
  X,
  Check,
  ChevronsUpDown,
  Printer,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getMaterialStocks } from "../../services/apiMaterials";
import { useBranchValidation } from "../../hooks/useBranchValidation";
import { BranchWarning } from "../ui/branch-warning";
import { pdf } from "@react-pdf/renderer";
import QuotationPDF from "./quotation-pdf";
import PrintDialog from "./print-dialog";
import PrintSelectionDialog from "./print-selection-dialog";

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

const quotationItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  qty: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Unit price must be non-negative"),
  amount: z.number().min(0, "Amount must be non-negative"),
  material_id: z.string().min(1, "Please select an inventory item"),
});

const quotationSchema = z.object({
  company: z.string().min(1, "Company is required"),
  address: z.string().min(1, "Address is required"),
  validity_months: z.number().min(1, "Validity period is required"),
  note: z.string().optional(),
  quotation_items: z
    .array(quotationItemSchema)
    .min(1, "At least one item is required"),
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
}

const validityOptions = [
  { label: "1 Month", value: 1 },
  { label: "2 Months", value: 2 },
  { label: "3 Months", value: 3 },
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
}: QuotationDialogProps) {
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [totalQuote, setTotalQuote] = useState(0);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printSelectionDialogOpen, setPrintSelectionDialogOpen] =
    useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [validityMonths, setValidityMonths] = useState(1);
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

  // Create initial quotation items from job order materials (inventory-based only)
  const createInitialQuotationItems = () => {
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
        });
      }
    });

    // If no items from job order, add a default empty item
    if (items.length === 0) {
      items.push({
        description: "",
        qty: 1,
        unit_price: 0,
        amount: 0,
        material_id: "",
      });
    }

    return items;
  };

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      company: initialData?.company || "",
      address: initialData?.address || "",
      validity_months: 1,
      note: initialData?.note || "",
      quotation_items:
        initialData?.quotation_items || createInitialQuotationItems(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "quotation_items",
  });

  const watchedItems = form.watch("quotation_items");

  // Debounced sync from job order to quotation to prevent conflicts
  useEffect(() => {
    if (isSyncingRef.current) return; // Prevent infinite loops
    if (!jobOrderMaterials) return;

    // Debounce the sync to prevent conflicts with user input
    const timeoutId = setTimeout(() => {
      const updatedItems: QuotationItem[] = jobOrderMaterials.map(
        (material) => ({
          description: material.material,
          qty: material.quantity,
          unit_price: material.unitPrice,
          amount: material.quantity * material.unitPrice,
          material_id: material.material_id,
        })
      );

      // Set sync flag
      isSyncingRef.current = true;

      // Sync to keep both forms in sync
      form.setValue("quotation_items", updatedItems);

      // Recalculate totals
      const newSubtotal = updatedItems.reduce(
        (total, item) => total + (item.amount || 0),
        0
      );
      setSubtotal(newSubtotal);
      setTotalQuote(newSubtotal - discount);

      // Reset sync flag after a short delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [jobOrderMaterials, form, discount]);

  // Calculate totals when items change
  useEffect(() => {
    const newSubtotal = watchedItems.reduce(
      (total, item) => total + (item.amount || 0),
      0
    );
    setSubtotal(newSubtotal);
    setTotalQuote(newSubtotal - discount);
  }, [watchedItems, discount]);

  // Watch for changes in individual item fields and recalculate
  const watchedItemsValues = form.watch("quotation_items");
  useEffect(() => {
    if (watchedItemsValues) {
      const newSubtotal = watchedItemsValues.reduce(
        (total, item) => total + (item.amount || 0),
        0
      );
      setSubtotal(newSubtotal);
      setTotalQuote(newSubtotal - discount);
    }
  }, [watchedItemsValues, discount]);

  const handleItemChange = (
    index: number,
    field: keyof QuotationItem,
    value: string | number
  ) => {
    const items = [...watchedItems];
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

    // Trigger immediate recalculation
    const newSubtotal = items.reduce(
      (total, item) => total + (item.amount || 0),
      0
    );
    setSubtotal(newSubtotal);
    setTotalQuote(newSubtotal - discount);

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
    });
    // Sync materials after adding
    setTimeout(() => {
      const currentItems = form.getValues("quotation_items");
      handleMaterialsChange(currentItems);
    }, 0);
  };

  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
      // Sync materials after removing
      setTimeout(() => {
        const currentItems = form.getValues("quotation_items");
        handleMaterialsChange(currentItems);
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

      // Trigger recalculation
      const items = form.getValues("quotation_items");
      const newSubtotal = items.reduce(
        (total, item) => total + (item.amount || 0),
        0
      );
      setSubtotal(newSubtotal);
      setTotalQuote(newSubtotal - discount);

      // Sync materials back to job order form
      handleMaterialsChange(items);
    }
  };

  const handleSelectDiscount = (discount: number) => {
    setDiscount(discount);
    setDiscountDialogOpen(false);
  };

  const getValidityEndDate = (months: number) => {
    const endDate = new Date();
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

  const handleMaterialsChange = useCallback(
    (updatedMaterials: QuotationItem[]) => {
      // Convert quotation items to job order material format
      const jobOrderMaterials = updatedMaterials.map((item) => ({
        material: item.description,
        quantity: item.qty,
        unitPrice: item.unit_price,
        material_id: item.material_id,
      }));

      // Sync materials back to job order form
      if (onMaterialsChange) {
        onMaterialsChange(jobOrderMaterials);
      }
    },
    [onMaterialsChange]
  );

  // DISABLED: Auto-sync from quotation to job order to prevent quantity conflicts
  // Manual sync will happen only when user explicitly saves the quotation

  const onSubmit = (data: QuotationFormData) => {
    // Calculate end date based on validity months
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + data.validity_months);

    const quotationData: CreateQuotationData = {
      quote_no: "", // Will be generated in the API
      job_order_id: 0, // Will be set when job order is created
      end_date: endDate.toISOString().split("T")[0],
      company: data.company,
      address: data.address,
      note: data.note || "",
      subtotal,
      discount,
      total_quote: totalQuote,
      quotation_items: data.quotation_items,
    };

    // Manual sync: Update job order form with quotation materials when saving
    const validItems = data.quotation_items.filter(
      (item) => item.material_id && item.material_id !== ""
    );
    if (validItems.length > 0) {
      console.log("Manual sync on save:", validItems);
      handleMaterialsChange(validItems);
    }

    onSave(quotationData);
    setPrintSelectionDialogOpen(true);
  };

  const handlePrintSelection = (option: "quotation" | "job_order" | "both") => {
    setPrintSelectionDialogOpen(false);

    if (option === "quotation" || option === "both") {
      setPrintDialogOpen(true);
    } else if (option === "job_order") {
      // For job order printing, we need to trigger the parent's print flow
      // This will be handled by the parent component
      onOpenChange(false);
    }
  };

  const handlePrint = async (type: "company" | "client" | "both") => {
    setIsPrinting(true);
    try {
      const formData = form.getValues();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + formData.validity_months);

      const quotationData = {
        quote_no: `Q-${Date.now()}`, // Temporary quote number
        job_order_id: 0,
        end_date: endDate.toISOString().split("T")[0],
        company: formData.company,
        address: formData.address,
        note: formData.note || "",
        subtotal,
        discount,
        total_quote: totalQuote,
        quotation_items: formData.quotation_items,
        clientData: editedClientData,
        branch_id: currentBranchId || 1,
        job_order_no: `JO-${Date.now()}`, // Temporary job order number
        date: new Date().toISOString().split("T")[0],
      };

      const blob = await pdf(
        <QuotationPDF data={quotationData} type={type} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quotation-${type}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setPrintDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold">Create Quotation</DialogTitle>
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
                  <div className="space-y-0 border-b py-2">
                    <div className="space-y-0 flex justify-between items-center w-full">
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter company name"
                          className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                          value={form.watch("company")}
                          onChange={(e) =>
                            form.setValue("company", e.target.value)
                          }
                        />
                      </FormControl>
                    </div>
                  </div>
                  <div className="space-y-0 border-b py-2">
                    <div className="space-y-0 flex justify-between items-center w-full">
                      <FormLabel>Company Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter company address"
                          className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
                          value={form.watch("address")}
                          onChange={(e) =>
                            form.setValue("address", e.target.value)
                          }
                        />
                      </FormControl>
                    </div>
                  </div>
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
                          }}
                          defaultValue={field.value?.toString() || "1"}
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
              <div className="grid grid-cols-[1fr_0.3fr_0.5fr_0.5fr_0.2fr] gap-4 px-4 py-3 border rounded-xl">
                <h2 className="text-sm">Inventory Item</h2>
                <h2 className="text-sm">Qty</h2>
                <h2 className="text-sm">Unit Price</h2>
                <h2 className="text-sm">Amount</h2>
                <h2></h2>

                {fields.map((field, index) => (
                  <React.Fragment key={field.id}>
                    <FormField
                      control={form.control}
                      name={`quotation_items.${index}.description`}
                      render={() => (
                        <FormItem className="space-y-0 w-full">
                          <FormControl>
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
                                quotationItems={watchedItems}
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
                        {isNaN(watchedItems[index]?.amount)
                          ? 0
                          : watchedItems[index]?.amount?.toFixed(2) || "0.00"}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="text-xs p-2 h-fit self-center w-fit justify-self-center"
                      onClick={() => handleRemoveItem(index)}
                      disabled={fields.length === 1}
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
                  onClick={handleAddItem}
                >
                  <Plus size={14} strokeWidth={1.5} className="mr-2" />
                  Add Item
                </Button>

                <div className="col-start-4">
                  <h3 className="text-sm font-bold">Subtotal</h3>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold">₱</p>
                    <p className="text-sm">{subtotal.toFixed(2)}</p>
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
                  <p className="opacity-60">Subtotal</p>
                  <p>₱{formatNumberWithCommas(subtotal)}</p>
                </div>
                <div className="flex justify-between gap-8">
                  <p className="opacity-60">Discount</p>
                  {discount > 0 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        className="h-fit w-fit p-[1px] rounded-full"
                        size={"icon"}
                        variant={"destructive"}
                        onClick={() => setDiscount(0)}
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
                      >
                        ₱{formatNumberWithCommas(discount)}
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
                    >
                      Select a discount
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-between gap-4">
                <p className="font-black">Total Quote</p>
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
                onClick={() => setPrintDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Printer size={16} />
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Quotation</Button>
            </div>
          </form>
        </Form>

        <DiscountDialog
          open={discountDialogOpen}
          onOpenChange={setDiscountDialogOpen}
          grandTotal={subtotal}
          onSelectDiscount={handleSelectDiscount}
        />

        <PrintDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          onPrint={handlePrint}
          title="Print Quotation"
          loading={isPrinting}
        />

        <PrintSelectionDialog
          open={printSelectionDialogOpen}
          onClose={() => {
            setPrintSelectionDialogOpen(false);
            onOpenChange(false);
          }}
          onSelectOption={handlePrintSelection}
          loading={isPrinting}
        />
      </DialogContent>
    </Dialog>
  );
}
