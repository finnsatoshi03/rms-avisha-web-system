import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inspectionFormSchema, InspectionFormValues } from "./rentalSchema";
import { useSaveInspection } from "./useSaveInspection";
import { useRentalStatusUpdate } from "./useRentalStatusUpdate";
import { useUser } from "../auth/useUser";
import { RentalData, RentalInspection } from "../../lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
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

interface ReturnInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: RentalData | null;
  existingInspection?: RentalInspection | null;
}

export default function ReturnInspectionDialog({
  open,
  onOpenChange,
  rental,
  existingInspection,
}: ReturnInspectionDialogProps) {
  const { user } = useUser();
  const saveMutation = useSaveInspection();
  const statusMutation = useRentalStatusUpdate();

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: {
      physical_condition: existingInspection?.physical_condition || "",
      print_quality: existingInspection?.print_quality || "",
      meter_reading_start: existingInspection?.meter_reading_start ?? null,
      meter_reading_end: existingInspection?.meter_reading_end ?? null,
      accessories_returned: existingInspection?.accessories_returned || "",
      missing_items: existingInspection?.missing_items || "",
      damage_assessment: existingInspection?.damage_assessment || "",
      damage_penalty: existingInspection?.damage_penalty || 0,
      notes: existingInspection?.notes || "",
    },
  });

  function onSubmit(values: InspectionFormValues) {
    if (!rental) return;

    saveMutation.mutate(
      {
        rentalId: rental.id,
        data: {
          ...values,
          meter_reading_start: values.meter_reading_start ?? undefined,
          meter_reading_end: values.meter_reading_end ?? undefined,
          inspected_by: user?.id,
        },
      },
      {
        onSuccess: () => {
          if (["Released", "Ongoing"].includes(rental.status)) {
            statusMutation.mutate({
              ids: [rental.id],
              status: "Returned",
            });
          }
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return Inspection — {rental?.rental_no}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Condition Assessment */}
            <div>
              <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
                Condition Assessment
              </h2>
              <div className="grid grid-cols-2 gap-2 px-4 py-2 border rounded-xl">
                <FormField
                  control={form.control}
                  name="physical_condition"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Physical Condition</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Excellent">Excellent</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="print_quality"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Print Quality</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Select quality" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Excellent">Excellent</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Meter Readings */}
            <div>
              <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
                Meter Readings
              </h2>
              <div className="grid grid-cols-2 gap-0">
                <FormField
                  control={form.control}
                  name="meter_reading_start"
                  render={({ field }) => (
                    <FormItem className="border-b py-2 pr-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>Start</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-[100px] text-right"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : null
                              )
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
                  name="meter_reading_end"
                  render={({ field }) => (
                    <FormItem className="border-b py-2 pl-2">
                      <div className="space-y-0 flex justify-between items-center w-full">
                        <FormLabel>End</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-[100px] text-right"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Items & Accessories */}
            <div>
              <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
                Items & Accessories
              </h2>
              <FormField
                control={form.control}
                name="accessories_returned"
                render={({ field }) => (
                  <FormItem className="border-b py-2">
                    <div className="space-y-0 flex justify-between items-center w-full">
                      <FormLabel>Accessories Returned</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="List returned accessories..."
                          className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-[60%] text-right"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-right" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="missing_items"
                render={({ field }) => (
                  <FormItem className="border-b py-2">
                    <div className="space-y-0 flex justify-between items-center w-full">
                      <FormLabel>Missing Items</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="List any missing items..."
                          className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-[60%] text-right"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-right" />
                  </FormItem>
                )}
              />
            </div>

            {/* Damage */}
            <div>
              <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
                Damage
              </h2>
              <FormField
                control={form.control}
                name="damage_assessment"
                render={({ field }) => (
                  <FormItem className="space-y-0 w-full mb-2">
                    <FormLabel>Damage Assessment</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe any damage..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="damage_penalty"
                render={({ field }) => (
                  <FormItem className="border-b py-2">
                    <div className="space-y-0 flex justify-between items-center w-full">
                      <FormLabel>Damage Penalty</FormLabel>
                      <FormControl>
                        <div className="flex items-center relative">
                          <span className="absolute pointer-events-none text-sm">₱</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-[100px] text-right ml-3"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage className="text-right" />
                  </FormItem>
                )}
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
                      placeholder="Additional inspection notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Saving..."
                  : "Save Inspection & Mark Returned"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
