/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rentalFormSchema, RentalFormValues } from "./rentalSchema";
import { useCreateRental } from "./useCreateRental";
import { useUser } from "../auth/useUser";
import { Client } from "../../lib/types";
import { useQuery } from "@tanstack/react-query";
import { getBranches } from "../../services/apiBranches";
import { getTechnicians } from "../../services/apiTechnicians";
import ClientAutoSuggest from "../job-order/client-auto-suggest";
import RentalAssetSelect from "./rental-asset-select";
import RentalConsumablesSection from "./rental-consumables-section";
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
import PhoneInput from "../ui/phone-input";
import { DatePicker } from "../ui/date-picker";
import { Button } from "../ui/button";
import DiscountDialog from "../job-order/discount-option-dialog";
import { useDownpayment } from "../job-order/useDownpayment";
import { formatNumberWithCommas } from "../../lib/helpers";
import { X } from "lucide-react";
import { format } from "date-fns";
import { useFeatureOnboarding } from "../onboarding/useFeatureOnboarding";
import FeatureAnnouncementModal from "../onboarding/feature-announcement-modal";
import GuidedTour from "../onboarding/guided-tour";
import TourReplayButton from "../onboarding/tour-replay-button";

interface RentalFormProps {
  onSuccess?: (rentalData?: { rental_no: string }) => void;
}

export default function RentalForm({ onSuccess }: RentalFormProps) {
  const { user, branchId, isAdmin } = useUser();
  const createMutation = useCreateRental();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<{
    daily_rate: number;
    monthly_rate: number;
  } | null>(null);
  const [rentalMonths, setRentalMonths] = useState(1);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<number | null>(null);
  const [downpaymentInputVisible, setDownpaymentInputVisible] = useState(false);
  const canSelectBranch = isAdmin;

  const {
    showAnnouncement,
    showTour,
    onboardingData,
    startTour,
    completeTour,
    replayTour,
  } = useFeatureOnboarding("rental_create");

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
    defaultValues: {
      branch_id: branchId || undefined,
      client_id: null,
      name: "",
      contact_number: "",
      email: "",
      rental_asset_id: undefined,
      technician_id: null,
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      due_date: "",
      rental_type: "MONTHLY",
      rate_amount: 0,
      discount: 0,
      downpayment: 0,
      notes: "",
      consumables: [],
      billing_account_id: null,
    },
  });

  const selectedBranchId = form.watch("branch_id");
  const rentalType = form.watch("rental_type");
  const startDate = form.watch("start_date");
  const endDate = form.watch("end_date");

  const filteredTechnicians = useMemo(() => {
    if (!technicians) return [];
    if (!selectedBranchId) return technicians;
    return technicians.filter(
      (t: any) => t.branch_id === selectedBranchId || t.branch_id === null
    );
  }, [selectedBranchId, technicians]);

  // Auto-calculate due date and end date for monthly based on rentalMonths
  useEffect(() => {
    if (startDate && rentalType === "MONTHLY") {
      const start = new Date(startDate + "T00:00:00");
      const endMonth = new Date(start);
      endMonth.setMonth(endMonth.getMonth() + rentalMonths);
      const endStr = endMonth.toISOString().split("T")[0];
      form.setValue("end_date", endStr);
      form.setValue("due_date", endStr);
      if (selectedAsset) {
        form.setValue("rate_amount", selectedAsset.monthly_rate * rentalMonths);
      }
    }
  }, [startDate, rentalType, rentalMonths, form, selectedAsset]);

  // Auto-calculate rate for daily based on number of days
  useEffect(() => {
    if (rentalType === "DAILY" && startDate && endDate && selectedAsset) {
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      form.setValue("rate_amount", selectedAsset.daily_rate * diffDays);
      form.setValue("due_date", endDate);
    }
  }, [startDate, endDate, rentalType, form, selectedAsset]);

  function handleClientSelect(client: Client) {
    setSelectedClient(client);
    form.setValue("client_id", client.id as number);
    form.setValue("name", client.name || "");
    form.setValue("contact_number", client.contact_number || "");
    form.setValue("email", client.email || "");
  }

  function handleClientCreate(client: Client) {
    setSelectedClient(client);
    form.setValue("client_id", client.id as number);
    form.setValue("name", client.name || "");
    form.setValue("contact_number", client.contact_number || "");
    form.setValue("email", client.email || "");
  }

  function onSubmit(values: RentalFormValues) {
    createMutation.mutate(
      {
        data: {
          ...values,
          discount: selectedDiscount ?? 0,
          downpayment: downpaymentValue ?? 0,
          created_by: user?.id,
        },
        clientId: values.client_id || null,
      },
      {
        onSuccess: (result) => {
          onSuccess?.({ rental_no: result.rental_no });
        },
      }
    );
  }

  const rateAmount = form.watch("rate_amount") || 0;
  const consumables = form.watch("consumables") || [];
  const consumablesTotal = consumables.reduce(
    (sum, c) => sum + (c.quantity || 0) * (c.unit_price || 0),
    0
  );
  const subTotal = rateAmount + consumablesTotal;
  const grandTotal = subTotal - (selectedDiscount ?? 0);

  const { downpaymentValue, downpaymentError, handleDownpaymentChange } =
    useDownpayment(grandTotal);

  const adjustedGrandTotal =
    grandTotal - (downpaymentValue ?? 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex justify-end mb-2">
          <TourReplayButton onClick={replayTour} label="How to create a rental" />
        </div>

        {/* Client Name — prominent like JO form */}
        <FormField
          control={form.control}
          name="name"
          render={() => (
            <FormItem className="mb-2" data-tour="rental-create-client">
              <FormControl>
                <ClientAutoSuggest
                  selectedClient={selectedClient}
                  onClientSelect={handleClientSelect}
                  onClientCreate={handleClientCreate}
                  initialName={form.watch("name")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Basic Information */}
        <div data-tour="rental-create-basic-info">
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
                      disabled={canSelectBranch && !selectedBranchId}
                    >
                      <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0">
                        <SelectValue
                          placeholder={
                            canSelectBranch && !selectedBranchId
                              ? "Select a branch first"
                              : "Select a Technician"
                          }
                        />
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
        <div data-tour="rental-create-details">
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
                    >
                      <FormControl>
                        <SelectTrigger
                          className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right"
                          autoFocus={!field.value}
                        >
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent align="end">
                        {branches.map((branch) => (
                          <SelectItem
                            key={branch.id}
                            value={branch.id.toString()}
                          >
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
                        setSelectedAsset(asset);
                        const type = form.getValues("rental_type");
                        form.setValue(
                          "rate_amount",
                          type === "DAILY"
                            ? asset.daily_rate
                            : asset.monthly_rate
                        );
                      }}
                      branchId={selectedBranchId || branchId}
                      disabled={canSelectBranch && !selectedBranchId}
                      placeholder={
                        canSelectBranch && !selectedBranchId
                          ? "Select a branch first"
                          : "Select a printer..."
                      }
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
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (selectedAsset) {
                          form.setValue(
                            "rate_amount",
                            val === "DAILY"
                              ? selectedAsset.daily_rate
                              : selectedAsset.monthly_rate
                          );
                        }
                      }}
                      defaultValue={field.value}
                      disabled={!form.watch("rental_asset_id")}
                    >
                      <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                        <SelectValue
                          placeholder={
                            !form.watch("rental_asset_id")
                              ? "Select a printer first"
                              : "Select type"
                          }
                        />
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
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-right" />
              </FormItem>
            )}
          />

          {rentalType === "MONTHLY" ? (
            <>
              <div className="border-b py-2">
                <div className="space-y-0 flex justify-between items-center w-full">
                  <span className="text-sm font-medium">Duration (months)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-2 border rounded-full text-sm"
                      onClick={() => rentalMonths > 1 && setRentalMonths(rentalMonths - 1)}
                    >
                      -
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{rentalMonths}</span>
                    <button
                      type="button"
                      className="px-2 border rounded-full text-sm"
                      onClick={() => setRentalMonths(rentalMonths + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                {startDate && (
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    Ends on{" "}
                    {format(
                      new Date(
                        new Date(startDate + "T00:00:00").setMonth(
                          new Date(startDate + "T00:00:00").getMonth() + rentalMonths
                        )
                      ),
                      "MMM d, yyyy"
                    )}
                  </p>
                )}
              </div>
            </>
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
        <div data-tour="rental-create-consumables">
          <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
            Consumables
          </h2>
          <RentalConsumablesSection
            form={form}
            branchId={selectedBranchId || branchId}
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
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Button + Summary — same as JO form */}
        <div className="flex md:flex-row flex-col md:justify-between mt-2" data-tour="rental-create-summary">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm bg-primaryRed hover:bg-hoveredRed text-white rounded-lg disabled:opacity-50 h-fit"
          >
            {createMutation.isPending ? "Creating Rental..." : "Create Rental"}
          </button>

          <div className="w-fit px-5 py-3 bg-slate-100 rounded-lg flex flex-col mb-3 text-sm">
            <h2 className="mb-2 uppercase font-bold font-mono text-base">
              Rental Summary
            </h2>
            <div className="py-3 mb-3 border-dashed border-y-2 border-gray-300">
              <p>Subtotal</p>
              <div className="flex justify-between">
                <p className="opacity-60">Rate</p>
                <p>
                  {rateAmount > 0
                    ? `₱${formatNumberWithCommas(rateAmount)}`
                    : "---"}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="opacity-60">Consumables</p>
                <p>
                  {consumablesTotal > 0
                    ? `₱${formatNumberWithCommas(consumablesTotal)}`
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
                      disabled={createMutation.isPending}
                    >
                      <X size={10} />
                    </Button>
                    <Button
                      className="h-fit w-fit p-0"
                      variant="link"
                      type="button"
                      onClick={() => setDiscountDialogOpen(true)}
                      disabled={createMutation.isPending || !grandTotal}
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
                    disabled={createMutation.isPending || !subTotal}
                  >
                    Select a discount
                  </Button>
                )}
              </div>
              <div className="flex justify-between items-start gap-4">
                <p className="opacity-60">Downpayment</p>
                {downpaymentValue || downpaymentInputVisible ? (
                  <div className="flex-col items-end justify-end w-[115px]">
                    <input
                      type="number"
                      value={downpaymentValue ?? ""}
                      onChange={handleDownpaymentChange}
                      className="w-full text-right bg-transparent focus:outline-none"
                      placeholder="Enter amount"
                      min="0"
                      disabled={createMutation.isPending}
                    />
                    {downpaymentError && (
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
                    disabled={createMutation.isPending || !grandTotal}
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
                    ₱{formatNumberWithCommas(subTotal)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      <DiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        grandTotal={subTotal}
        onSelectDiscount={(d) => {
          setSelectedDiscount(d);
          setDiscountDialogOpen(false);
        }}
      />

      <FeatureAnnouncementModal
        open={showAnnouncement}
        onboarding={onboardingData}
        onStartTour={startTour}
      />
      <GuidedTour
        featureKey="rental_create"
        active={showTour}
        onComplete={completeTour}
      />
    </Form>
  );
}
