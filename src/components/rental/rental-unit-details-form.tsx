/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
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
import { CalendarIcon, Mail, Phone, ReceiptText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";
import {
  differenceInDays,
  endOfMonth,
  format,
  isBefore,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { Calendar } from "../ui/calendar";
import { useCallback } from "react";

// Combined schema for rental unit and rental details
const rentalUnitAndDetailsSchema = z.object({
  // Unit Details
  unit_name: z.string().min(2, "Unit name must be at least 2 characters"),
  model: z.string().min(2, "Model must be at least 2 characters"),
  serial_number: z
    .string()
    .min(2, "Serial number must be at least 2 characters"),
  status: z.enum(["available", "rented", "maintenance", "reserved"]),
  daily_rate: z.number().min(0, "Daily rate must be a positive number"),
  monthly_rate: z.number().min(0, "Monthly rate must be a positive number"),

  // Optional Rental Details (only required when status is 'rented')
  rental_details: z.optional(
    z.object({
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

type BaseRentalUnitAndDetailsFormType = z.infer<
  typeof rentalUnitAndDetailsSchema
>;

export type RentalUnitAndDetailsFormType = BaseRentalUnitAndDetailsFormType & {
  rental_details?: {
    grand_total: number;
  } & NonNullable<BaseRentalUnitAndDetailsFormType["rental_details"]>;
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

  const handleRateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: any
  ) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      field.onChange(Number(value));
    }
  };

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

  const handleSubmit = (data: RentalUnitAndDetailsFormType) => {
    // Validate rental details if status is 'rented'
    if (data.status === "rented" && !data.rental_details) {
      form.setError("rental_details", {
        type: "manual",
        message: "Rental details are required when status is rented",
      });
      return;
    }

    console.log("Submitting rental unit and details form:", data);
    // onSubmit(data);
  };

  const watchRentalType = form.watch("rental_details.rental_type");
  const watchStartDate = form.watch("rental_details.start_date");
  const watchEndDate = form.watch("rental_details.end_date");
  const watchRateAmount = form.watch("rental_details.rate_amount");

  // Calculate rental amount
  const calculateRentalAmount = useCallback(() => {
    if (!watchStartDate || !watchEndDate || !watchRateAmount) return 0;

    if (watchRentalType === "DAILY") {
      // For daily rentals, calculate the exact number of days including both start and end dates
      const days = differenceInDays(watchEndDate, watchStartDate) + 1;
      return Math.max(0, days) * watchRateAmount;
    } else {
      // For monthly rentals:
      // 1. Get the number of full months
      const monthStart = startOfMonth(watchStartDate);
      const monthEnd = endOfMonth(watchEndDate);
      const fullMonths = differenceInDays(monthEnd, monthStart) / 30;

      // 2. Round up to the nearest month since partial months are charged as full months
      const months = Math.ceil(fullMonths);

      // 3. Calculate the total amount
      return Math.max(1, months) * watchRateAmount;
    }
  }, [watchStartDate, watchEndDate, watchRateAmount, watchRentalType]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="flex justify-between mt-4">
          <FormField
            control={form.control}
            name="unit_name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className={`placeholder:text-3xl text-3xl font-bold ${inputResetClass}`}
                    placeholder="Unit Name"
                    {...field}
                    disabled={mode === "view"}
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
                  disabled={mode === "view"}
                >
                  <FormControl>
                    <SelectTrigger
                      className={`px-2 h-fit w-fit py-0.5 border-none rounded-full text-xs font-medium ${
                        {
                          available: "bg-green-100 text-green-800",
                          rented: "bg-red-100 text-red-800",
                          maintenance: "bg-yellow-100 text-yellow-800",
                          reserved: "bg-blue-100 text-blue-800",
                        }[field.value] || ""
                      }`}
                    >
                      <SelectValue placeholder="Select unit status">
                        {field.value.charAt(0).toUpperCase() +
                          field.value.slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Separator className="h-[2px]" />
        <div className="space-y-2">
          <h2 className="font-bold opacity-40 text-xs">Unit Details</h2>
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-[0.5fr_1fr]">
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input
                      className={inputClass}
                      placeholder="Model XYZ"
                      {...field}
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
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-[0.5fr_1fr]">
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl>
                    <Input
                      className={inputClass}
                      placeholder="ABC123"
                      {...field}
                      disabled={mode === "view"}
                    />
                  </FormControl>
                </div>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <h2 className="font-bold opacity-40 text-xs">Rates</h2>
          <FormField
            control={form.control}
            name="daily_rate"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-[0.5fr_1fr]">
                  <FormLabel>Daily Rate</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className={inputClass}
                      placeholder="50.00"
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
            name="monthly_rate"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-[0.5fr_1fr]">
                  <FormLabel>Monthly Rate</FormLabel>
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
                    <div className="space-x-2">
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
                    ₱{calculateRentalAmount()}
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
                    ₱{initialValues?.rental_details?.grand_total || 0}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {mode !== "view" && (
          <Button type="submit">
            {mode === "create" ? "Create Unit" : "Update Unit"}
          </Button>
        )}
      </form>
    </Form>
  );
}
