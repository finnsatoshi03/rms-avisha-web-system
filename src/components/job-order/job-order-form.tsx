/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { pdf } from "@react-pdf/renderer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { Clock, Loader2, Plus, Trash, X } from "lucide-react";

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
import { TagInput } from "../tag-input";
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

const materialSchema = z.object({
  used: z.boolean().nullable().optional(),
  material: z.string().min(1, "Material is required"),
  material_id: z.string().min(1, "Material ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
});

const baseSchema = z.object({
  branch_id: z.number().optional(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .regex(/^[A-Za-z\s]+$/, {
      message: "Name must only contain letters and spaces.",
    })
    .trim()
    .min(1, "Name is required."),
  contact_number: z
    .string()
    .regex(
      /^\+63 9[0-9]{2} [0-9]{3} [0-9]{4}$/,
      "Must be a valid PHP contact number starting with +63 9 and followed by 9 digits with spaces."
    )
    .min(
      16,
      "Contact number must include country code +63 and be 16 characters long including spaces."
    )
    .max(
      16,
      "Contact number must include country code +63 and be 16 characters long including spaces."
    ),
  email: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val === "" || /.+@.+\..+/.test(val),
      "Must be a valid email address."
    ),
  order_received: z.string().optional().nullable(),
  materials: z.array(materialSchema).optional(),
  brand_model: z.string().min(1, "Brand Model is required"),
  serial_number: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 3, {
      message: "At least 3 characters required",
    }),
  machine_type: z.union([
    z.enum(["printer", "laptop", "desktop/pc", "electric typewriter"]),
    z
      .string()
      .min(1, "Machine type is required")
      .refine(
        (val) => val !== "others" || val.trim() !== "",
        "Specify machine type if 'Other' is selected"
      ),
  ]),
  problem_statement: z.string().min(10, "At least 10 characters required"),
  additional_comments: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: "At least 10 characters required",
    }),
  labor_description: z.string().min(10, "At least 10 characters required"),
  rate: z.number().min(1, "Rate is required"),
  amount: z
    .number()
    .optional()
    .refine((val) => !val || val >= 0, {
      message: "Amount must be non-negative",
    }),
  accessories: z.array(z.string()).optional(),
  technician_id: z.string().optional().nullable(),
  technical_report: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: "Technical report must be at least 10 characters long",
    }),
});

const rateOptions = [
  { label: "Walk-in Service", value: 1500 },
  { label: "Office/Home Service", value: 2000 },
];

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
  const [selectedSubOptions, setSelectedSubOptions] = useState<{
    [key: string]: any;
  }>({});
  const [formattedAccessories, setFormattedAccessories] = useState<string[]>(
    []
  );

  const [jobOrderDataForPrinting, setJobOrderDataForPrinting] =
    useState<CreateJobOrderData | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<number | null>(
    editValues.discount
  );

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
    }: {
      newJobOrder: CreateJobOrderData;
      jobOrderId: number;
      clientId: number;
    }) => createEditJobOrder(newJobOrder, jobOrderId, clientId, null),
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
        },
  });

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
  const grandTotal = (totalMaterialsPrice ?? 0) + laborTotal;

  const filteredTechnicians = useMemo(() => {
    if (userIsGeneral || readonly) {
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
    readonly,
  ]);

  const adjustedGrandTotal = selectedDiscount
    ? grandTotal - selectedDiscount
    : grandTotal;

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
    const exceededStock =
      values?.materials &&
      values.materials.some((material) => {
        const currentStock = getStockForMaterial(Number(material.material_id));
        return material.quantity > currentStock;
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

    const submittedValues: CreateJobOrderData = {
      ...values,
      order_received:
        values.order_received?.trim() === "" ? null : values.order_received,
      technician_id:
        values.technician_id?.trim() === "" ? null : values.technician_id,
      labor_total: laborTotal,
      material_total: totalMaterialsPrice ?? 0,
      materials_expense: totalMaterialsCost ?? 0,
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
      materials:
        values?.materials &&
        values.materials.map((material) => ({
          ...material,
          material_id: Number(material.material_id),
        })),
    };

    if (editSession) {
      editJobOrder({
        newJobOrder: submittedValues,
        jobOrderId: editId,
        clientId,
      });
    } else {
      createJobOrder(submittedValues, {
        onSuccess: (response) => {
          queryClient.invalidateQueries({ queryKey: ["job_order"] });
          toast.success("Job order created successfully!");

          console.log(response);

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

  const handleAccessorySelection = (accessory: string) => {
    if (readonly) return;

    setSelectedAccessories((prev: string[]) => {
      const isSelected = prev.includes(accessory);
      if (isSelected) {
        setFormattedAccessories((formattedPrev) =>
          formattedPrev.filter((item) => !item.startsWith(accessory))
        );
        return prev.filter((item) => !item.startsWith(accessory));
      } else {
        setFormattedAccessories((formattedPrev) => [
          ...formattedPrev,
          accessory,
        ]);
        return [...prev, accessory];
      }
    });

    if (!selectedAccessories.includes(accessory)) {
      setSelectedSubOptions((prev) => ({
        ...prev,
        [accessory]: {},
      }));
    } else {
      setSelectedSubOptions((prev) => {
        const { [accessory]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubOptionSelection = (
    accessory: string,
    subOption: string,
    value: string
  ) => {
    if (readonly) return;

    setSelectedSubOptions((prev) => {
      const updatedOptions = {
        ...prev,
        [accessory]: {
          ...prev[accessory],
          [subOption]: value,
        },
      };

      const subOptions = updatedOptions[accessory];
      const mergedOption = Object.values(subOptions).filter(Boolean).join(" ");
      setFormattedAccessories((prevFormatted) => {
        const existingIndex = prevFormatted.findIndex((acc) =>
          acc.startsWith(accessory)
        );
        if (existingIndex !== -1) {
          return prevFormatted.map((acc, index) =>
            index === existingIndex ? `${accessory} ${mergedOption}` : acc
          );
        } else {
          return [...prevFormatted, `${accessory} ${mergedOption}`];
        }
      });

      return updatedOptions;
    });
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
  }, [selectedMachineType, specifyInputValue]);

  useEffect(() => {
    form.setValue("accessories", formattedAccessories);
  }, [formattedAccessories, form]);

  useEffect(() => {
    if (editSession && editValuesWithClient.contact_number) {
      setContactNumber(editValuesWithClient.contact_number);
      form.setValue("contact_number", editValuesWithClient.contact_number);
    }
  }, [editSession, editValuesWithClient.contact_number, form]);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
                    disabled={readonly}
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
                          className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={contactNumber || fieldValue}
                          onChange={(e) =>
                            handleContactNumberChange(e, fieldOnChange)
                          }
                          disabled={readonly}
                          {...restFieldProps}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
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
                        disabled={readonly}
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
                            disabled={readonly}
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
                            disabled={readonly}
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
                            disabled={readonly}
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
                          disabled={readonly}
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
                          disabled={readonly}
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
                          disabled={readonly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <h2 className="text-xs mb-1 lg:mt-4 mt-0 font-bold opacity-40">
                  Labor Details
                </h2>
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
                            disabled={readonly}
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
                          disabled={readonly}
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
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(value) => {
                            field.onChange(Number(value));
                          }}
                          defaultValue={field.value ? String(field.value) : ""}
                          disabled={readonly}
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
                                  value={String(option.value)}
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
                            disabled={readonly}
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
              </div>
            </div>
          </div>
          <Separator className="mt-6 mb-3 h-[0.5px]" />
          <div>
            <h2 className="text-xs font-bold mb-1 opacity-40">
              Material and Accessories
            </h2>
            <div className="grid grid-cols-[0.2fr_1fr_0.3fr_0.5fr_0.5fr_0.2fr] gap-4 px-4 py-3 border rounded-xl">
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
                              disabled={readonly}
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
                          <Select
                            onValueChange={(value) => {
                              handleMaterialChange(index, Number(value));
                              field.onChange(String(value));
                            }}
                            value={field.value ? String(field.value) : ""}
                            disabled={readonly}
                          >
                            <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit">
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Materials</SelectLabel>
                                {materialStocks &&
                                  materialStocks
                                    .filter(
                                      (stock) =>
                                        stock.stocks !== 0 &&
                                        (readonly || !stock.deleted) &&
                                        stock.branch_id === branchId
                                    )
                                    .map((stock) => (
                                      <SelectItem
                                        key={stock.id}
                                        value={String(stock.id)}
                                      >
                                        {stock.material_name} -{" "}
                                        {stock.brand || ""}
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
                              disabled={readonly}
                            >
                              -
                            </button>
                            <div className="text-center">{field.value}</div>
                            <button
                              type="button"
                              className="px-1 border rounded-full"
                              onClick={() => increment(index)}
                              disabled={readonly}
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
                              disabled={readonly}
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
                    disabled={readonly}
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
                disabled={readonly}
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
            {selectedMachineType !== "others" ? (
              <AccessoriesSection
                selectedAccessories={selectedAccessories}
                handleAccessorySelection={handleAccessorySelection}
                handleSubOptionSelection={handleSubOptionSelection}
                selectedSubOptions={selectedSubOptions}
                selectedMachineType={selectedMachineType}
              />
            ) : (
              <div className="my-3 px-4 py-3 border rounded-xl">
                <h2 className="text-sm">Accessories</h2>
                <TagInput
                  tags={selectedAccessories}
                  setTags={(newTags: string[]) => {
                    // console.log(newTags);
                    setSelectedAccessories(newTags);
                    form.setValue("accessories", newTags);
                  }}
                />
              </div>
            )}
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
                        disabled={readonly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          <div className="flex justify-between mt-2">
            {!readonly && (
              <Button type="submit" disabled={isPending}>
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
                        disabled={readonly || isPending}
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
                <div className="flex justify-between">
                  <p className="opacity-60 flex items-center gap-1">
                    VAT{" "}
                    <span className="font-mono text-xs p-1 flex items-center justify-center size-4 rounded-full bg-gray-500 text-white">
                      i
                    </span>
                  </p>
                  <p>---</p>
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
    </>
  );
}
