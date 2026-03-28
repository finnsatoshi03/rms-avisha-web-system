/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rentalFormSchema, RentalFormValues } from "./rentalSchema";
import {
  RentalData,
  RentalStatus,
  RentalConsumable,
  Client,
} from "../../lib/types";
import { getStatusClass } from "../../lib/helpers";
import { useRentalStatusUpdate } from "./useRentalStatusUpdate";
import { useUpdateRental } from "./useUpdateRental";
import ReturnInspectionDialog from "./return-inspection-dialog";
import RentalPaymentDialog from "./rental-payment-dialog";
import RentalConsumableManager from "./rental-consumable-manager";
import RentalAssetSelect from "./rental-asset-select";
import ClientAutoSuggest from "../job-order/client-auto-suggest";
import PhoneInput from "../ui/phone-input";
import { useUser } from "../auth/useUser";
import { useQuery } from "@tanstack/react-query";
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
  Package,
  X,
} from "lucide-react";

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
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const statusMutation = useRentalStatusUpdate();
  const updateMutation = useUpdateRental();
  const { user, branchId, isAdmin } = useUser();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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
    }
  }, [rental, form]);

  const selectedBranchId = form.watch("branch_id");

  const filteredTechnicians = useMemo(() => {
    if (!technicians) return [];
    if (!selectedBranchId) return technicians;
    return technicians.filter(
      (t: any) => t.branch_id === selectedBranchId || t.branch_id === null
    );
  }, [selectedBranchId, technicians]);

  if (!rental) return null;

  const transitions = statusTransitions[rental.status] || [];
  const inspection = rental.rental_inspections as any;
  const consumables = (rental.rental_consumables || []) as RentalConsumable[];
  const isFormReadonly = !isEditMode;
  const canEdit = ["Created", "Released", "Ongoing"].includes(rental.status);

  function handleStatusChange(status: RentalStatus) {
    if (status === "Returned") {
      setInspectionOpen(true);
      return;
    }
    if (status === "Completed") {
      setPaymentOpen(true);
      return;
    }
    statusMutation.mutate(
      { ids: [rental!.id], status },
      {
        onSuccess: () => {
          if (status === "Cancelled") {
            onOpenChange(false);
          }
        },
      }
    );
  }

  function handlePaymentSubmit() {
    statusMutation.mutate(
      { ids: [rental!.id], status: "Completed" },
      {
        onSuccess: () => {
          setPaymentOpen(false);
          onOpenChange(false);
        },
      }
    );
  }

  function handleClientSelect(client: Client) {
    setSelectedClient(client);
    form.setValue("client_id", client.id as number);
    form.setValue("name", client.name || "");
    form.setValue("contact_number", client.contact_number || "");
    form.setValue("email", client.email || "");
  }

  function onSubmit(values: RentalFormValues) {
    updateMutation.mutate(
      {
        rentalId: rental!.id,
        data: {
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
          notes: values.notes,
        },
      },
      {
        onSuccess: () => setIsEditMode(false),
      }
    );
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
                    onClick={() => setIsEditMode(true)}
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
            <div className="flex items-center gap-3">
              <span className="bg-primaryRed text-white px-3 py-0.5 rounded-full text-xs font-medium">
                {rental.rental_no}
              </span>
              <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${getStatusClass(rental.status)}`}>
                {rental.status}
              </span>
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

                <div className="grid grid-cols-2 gap-0">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="border-b py-2 pr-2">
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
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem className="border-b py-2 pl-2">
                        <div className="space-y-0 flex justify-between items-center w-full">
                          <FormLabel>End Date</FormLabel>
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
                </div>

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

                <FormField
                  control={form.control}
                  name="rate_amount"
                  render={({ field }) => (
                    <FormItem className="border-b py-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Rate Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-[120px] text-right"
                            disabled={isFormReadonly}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-right" />
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

          {/* Summary */}
          <div className="w-fit px-5 py-3 bg-slate-100 rounded-lg flex flex-col mb-3 text-sm ml-auto">
            <h2 className="mb-2 uppercase font-bold font-mono text-base">
              Rental Summary
            </h2>
            <div className="py-3 mb-3 border-dashed border-y-2 border-gray-300">
              <p>Subtotal</p>
              <div className="flex justify-between">
                <p className="opacity-60">Rate</p>
                <p>
                  {Number(rental.rate_amount) > 0
                    ? `₱${Number(rental.rate_amount).toFixed(2)}`
                    : "---"}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="opacity-60">Consumables</p>
                <p>
                  {Number(rental.consumables_total) > 0
                    ? `₱${Number(rental.consumables_total).toFixed(2)}`
                    : "---"}
                </p>
              </div>
            </div>
            <div className="flex justify-between gap-8 font-bold text-base">
              <p>Grand Total</p>
              <p>₱{Number(rental.grand_total).toFixed(2)}</p>
            </div>
          </div>

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

      <ReturnInspectionDialog
        open={inspectionOpen}
        onOpenChange={setInspectionOpen}
        rental={rental}
        existingInspection={inspection}
      />

      <RentalPaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSubmit={handlePaymentSubmit}
        grandTotal={Number(rental.grand_total)}
        rentalNo={rental.rental_no}
      />
    </>
  );
}

function getDefaultValues(rental: RentalData | null): RentalFormValues {
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
    notes: rental.notes || "",
    consumables: [],
    billing_account_id: rental.billing_account_id,
  };
}
