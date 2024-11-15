import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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

const rentalUnitSchema = z.object({
  unit_name: z.string().min(2, "Unit name must be at least 2 characters"),
  model: z.string().min(2, "Model must be at least 2 characters"),
  serial_number: z
    .string()
    .min(2, "Serial number must be at least 2 characters"),
  status: z.enum(["available", "rented", "maintenance", "reserved"]),
  daily_rate: z
    .string()
    .transform((val) => parseFloat(val))
    .refine((val) => val > 0, "Daily rate must be a positive number"),
  monthly_rate: z
    .string()
    .transform((val) => parseFloat(val))
    .refine((val) => val > 0, "Monthly rate must be a positive number"),
});

type RentalUnitForm = z.infer<typeof rentalUnitSchema>;

export function RentalUnitForm({
  initialValues,
  mode = "create",
}: {
  initialValues?: Partial<RentalUnitForm>;
  mode?: "create" | "edit" | "view";
}) {
  const form = useForm<RentalUnitForm>({
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

  const onSubmit = (data: RentalUnitForm) => {
    console.log("Rental unit data:", data);
    // Implement your submit logic here
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="unit_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Unit 123"
                  {...field}
                  disabled={mode === "view"}
                />
              </FormControl>
              <FormDescription>The name of the rental unit.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <FormControl>
                <Input
                  placeholder="Model XYZ"
                  {...field}
                  disabled={mode === "view"}
                />
              </FormControl>
              <FormDescription>The model of the rental unit.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="serial_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serial Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="ABC123"
                  {...field}
                  disabled={mode === "view"}
                />
              </FormControl>
              <FormDescription>
                The serial number of the rental unit.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The current status of the rental unit.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="daily_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Daily Rate</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="50.00"
                  {...field}
                  disabled={mode === "view"}
                />
              </FormControl>
              <FormDescription>
                The daily rental rate for this unit.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="monthly_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Rate</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="1000.00"
                  {...field}
                  disabled={mode === "view"}
                />
              </FormControl>
              <FormDescription>
                The monthly rental rate for this unit.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode !== "view" && (
          <Button type="submit" className="w-full">
            {mode === "create" ? "Add Unit" : "Save Changes"}
          </Button>
        )}
      </form>
    </Form>
  );
}
