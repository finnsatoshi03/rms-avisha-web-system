import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  rentalAssetFormSchema,
  RentalAssetFormValues,
} from "./rentalSchema";
import {
  useCreateRentalAsset,
  useUpdateRentalAsset,
} from "./useCreateEditRentalAsset";
import { useUser } from "../auth/useUser";
import { RentalAsset } from "../../lib/types";
import { useQuery } from "@tanstack/react-query";
import { getBranches } from "../../services/apiBranches";
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
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface RentalAssetFormProps {
  editAsset?: RentalAsset | null;
  onSuccess?: () => void;
}

export default function RentalAssetForm({
  editAsset,
  onSuccess,
}: RentalAssetFormProps) {
  const { branchId, isAdmin } = useUser();
  const createMutation = useCreateRentalAsset();
  const updateMutation = useUpdateRentalAsset();
  const isEditing = !!editAsset;

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    enabled: isAdmin,
  });

  const form = useForm<RentalAssetFormValues>({
    resolver: zodResolver(rentalAssetFormSchema),
    defaultValues: {
      unit_name: editAsset?.unit_name || "",
      model: editAsset?.model || "",
      serial_number: editAsset?.serial_number || "",
      daily_rate: editAsset?.daily_rate || 0,
      monthly_rate: editAsset?.monthly_rate || 0,
      branch_id: editAsset?.branch_id || branchId || undefined,
      notes: editAsset?.notes || "",
    },
  });

  function onSubmit(values: RentalAssetFormValues) {
    if (isEditing && editAsset) {
      updateMutation.mutate(
        { id: editAsset.id, data: values },
        {
          onSuccess: () => onSuccess?.(),
        }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => onSuccess?.(),
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Printer Info */}
        <div>
          <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
            Printer Information
          </h2>
          <div className="grid md:grid-cols-3 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
            <FormField
              control={form.control}
              name="unit_name"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel>Printer Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Epson L3210"
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
              name="model"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Model number"
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
              name="serial_number"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Serial number"
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

        {/* Rates & Branch */}
        <div>
          <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
            Rates & Assignment
          </h2>

          <FormField
            control={form.control}
            name="daily_rate"
            render={({ field }) => (
              <FormItem className="border-b py-2">
                <div className="space-y-0 flex justify-between items-center w-full">
                  <FormLabel>Daily Rate</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-[120px] text-right"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-right" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthly_rate"
            render={({ field }) => (
              <FormItem className="border-b py-2">
                <div className="space-y-0 flex justify-between items-center w-full">
                  <FormLabel>Monthly Rate</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-[120px] text-right"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-right" />
              </FormItem>
            )}
          />

          {isAdmin && branches && (
            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem className="border-b py-2">
                  <div className="space-y-0 flex justify-between items-center w-full">
                    <FormLabel>Branch *</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                          <SelectValue placeholder="Select a branch" />
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
                  placeholder="Additional notes about this printer..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-primaryRed hover:bg-hoveredRed text-white"
          disabled={isPending}
        >
          {isPending
            ? "Saving..."
            : isEditing
              ? "Update Printer"
              : "Add Printer"}
        </Button>
      </form>
    </Form>
  );
}
