import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { pdf } from "@react-pdf/renderer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import {
  Check,
  ChevronsUpDown,
  Clock,
  Edit,
  Info,
  Loader2,
  Plus,
  Trash,
  X,
} from "lucide-react";

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
import JobOrderPDF from "./job-order-pdf";
import {
  MaterialItem,
  JobOrderData,
  CreateJobOrderData,
  User,
} from "../../lib/types";
import PrintOptionsDialog from "./print-option-dialog";
import {
  formatNumberWithCommas,
  formatReadableDate,
  renderWarrantyInfo,
} from "../../lib/helpers";
import { createEditJobOrder } from "../../services/apiJobOrders";
import { getMaterialStocks } from "../../services/apiMaterials";
import { useUser } from "../auth/useUser";
import DiscountDialog from "./discount-option-dialog";
import { Checkbox } from "../ui/checkbox";
import { baseSchema } from "./jobOrderSchema";
import { useDownpayment } from "./useDownpayment";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import QuotationDialog from "./quotation-dialog";
import { CreateQuotationData } from "../../lib/types";
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

const rateOptions = [
  { label: "Walk-in Service", value: 1500 },
  { label: "Walk-in Check-up", value: 250 },
  { label: "Walk-in CISS", value: 600 },
  { label: "Office/Home Service", value: 2000 },
  { label: "Office/Home Check-up", value: 500 },
  { label: "Office/Home CISS", value: 1100 },
  { label: "Return for Warranty", value: 0 },
];

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
    ? `${selectedMaterial.material_name}${
        selectedMaterial.brand ? ` - ${selectedMaterial.brand}` : ""
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
}: {
  jobOrderToEdit?: JobOrderData;
  readonly?: boolean;
  technicians?: User[];
  onClose?: () => void;
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
    warranty_months: editValues.warranty_months || 1,
  };

  const accessoriesString = editValuesWithClient.accessories;
  const parsedAccessories =
    editSession && typeof accessoriesString === "string"
      ? JSON.parse(accessoriesString)
      : [];

  const queryClient = useQueryClient();
  const [contactNumber, setContactNumber] = useState("+63 ");
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
    editValues.discount
  );
  const [downpaymentInputVisible, setDownpaymentInputVisible] = useState(
    Boolean(editValues.downpayment && editValues.downpayment > 0)
  );

  // Quotation state
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [quotationData, setQuotationData] =
    useState<CreateQuotationData | null>(null);
  const [isCreatingQuotation, setIsCreatingQuotation] = useState(false);

  const { isTaytay, isPasig, isAdmin, user } = useUser();
  const isTechnician = user?.user_metadata.role?.includes("technician");
  const currentTechnicianId = user?.id;

  // Determine branch based on the user's roles
  const userIsPasig =
    isTechnician && user?.user_metadata.role?.includes("pasig");
  const userIsTaytay =
    isTechnician && user?.user_metadata.role?.includes("taytay");
  const userIsGeneral = isTechnician && !userIsPasig && !userIsTaytay;

  const { data: materialStocks, isLoading: materialStocksLoading } = useQuery({
    queryKey: ["materialStocks", { fetchAll: true }],
    queryFn: () => getMaterialStocks({ fetchAll: true }),
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_order"] });
      toast.success("Job order successfully edited!");
      if (onClose) onClose();
    },
    onError: (error) => {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    },
  });
  // console.log(editValuesWithClient.materials);

  const isPending = isCreating || isEditing || materialStocksLoading;
  const onWarranty = editSession && Boolean(editValues.warranty);

  const extendedBaseSchema = isAdmin
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
      ? { ...editValuesWithClient, technical_report: existingTechnicalReport }
      : {
          branch_id: undefined,
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

  const [initialFormValues, setInitialFormValues] = useState(form.getValues());
  const [isFormChanged, setIsFormChanged] = useState(false);

  const materials = form.watch("materials");
  const branchId =
    isAdmin || userIsGeneral
      ? form.watch("branch_id")
      : userIsTaytay
      ? 1
      : userIsPasig
      ? 2
      : isTaytay
      ? 1
      : isPasig
      ? 2
      : 0;
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const totalMaterialsPrice = materials?.reduce(
    (total, { quantity = 0, unitPrice = 0 }) => total + quantity * unitPrice,
    0
  );
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
  const grandTotal =
    isCreatingQuotation && quotationData
      ? quotationData.total_quote
      : (totalMaterialsPrice ?? 0) + laborTotal;
  const { downpaymentValue, downpaymentError, handleDownpaymentChange } =
    useDownpayment(grandTotal, editValues.downpayment || undefined);

  const adjustedGrandTotal =
    grandTotal - (selectedDiscount ?? 0) - (downpaymentValue ?? 0);

  const filteredTechnicians = useMemo(() => {
    if (userIsGeneral || isFormReadonly) {
      return technicians;
    }
    if (branchId === 1 || userIsTaytay) {
      return technicians.filter(
        (technician) =>
          technician.role?.includes("taytay") ||
          technician.email?.includes("taytay") ||
          technician.role?.includes("general") ||
          technician.email === "avisha@email.com"
      );
    } else if (branchId === 2 || userIsPasig) {
      return technicians.filter(
        (technician) =>
          technician.role?.includes("pasig") ||
          technician.email?.includes("pasig") ||
          technician.role?.includes("general") ||
          technician.email === "avisha@email.com"
      );
    } else {
      return technicians;
    }
  }, [
    technicians,
    branchId,
    userIsPasig,
    userIsTaytay,
    userIsGeneral,
    isFormReadonly,
  ]);

  const handleAddDownpayment = () => {
    setDownpaymentInputVisible(true);
  };

  const handleSelectDiscount = (discount: number) => {
    setSelectedDiscount(discount);
    setDiscountDialogOpen(false);
  };

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "materials",
  });

  const generatePDF = async (
    data: CreateJobOrderData,
    type?: "company" | "client" | "both" | null
  ) => {
    setIsPrinting(true);

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
    };

    const doc = <JobOrderPDF data={pdfData} type={type} />;
    const asBlob = await pdf(doc).toBlob();

    const src = URL.createObjectURL(asBlob);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    iframe.onload = function () {
      setTimeout(function () {
        iframe.contentWindow?.print();
      }, 1);
    };

    iframe.src = src;

    const afterPrint = () => {
      setIsPrinting(false);
      setPrintDialogOpen(false);
      saveAs(asBlob, `job-order-${type || "both"}.pdf`);
      if (onClose) onClose();
      URL.revokeObjectURL(src);
    };

    window.addEventListener("focus", afterPrint, { once: true });
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
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
      branch_id:
        isTaytay || userIsTaytay
          ? 1
          : isPasig || userIsPasig
          ? 2
          : isAdmin || userIsGeneral
          ? values.branch_id || 0
          : 0,
      warranty: editValues.warranty || undefined,
      warranty_months: values.warranty_months || 1,
      brand_model: values.brand_model || "",
      serial_number: values.serial_number || "",
      machine_type: values.machine_type || "",
      problem_statement: values.problem_statement || "",
      additional_comments: values.additional_comments || "",
      labor_description: values.labor_description || "",
      amount: values.amount || 0,
      accessories: values.accessories || [],
    };

    if (editSession) {
      editJobOrder({
        newJobOrder: submittedValues,
        jobOrderId: editId,
        clientId,
        originalClientName: clients?.name || null,
      });
    } else {
      createJobOrder(submittedValues, {
        onSuccess: async (response) => {
          queryClient.invalidateQueries({ queryKey: ["job_order"] });
          toast.success("Job order created successfully!");
          console.log(response);

          // Create quotation if one was prepared
          if (quotationData && isCreatingQuotation) {
            try {
              const { createQuotation, generateQuoteNumber } = await import(
                "../../services/apiQuotations"
              );
              const quotationToCreate = {
                ...quotationData,
                quote_no: generateQuoteNumber(),
                job_order_id: response.jobOrder,
              };

              await createQuotation(quotationToCreate);
              toast.success("Quotation created successfully!");
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
          setPrintDialogOpen(true);
        },
        onError: (error) => {
          toast.error("An error occurred. Please try again.");
          console.error(error);
        },
      });
    }
  }

  const handleMaterialChange = (index: number, materialId: number) => {
    const selectedMaterial = materialStocks?.find((m) => m.id === materialId);
    if (selectedMaterial) {
      form.setValue(
        `materials.${index}.material`,
        selectedMaterial.material_name
      );
      form.setValue(`materials.${index}.material_id`, String(materialId));
      form.setValue(`materials.${index}.unitPrice`, selectedMaterial.price);
    }
  };

  const handleContactNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) => {
    let input = e.target.value.replace(/[^0-9+]/g, "");

    if (!input.startsWith("+63")) {
      input = "+63";
    }

    let digits = input.substring(3).replace(/\D/g, "");
    digits = digits.substring(0, 10);

    let formattedInput = `+63 ${digits.substring(0, 3)} ${digits.substring(
      3,
      6
    )} ${digits.substring(6, 10)}`.trim();

    formattedInput = formattedInput.substring(0, 16);
    setContactNumber(formattedInput);
    onChange(formattedInput);
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
    setQuotationDialogOpen(true);
  };

  const handleSaveQuotation = (quotation: CreateQuotationData) => {
    setQuotationData(quotation);
    setIsCreatingQuotation(true);
  };

  const handleRemoveQuotation = () => {
    setQuotationData(null);
    setIsCreatingQuotation(false);
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
    const values = form.getValues();
    const newQuantity = (values?.materials?.[index]?.quantity ?? 0) - 1;
    form.setValue(
      `materials.${index}.quantity`,
      newQuantity < 0 ? 0 : newQuantity
    );
  };

  const increment = (index: number) => {
    const values = form.getValues();
    const materialId = values?.materials?.[index]?.material_id;
    const currentStock = getStockForMaterial(Number(materialId));
    const newQuantity = (values?.materials?.[index]?.quantity ?? 0) + 1;

    if (newQuantity <= currentStock) {
      form.setValue(`materials.${index}.quantity`, newQuantity);
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

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={
            isEditMode ? "border-2 border-blue-200 rounded-lg p-4" : ""
          }
        >
          <div className="flex flex-wrap gap-2 mb-2">
            <div className="px-3 py-1 bg-gray-200 rounded-full text-gray-600 text-xs w-fit flex items-center gap-1">
              <Clock size={12} strokeWidth={1.5} />
              {editSession ? formatReadableDate(editValues.created_at) : date}
            </div>
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
            {!isFormReadonly && !editSession && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCreateQuotation}
                      disabled={isPending}
                      className="px-3 py-1 h-fit text-xs flex items-center gap-1"
                    >
                      <Plus size={12} strokeWidth={1.5} />
                      {isCreatingQuotation
                        ? "Edit Quotation"
                        : "Create Quotation"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Create a quotation for this job order. Client details can
                      be edited within the quotation dialog.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isCreatingQuotation && quotationData && (
              <div className="px-3 py-1 bg-blue-200 rounded-full text-blue-600 text-xs w-fit flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Quotation: ₱
                  {formatNumberWithCommas(quotationData.total_quote)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveQuotation}
                  className="h-4 w-4 p-0 hover:bg-blue-300"
                >
                  <X size={10} />
                </Button>
              </div>
            )}
            {isCreatingQuotation && (
              <div className="px-3 py-1 bg-purple-200 rounded-full text-purple-600 text-xs w-fit flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Status: Quotation</span>
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
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-3xl text-3xl font-bold rounded-none mb-2"
                    placeholder="Client Name"
                    autoFocus
                    disabled={isFormReadonly || onWarranty}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
              Basic Information
            </h2>
            <div className="grid md:grid-cols-3 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
              {/* Hide contact number based on security conditions */}
              {!(editSession && !isAdmin && !isTaytay && !isPasig) && (
                <FormField
                  control={form.control}
                  name="contact_number"
                  render={({ field }) => {
                    const {
                      onChange: fieldOnChange,
                      value: fieldValue,
                      ...restFieldProps
                    } = field;
                    return (
                      <FormItem className="space-y-0">
                        <FormLabel>Contact No.</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Client Contact"
                            className={`border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0`}
                            value={contactNumber || fieldValue}
                            onChange={(e) =>
                              handleContactNumberChange(e, fieldOnChange)
                            }
                            disabled={isFormReadonly}
                            {...restFieldProps}
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
                            ((isAdmin || userIsGeneral) &&
                              !form.watch("branch_id"))
                          }
                        >
                          <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0">
                            <SelectValue
                              placeholder={
                                isAdmin && !form.watch("branch_id")
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
                {(isAdmin || userIsGeneral) && (
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
                              <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                                <SelectValue
                                  placeholder={`${
                                    form.watch("branch_id")
                                      ? field.value === 1
                                        ? "Taytay"
                                        : "Pasig"
                                      : "Select a branch"
                                  }`}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent align="end">
                              <SelectGroup>
                                <SelectLabel>Branches</SelectLabel>
                                <SelectItem value="1">Taytay</SelectItem>
                                <SelectItem value="2">Pasig</SelectItem>
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
                  {isCreatingQuotation && (
                    <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      Disabled - Quotation Active
                    </div>
                  )}
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
                          disabled={isFormReadonly || isCreatingQuotation}
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
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={(value) => {
                            field.onChange(Number(value));
                          }}
                          disabled={isFormReadonly || isCreatingQuotation}
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
                            disabled={isFormReadonly || isCreatingQuotation}
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
                          defaultValue={field.value?.toString() || "1"}
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
              </div>
            </div>
          </div>
          <Separator className="mt-6 mb-3 h-[0.5px]" />
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-bold opacity-40">
                Material and Accessories
              </h2>
              {isCreatingQuotation && (
                <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                  Disabled - Quotation Active
                </div>
              )}
            </div>
            <div
              className={`grid grid-cols-[0.2fr_1fr_0.3fr_0.5fr_0.5fr_0.2fr] gap-4 px-4 py-3 border rounded-xl ${
                isCreatingQuotation ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <h2 className="text-sm">Used</h2>
              <h2 className="text-sm">Material</h2>
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
                          <MaterialCombobox
                            value={field.value ? String(field.value) : ""}
                            onChange={(value) => {
                              handleMaterialChange(index, Number(value));
                              field.onChange(String(value));
                            }}
                            materials={materialStocks}
                            disabled={isFormReadonly}
                            branchId={branchId || 0}
                            materialsJobOrder={materialsJobOrder}
                          />
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
                disabled={isFormReadonly || isCreatingQuotation}
              >
                <Plus size={14} strokeWidth={1.5} className="mr-2" />
                Add Material
              </Button>
              <div className="col-start-5">
                <h3 className="text-sm font-bold">Material Total</h3>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold">₱</p>
                  <p className="text-sm">{totalMaterialsPrice?.toFixed(2)}</p>
                </div>
              </div>
            </div>
            {form.formState.errors.materials && (
              <p className="text-red-600 text-sm">
                {form.formState.errors.materials.message}
              </p>
            )}
            <div
              className={
                isCreatingQuotation ? "opacity-50 pointer-events-none" : ""
              }
            >
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
                {isCreatingQuotation && quotationData ? (
                  <div className="flex justify-between">
                    <p className="opacity-60">Quotation</p>
                    <p>₱{formatNumberWithCommas(quotationData.total_quote)}</p>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
                <div className="flex justify-between gap-8">
                  <p className="opacity-60">Discount</p>
                  {isCreatingQuotation &&
                  quotationData &&
                  quotationData.discount > 0 ? (
                    <p>₱{formatNumberWithCommas(quotationData.discount)}</p>
                  ) : selectedDiscount ? (
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
                        disabled={readonly || isPending || !grandTotal}
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
                      disabled={readonly || isPending || !grandTotal}
                    >
                      Select a discount
                    </Button>
                  )}
                </div>
                <div className="flex justify-between items-start gap-4">
                  <p className="opacity-60 gap-1">Downpayment</p>
                  {isCreatingQuotation && quotationData ? (
                    <div className="flex items-center gap-2">
                      <p className="text-right text-gray-500">₱0.00</p>
                      <span className="text-xs text-gray-500">
                        (Disabled - Quotation Mode)
                      </span>
                    </div>
                  ) : downpaymentValue || downpaymentInputVisible ? (
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
                      disabled={readonly || isPending || !grandTotal}
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
        </form>
      </Form>
      <DiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        grandTotal={grandTotal}
        onSelectDiscount={handleSelectDiscount}
      />
      <PrintOptionsDialog
        open={printDialogOpen}
        onClose={() => {
          setPrintDialogOpen(false);
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
      />
    </>
  );
}
