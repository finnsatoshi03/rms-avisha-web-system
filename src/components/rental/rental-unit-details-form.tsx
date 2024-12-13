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

export type RentalUnitAndDetailsFormType = z.infer<
  typeof rentalUnitAndDetailsSchema
>;

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
        <Separator />
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
            <Separator className="mt-4" />
            <div className="space-y-4">
              <h3 className="opacity-40 text-xs font-bold">Rental Details</h3>

              <FormField
                control={form.control}
                name="rental_details.branch_id"
                render={({ field }) => (
                  <FormItem className="pb-2 border-b">
                    <div className="grid grid-cols-[1fr_auto]">
                      <FormLabel>Branch</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(Number(value));
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0">
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

              {/* Add other rental details fields similarly */}
              {/* Client Details, Dates, Payment Terms, etc. */}
            </div>
          </>
        )}

        <Button type="submit" disabled={mode === "view"}>
          {mode === "create" ? "Create Unit" : "Update Unit"}
        </Button>
      </form>
    </Form>
  );
}
