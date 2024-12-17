/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
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
import { Loader2, CalendarIcon, Clock } from "lucide-react";
import { useCreateRental } from "./useCreateRental";
import { Calendar } from "../ui/calendar";
import { format, addMonths, startOfDay, isBefore, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";
import { useUser } from "../auth/useUser";
import { calculateRentalAmount } from "./utils";

const paymentMethods = [
  { label: "Cash", value: "cash" },
  { label: "Check", value: "check" },
  { label: "GCash", value: "gcash" },
  { label: "PayMaya", value: "paymaya" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "GrabPay", value: "grabpay" },
];

const rentalSchema = z.object({
  unit_id: z.number(),
  branch_id: z.number().min(0, "Branch is required"),
  start_date: z.date(),
  end_date: z.date(),
  rental_type: z.enum(["DAILY", "MONTHLY"]),
  rate_amount: z.number().min(0, "Rate amount must be a positive number"),
  payment_terms: z.object({
    deposit: z.number().min(0),
    downpayment: z
      .number()
      .min(0)
      .optional()
      .superRefine((downpayment, ctx) => {
        const totalAmount = (ctx.path as any).totalAmount;
        if (downpayment && downpayment > totalAmount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Downpayment cannot be greater than the total amount due",
          });
        }
      }),
    payment_method: z.enum([
      "cash",
      "check",
      "gcash",
      "paymaya",
      "bank_transfer",
      "grabpay",
    ]),
  }),
  status: z.enum(["ACTIVE", "INACTIVE"]) as z.ZodType<"ACTIVE" | "INACTIVE">,
  client: z.object({
    name: z.string().min(1, "Client name is required"),
    contact_number: z.string().optional(),
    email: z.string().email().optional(),
  }),
});

export type RentalFormType = z.infer<typeof rentalSchema>;
interface RentalFormProps {
  unitId: string;
  dailyRate: number;
  monthlyRate: number;
  // clients: { id: string; name: string }[];
  onComplete: () => void;
}

export function RentalForm({
  unitId,
  dailyRate,
  monthlyRate,
  // clients,
  onComplete,
}: RentalFormProps) {
  const inputResetClass =
    "border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none";
  const borderClass = "border-b border-slate-200";
  const inputClass = inputResetClass + " " + borderClass;

  const { isTaytay, isPasig, isAdmin, user } = useUser();
  const { mutate: createRental, isPending } = useCreateRental();

  const [showDownpayment, setShowDownpayment] = useState(false);
  const [contactNumber, setContactNumber] = useState("+63 ");

  const today = startOfDay(new Date());
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const isTechnician = user?.user_metadata.role?.includes("technician");

  const userIsPasig =
    isTechnician && user?.user_metadata.role?.includes("pasig");
  const userIsTaytay =
    isTechnician && user?.user_metadata.role?.includes("taytay");
  const userIsGeneral = isTechnician && !userIsPasig && !userIsTaytay;

  const form = useForm<RentalFormType>({
    resolver: zodResolver(rentalSchema),
    defaultValues: {
      unit_id: parseInt(unitId, 10),
      rental_type: "DAILY",
      rate_amount: dailyRate,
      payment_terms: {
        deposit: 0,
        downpayment: 0,
        payment_method: "cash",
      },
      status: "ACTIVE",
      start_date: new Date(),
      end_date: new Date(),
      client: {
        name: "",
        contact_number: "",
        email: "",
      },
    },
  });

  const watchRentalType = form.watch("rental_type");
  const watchStartDate = form.watch("start_date");
  const watchEndDate = form.watch("end_date");
  const watchRateAmount = form.watch("rate_amount");
  const watchDeposit = form.watch("payment_terms.deposit");
  const watchDownpayment = form.watch("payment_terms.downpayment");
  const watchPaymentMethod = form.watch("payment_terms.payment_method");
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

  // Calculate total amount before downpayment
  const calculateTotalBeforeDownpayment = useCallback(() => {
    const rentalAmount = calculateRentalAmount(
      watchStartDate,
      watchEndDate,
      watchRateAmount,
      watchRentalType
    );
    return rentalAmount + (watchDeposit || 0);
  }, [calculateRentalAmount, watchDeposit]);

  // Calculate grand total
  const calculateGrandTotal = () => {
    const totalBeforeDownpayment = calculateTotalBeforeDownpayment();
    return totalBeforeDownpayment - (watchDownpayment || 0);
  };

  const calculateMonthlyEndDate = (startDate: Date) => {
    // Add one month and one day to the start date
    return addDays(addMonths(startDate, 1), 1);
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

  // Update rate amount when rental type changes
  useEffect(() => {
    form.setValue(
      "rate_amount",
      watchRentalType === "DAILY" ? dailyRate : monthlyRate
    );

    const currentStartDate = form.getValues("start_date");
    const newStartDate =
      !currentStartDate || isBefore(currentStartDate, today)
        ? today
        : currentStartDate;

    if (watchRentalType === "MONTHLY") {
      form.setValue("start_date", newStartDate);
      form.setValue("end_date", calculateMonthlyEndDate(newStartDate));
    } else {
      // For daily rentals, keep the existing dates if they're valid
      if (!currentStartDate || isBefore(currentStartDate, today)) {
        form.setValue("start_date", today);
        form.setValue("end_date", addDays(today, 1));
      }
    }
  }, [watchRentalType, dailyRate, monthlyRate, form, today]);

  // Handle start date change
  useEffect(() => {
    if (!watchStartDate) return;

    if (watchRentalType === "MONTHLY") {
      form.setValue("end_date", calculateMonthlyEndDate(watchStartDate));
    } else {
      const currentEndDate = form.getValues("end_date");
      if (!currentEndDate || isBefore(currentEndDate, watchStartDate)) {
        form.setValue("end_date", addDays(watchStartDate, 1));
      }
    }
  }, [watchStartDate, watchRentalType, form]);

  // Validate downpayment when total changes
  useEffect(() => {
    if (showDownpayment && watchDownpayment) {
      const totalBeforeDownpayment = calculateTotalBeforeDownpayment();
      if (watchDownpayment > totalBeforeDownpayment) {
        form.setError("payment_terms.downpayment", {
          type: "custom",
          message: "Downpayment cannot be greater than the total amount due",
        });
      } else {
        form.clearErrors("payment_terms.downpayment");
      }
    }
  }, [
    watchDownpayment,
    calculateTotalBeforeDownpayment,
    form,
    showDownpayment,
  ]);

  const onSubmit = (data: RentalFormType) => {
    const totalBeforeDownpayment = calculateTotalBeforeDownpayment();
    if (
      data.payment_terms.downpayment &&
      data.payment_terms.downpayment > totalBeforeDownpayment
    ) {
      form.setError("payment_terms.downpayment", {
        type: "custom",
        message: "Downpayment cannot be greater than the total amount due",
      });
      return;
    }

    const finalData = {
      ...data,
      branch_id: branchId,
      grand_total: calculateGrandTotal().toFixed(2),
    };
    // console.log(finalData);
    createRental(finalData, {
      onSuccess: () => {
        onComplete();
      },
      onError: (error) => {
        console.error(error);
      },
    });
  };

  const rentalAmount = calculateRentalAmount(
    watchStartDate,
    watchEndDate,
    watchRateAmount,
    watchRentalType
  );
  const totalBeforeDownpayment = calculateTotalBeforeDownpayment();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Separator className="mt-2 -mb-2" />
        <div>
          <div className="px-3 py-1 bg-gray-200 rounded-full text-gray-600 text-xs w-fit flex items-center gap-1">
            <Clock size={12} strokeWidth={1.5} />
            {date}
          </div>
          <FormField
            control={form.control}
            name="client.name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className="mt-2 border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-3xl text-3xl font-bold rounded-none mb-2"
                    placeholder="Client Name"
                    autoFocus
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
            <div className="grid sm:grid-cols-2 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
              <FormField
                control={form.control}
                name="client.contact_number"
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
                name="client.email"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel>Client Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Client Email"
                        className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xs mt-2 font-bold opacity-40">Rental Details</h2>
          <div className="grid grid-cols-2 gap-4">
            {(isAdmin || userIsGeneral) && (
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem className="border-b col-span-2 space-y-0">
                    <FormLabel>Branch</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(Number(value));
                      }}
                      // defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0">
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="rental_type"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel>Rental Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select rental type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rate_amount"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel>Rate Amount</FormLabel>
                  <FormControl>
                    <Input
                      className={inputClass}
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value))
                      }
                      disabled
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => isBefore(date, today)}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
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
                          disabled={watchRentalType === "MONTHLY"}
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          watchRentalType === "MONTHLY" ||
                          !watchStartDate ||
                          isBefore(date, watchStartDate)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  {watchRentalType === "MONTHLY" ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      End date is automatically set to one month plus one day
                      from the start date
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      End date must be after the start date
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="rounded-md border py-2 space-y-2 group">
          <h2 className="font-bold opacity-40 text-xs mx-4">Payment Details</h2>
          <Separator />

          <div className="mx-4 flex justify-between">
            <span className="text-sm opacity-80 font-semibold">
              Rental Amount
            </span>
            <span className="text-sm">₱{rentalAmount.toFixed(2)}</span>
          </div>
          <FormField
            control={form.control}
            name="payment_terms.deposit"
            render={({ field }) => (
              <FormItem className="mx-4 grid grid-cols-[1fr_auto] space-y-0 items-center">
                <FormLabel>Security Deposit</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter security deposit"
                    className={`${inputResetClass} text-right`}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_terms.downpayment"
            render={({ field }) => (
              <FormItem className="mx-4 grid grid-cols-[1fr_auto] space-y-0 items-center">
                <FormLabel>Downpayment</FormLabel>
                <FormControl>
                  {!showDownpayment ? (
                    <Button
                      type="button"
                      variant="link"
                      className="w-full h-fit text-right p-0 text-sm"
                      onClick={() => setShowDownpayment(true)}
                    >
                      Add Downpayment
                    </Button>
                  ) : (
                    <Input
                      className={`${inputResetClass} text-right text-green-600`}
                      type="number"
                      step="0.01"
                      placeholder="Enter downpayment amount"
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value > totalBeforeDownpayment) {
                          form.setError("payment_terms.downpayment", {
                            type: "custom",
                            message:
                              "Downpayment cannot be greater than the total amount due",
                          });
                        } else {
                          form.clearErrors("payment_terms.downpayment");
                        }
                        field.onChange(value);
                      }}
                    />
                  )}
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  Maximum downpayment: ₱{totalBeforeDownpayment.toFixed(2)}
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_terms.payment_method"
            render={({ field }) => (
              <FormItem className="mx-4 space-y-0">
                <FormLabel>Payment Method</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => (
                    <Button
                      key={method.value}
                      type="button"
                      className={cn(
                        "hover:bg-green-500 hover:text-white",
                        field.value === method.value &&
                          "bg-green-500 text-white"
                      )}
                      variant="outline"
                      onClick={() => field.onChange(method.value)}
                    >
                      {method.label}
                    </Button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="border-t px-4 text-sm pt-1 flex justify-between items-center">
            <span className="font-semibold">Subtotal</span>
            <span>₱{totalBeforeDownpayment.toFixed(2)}</span>
          </div>
          <div className="px-4 bg-slate-100 border-t border-b py-1 flex justify-between items-center">
            <h4 className="font-bold">Total</h4>
            <p className="font-semibold">₱{calculateGrandTotal().toFixed(2)}</p>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Creating rental...</span>
            </>
          ) : (
            "Create Rental"
          )}
        </Button>
      </form>
    </Form>
  );
}
