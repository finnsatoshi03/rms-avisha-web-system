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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Separator } from "../ui/separator";
import { Loader2, CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { useCreateRental } from "./useCreateRental";
import { Calendar } from "../ui/calendar";
import {
  format,
  differenceInDays,
  addMonths,
  endOfMonth,
  startOfMonth,
  startOfDay,
  isBefore,
  addDays,
} from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";
import { useUser } from "../auth/useUser";

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
  client_id: z.number().min(0, "Client is required"),
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
        // This will be populated during validation with the calculated total
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
});

export type RentalFormType = z.infer<typeof rentalSchema>;

interface RentalFormProps {
  unitId: string;
  dailyRate: number;
  monthlyRate: number;
  clients: { id: string; name: string }[];
  onComplete: () => void;
}

export function RentalForm({
  unitId,
  dailyRate,
  monthlyRate,
  clients,
  onComplete,
}: RentalFormProps) {
  const { isTaytay, isPasig, isAdmin, user } = useUser();
  const { mutate: createRental, isPending } = useCreateRental();

  const [showDownpayment, setShowDownpayment] = useState(false);

  const today = startOfDay(new Date());
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
      client_id: 0,
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

  // Calculate total amount before downpayment
  const calculateTotalBeforeDownpayment = useCallback(() => {
    const rentalAmount = calculateRentalAmount();
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

  const rentalAmount = calculateRentalAmount();
  const totalBeforeDownpayment = calculateTotalBeforeDownpayment();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {(isAdmin || userIsGeneral) && (
          <FormField
            control={form.control}
            name="branch_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(Number(value));
                  }}
                  // defaultValue={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
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
          name="client_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Client</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? clients.find(
                            (client) => parseInt(client.id, 10) === field.value
                          )?.name
                        : "Select client"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height]">
                  <Command>
                    <CommandInput placeholder="Search client..." />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            value={client.name}
                            key={client.id}
                            onSelect={() => {
                              form.setValue(
                                "client_id",
                                parseInt(client.id, 10)
                              );
                            }}
                          >
                            {client.name}
                            <Check
                              className={cn(
                                "ml-auto",
                                client.id === field.value.toString()
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rental_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rental Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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

        <div className="grid grid-cols-2 gap-4">
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
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
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
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
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
                    End date is automatically set to one month plus one day from
                    the start date
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

        <FormField
          control={form.control}
          name="rate_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rate Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  disabled
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Payment Details</h3>

          <FormField
            control={form.control}
            name="payment_terms.deposit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Security Deposit</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!showDownpayment ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowDownpayment(true)}
            >
              Add Downpayment
            </Button>
          ) : (
            <FormField
              control={form.control}
              name="payment_terms.downpayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Downpayment</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
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
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Maximum downpayment: ${totalBeforeDownpayment.toFixed(2)}
                  </p>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="payment_terms.payment_method"
            render={({ field }) => (
              <FormItem>
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
        </div>

        <Separator />

        <div className="rounded-lg bg-muted p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Rental Amount:</span>
              <span>${rentalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Deposit:</span>
              <span>${(watchDeposit || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Before Downpayment:</span>
              <span>${totalBeforeDownpayment.toFixed(2)}</span>
            </div>
            {showDownpayment && (
              <div className="flex justify-between text-green-600">
                <span>Downpayment:</span>
                <span>-${(watchDownpayment || 0).toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Balance Due:</span>
              <span>${calculateGrandTotal().toFixed(2)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Payment Method:{" "}
              {
                paymentMethods.find((m) => m.value === watchPaymentMethod)
                  ?.label
              }
            </div>
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
