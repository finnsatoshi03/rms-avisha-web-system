import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, startOfDay, isBefore, differenceInDays } from "date-fns";

// UI Components
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

// Icons
import { CalendarIcon, Mail, Phone, ReceiptText } from "lucide-react";

// Utilities
import { cn } from "../../lib/utils";
import {
  calculateRentalAmount,
  handleRateChange,
  statusColorMap,
} from "./utils";
import { useEffect } from "react";

// Schema Definition
const rentalUnitAndDetailsSchema = z.object({
  unit_name: z.string().min(2, "Unit name must be at least 2 characters"),
  model: z.string().min(2, "Model must be at least 2 characters"),
  serial_number: z
    .string()
    .min(2, "Serial number must be at least 2 characters"),
  status: z.enum(["available", "rented", "maintenance", "reserved"]),
  daily_rate: z.number().min(0, "Daily rate must be a positive number"),
  monthly_rate: z.number().min(0, "Monthly rate must be a positive number"),
  rental_details: z.optional(
    z.object({
      rental_id: z.number().min(0, "Rental ID is required"),
      branch_id: z.number().min(0, "Branch is required"),
      start_date: z.date(),
      end_date: z.date(),
      rental_type: z.enum(["DAILY", "MONTHLY"]),
      rate_amount: z.number().min(0, "Rate must be positive"),
      payment_terms: z.object({
        deposit: z.number().min(0),
        downpayment: z.number().min(0).optional(),
        payment_method: z.enum(["cash", "check", "gcash", "bank_transfer"]),
      }),
      status: z.enum(["ACTIVE", "INACTIVE"]),
      client: z.object({
        name: z.string().min(1, "Name is required"),
        contact_number: z.string().optional(),
        email: z.string().email().optional(),
      }),
    })
  ),
});

export type RentalUnitAndDetailsFormType = z.infer<
  typeof rentalUnitAndDetailsSchema
> & {
  rental_details?: {
    grand_total: number;
  };
};

export function RentalUnitAndDetailsForm({
  initialValues,
  mode = "view",
  onSubmit,
}: {
  initialValues?: Partial<RentalUnitAndDetailsFormType>;
  mode?: "create" | "edit" | "view";
  onSubmit: (data: RentalUnitAndDetailsFormType) => void;
}) {
  const inputResetClass =
    "border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none";
  const borderClass = "border-b border-slate-200";
  const inputClass = inputResetClass + " " + borderClass;

  const today = startOfDay(new Date());

  const form = useForm<RentalUnitAndDetailsFormType>({
    resolver: zodResolver(rentalUnitAndDetailsSchema),
    defaultValues: initialValues
      ? {
          ...initialValues,
          status: initialValues.status?.toLowerCase() as
            | "available"
            | "rented"
            | "maintenance"
            | "reserved",
        }
      : {
          unit_name: "",
          model: "",
          serial_number: "",
          status: "available",
          daily_rate: 0,
          monthly_rate: 0,
        },
  });

  const status = form.watch("status");
  const watchRentalDetails = form.watch("rental_details");
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (status === "rented" && watchRentalDetails) {
      const rentalAmount =
        calculateRentalAmount(
          watchRentalDetails.start_date,
          watchRentalDetails.end_date,
          watchRentalDetails.rate_amount,
          watchRentalDetails.rental_type
        ) || 0;

      const deposit = watchRentalDetails.payment_terms.deposit || 0;
      const downpayment = watchRentalDetails.payment_terms.downpayment || 0;

      const grandTotal = rentalAmount + deposit + downpayment;

      form.setValue("rental_details.grand_total", grandTotal);
    }
  }, [
    status,
    watchRentalDetails,
    watchRentalDetails?.start_date,
    watchRentalDetails?.end_date,
    watchRentalDetails?.rate_amount,
    watchRentalDetails?.rental_type,
    watchRentalDetails?.payment_terms?.deposit,
    watchRentalDetails?.payment_terms?.downpayment,
    form,
  ]);

  const handleSubmit = (formData: RentalUnitAndDetailsFormType) => {
    const data = JSON.parse(JSON.stringify(formData));

    if (data.status === "rented" && !data.rental_details) {
      form.setError("rental_details", {
        type: "manual",
        message: "Rental details are required when status is rented",
      });
      return;
    }

    // Explicitly calculate grand total if in rented status
    if (data.status === "rented" && data.rental_details) {
      const rentalAmount =
        calculateRentalAmount(
          data.rental_details.start_date,
          data.rental_details.end_date,
          data.rental_details.rate_amount,
          data.rental_details.rental_type
        ) || 0;

      const deposit = data.rental_details.payment_terms.deposit || 0;
      const downpayment = data.rental_details.payment_terms.downpayment || 0;

      // Explicitly set grand total
      data.rental_details.grand_total = rentalAmount + deposit + downpayment;
    }

    // console.log("Submitting rental unit and details form:", data);

    onSubmit(data);
  };

  const renderRentalDuration = () => {
    const startDate = form.watch("rental_details.start_date");
    const endDate = form.watch("rental_details.end_date");
    const unitName = form.watch("unit_name");

    if (startDate && endDate) {
      const days = differenceInDays(endDate, startDate) + 1; // Add 1 to include both start and end dates
      return (
        <div className="text-sm font-medium col-span-2 text-slate-400 mt-1">
          Unit{" "}
          <span className="font-semibold italic text-slate-500">
            {unitName}
          </span>{" "}
          rented for {days} {days === 1 ? "day" : "days"}
        </div>
      );
    }
    return null;
  };

  const renderInputField = (
    name: keyof RentalUnitAndDetailsFormType,
    label: string,
    placeholder: string,
    type: "text" | "number" = "text",
    options?: { step?: string; min?: string },
    isUnit?: boolean
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="grid grid-cols-[0.5fr_1fr]">
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                type={type}
                className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none border-b border-slate-200"
                placeholder={placeholder}
                {...(type === "number"
                  ? {
                      step: options?.step || "0.01",
                      min: options?.min || "0",
                      onChange: (e) => handleRateChange(e, field),
                    }
                  : {})}
                value={typeof field.value === "object" ? "" : field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={mode === "view" || isUnit}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Unit Header */}
        <div className="flex justify-between mt-4">
          <FormField
            control={form.control}
            name="unit_name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none placeholder:text-3xl text-3xl font-bold"
                    placeholder="Unit Name"
                    {...field}
                    disabled
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="self-end mb-1">
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled
                >
                  <FormControl>
                    <SelectTrigger
                      className={`px-2 h-fit w-fit py-0.5 border-none rounded-full text-xs font-medium ${
                        statusColorMap[field.value] || ""
                      }`}
                    >
                      <SelectValue>
                        {field.value.charAt(0).toUpperCase() +
                          field.value.slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {["available", "rented", "maintenance", "reserved"].map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className="h-[2px]" />

        {/* Unit Details Section */}
        <div className="space-y-2">
          <h2 className="font-bold opacity-40 text-xs">Unit Details</h2>
          {renderInputField(
            "model",
            "Model",
            "Model XYZ",
            undefined,
            undefined,
            true
          )}
          {renderInputField(
            "serial_number",
            "Serial Number",
            "ABC123",
            undefined,
            undefined,
            true
          )}
        </div>

        {/* Rates Section */}
        <div className="space-y-2">
          <h2 className="font-bold opacity-40 text-xs">Rates</h2>
          {renderInputField(
            "daily_rate",
            "Daily Rate",
            "50.00",
            "number",
            undefined,
            true
          )}
          {renderInputField(
            "monthly_rate",
            "Monthly Rate",
            "1000.00",
            "number",
            undefined,
            true
          )}
        </div>

        {/* Conditional Rental Details Section */}
        {status === "rented" && (
          <>
            <Separator className="mt-4 h-[2px]" />
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs px-4 bg-red-100 text-red-600 rounded-full w-fit py-0.5">
                <ReceiptText size={14} />
                Rental Details
              </div>
              <div>
                <h3 className="opacity-40 text-xs font-bold">Client</h3>
                <div className="flex justify-between gap-4 items-center">
                  <FormField
                    control={form.control}
                    name="rental_details.client.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            className={`placeholder:text-xl text-xl font-semibold ${inputResetClass}`}
                            placeholder="Enter client name"
                            {...field}
                            disabled={mode === "view"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <TooltipProvider delayDuration={100}>
                    <div className="space-x-2 flex items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            className="p-1.5 h-fit text-xs gap-1"
                            variant="outline"
                          >
                            <Phone size={14} />
                            <p>Contact No.</p>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm flex items-center gap-1">
                            {
                              initialValues?.rental_details?.client
                                .contact_number
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            className="p-1.5 h-fit text-xs gap-1"
                          >
                            <Mail size={14} />
                            <p>Email</p>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm flex items-center gap-1">
                            {initialValues?.rental_details?.client.email}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rental_details.branch_id"
                    render={({ field }) => (
                      <FormItem className="border-b col-span-2">
                        <div>
                          <FormLabel>Branch</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(Number(value));
                            }}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0"
                                disabled={mode === "view"}
                              >
                                <SelectValue
                                  placeholder={`${
                                    form.watch("rental_details.branch_id")
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rental_details.rental_type"
                    render={({ field }) => (
                      <FormItem>
                        <div>
                          <FormLabel>Rental Type</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger
                                  className={inputClass}
                                  disabled={mode === "view"}
                                >
                                  <SelectValue placeholder="Select rental type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="DAILY">Daily</SelectItem>
                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rental_details.rate_amount"
                    render={({ field }) => (
                      <FormItem>
                        <div>
                          <FormLabel>Rate Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className={inputClass}
                              placeholder="1000.00"
                              step="0.01"
                              min="0"
                              {...field}
                              onChange={(e) => handleRateChange(e, field)}
                              disabled={mode === "view"}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rental_details.start_date"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="link"
                                  className={cn(
                                    "p-0 h-fit text-left font-normal border-b",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  disabled={mode === "view"}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => isBefore(date, today)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rental_details.end_date"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="link"
                                  className={cn(
                                    "p-0 h-fit text-left font-normal border-b",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  disabled={mode === "view"}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => isBefore(date, today)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {renderRentalDuration()}
                </div>
              </div>

              <div className="rounded-md border py-2 space-y-2 group">
                <h2 className="font-bold opacity-40 text-xs mx-4">
                  Payment Details
                </h2>
                <Separator />
                <div className="mx-4 grid grid-cols-[1fr_auto]">
                  <h3 className="text-sm opacity-80 font-semibold">
                    Rental Amount
                  </h3>
                  <p className="text-sm opacity-50">
                    ₱
                    {calculateRentalAmount(
                      watchRentalDetails?.start_date,
                      watchRentalDetails?.end_date,
                      watchRentalDetails?.rate_amount,
                      watchRentalDetails?.rental_type
                    ) || 0}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="rental_details.payment_terms.deposit"
                  render={({ field }) => (
                    <FormItem className="mx-4">
                      <div className="grid grid-cols-[1fr_auto]">
                        <FormLabel className="text-sm opacity-80 font-semibold">
                          Security Deposit
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className={`${inputResetClass} text-right`}
                            placeholder="1000.00"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => handleRateChange(e, field)}
                            disabled={mode === "view"}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rental_details.payment_terms.downpayment"
                  render={({ field }) => (
                    <FormItem className="mx-4">
                      <div className="grid grid-cols-[1fr_auto]">
                        <FormLabel className="text-sm opacity-80 font-semibold">
                          Downpayment
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className={`${inputResetClass} text-right`}
                            placeholder="1000.00"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => handleRateChange(e, field)}
                            disabled={mode === "view"}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rental_details.payment_terms.payment_method"
                  render={({ field }) => (
                    <FormItem className="mx-4">
                      <div className="grid grid-cols-[1fr_auto]">
                        <FormLabel className="text-sm opacity-80 font-semibold">
                          Payment Method
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={`${inputResetClass} text-right`}
                            {...field}
                            disabled={mode === "view"}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="px-4 bg-slate-100 border-t border-b py-1 flex justify-between items-center">
                  <h4 className="font-bold">Total</h4>
                  <p className="font-semibold">
                    ₱{form.watch("rental_details.grand_total") || 0}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {mode !== "view" && (
          <Button type="submit" disabled={!isDirty}>
            {mode === "create" ? "Create Unit" : "Update Unit"}
          </Button>
        )}
      </form>
    </Form>
  );
}
