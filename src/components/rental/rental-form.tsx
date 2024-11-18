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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Loader2 } from "lucide-react";
import { useCreateUnit, useUpdateUnit } from "./useCreateEditUnit";

const rentalUnitSchema = z.object({
  unit_name: z.string().min(2, "Unit name must be at least 2 characters"),
  model: z.string().min(2, "Model must be at least 2 characters"),
  serial_number: z
    .string()
    .min(2, "Serial number must be at least 2 characters"),
  status: z.enum(["available", "rented", "maintenance", "reserved"]),
  daily_rate: z.number().min(0, "Daily rate must be a positive number"),
  monthly_rate: z.number().min(0, "Monthly rate must be a positive number"),
});

export type RentalUnitFormType = z.infer<typeof rentalUnitSchema>;

export function RentalUnitForm({
  initialValues,
  mode = "create",
  onSubmit,
}: {
  initialValues?: Partial<RentalUnitFormType>;
  mode?: "create" | "edit" | "view";
  onSubmit: (data: RentalUnitFormType) => void;
}) {
  const inputResetClass =
    "border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none";
  const borderClass = "border-b border-slate-200";
  const inputClass = inputResetClass + " " + borderClass;

  const { isPending: isCreating } = useCreateUnit();
  const { isPending: isUpdating } = useUpdateUnit();
  const isLoading = isCreating || isUpdating;

  const handleRateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: any
  ) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      field.onChange(Number(value));
    }
  };

  const form = useForm<RentalUnitFormType>({
    resolver: zodResolver(rentalUnitSchema),
    defaultValues: initialValues
      ? {
          ...initialValues,
          status:
            (initialValues.status?.toLowerCase() as
              | "available"
              | "rented"
              | "maintenance"
              | "reserved") || "available",
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <div className="flex justify-between">
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
          <h2 className="uppercase text-slate-400 text-xs">Unit Details</h2>
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
          <h2 className="uppercase text-slate-400 text-xs">Rates</h2>
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

        {mode !== "view" && (
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>{mode === "create" ? "Adding..." : "Saving..."}</span>
              </>
            ) : mode === "create" ? (
              "Add Unit"
            ) : (
              "Save Changes"
            )}
          </Button>
        )}
      </form>
    </Form>
  );
}
