import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Check, Loader2, Minus, Plus } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { createEditMaterialStock } from "../../services/apiMaterials";
import { MaterialStocks } from "../../lib/types";
import { LowStockRow } from "../../services/apiInventory";

/**
 * Restock / edit form for one SKU, shaped for the low-stock board's detail sheet
 * (docs/INVENTORY_LOW_STOCK.md).
 *
 * This is the Sheet-shaped sibling of `materials/material-collapsible-form.tsx`,
 * which is locked to a `<tr>` and so cannot be reused here. It writes through
 * the same `createEditMaterialStock` service, which bumps `last_stocks_added`
 * automatically whenever the stock count actually changes.
 *
 * One deliberate difference from the Materials form: `stocks` accepts 0 here.
 * The Materials form uses `.positive()`, which makes "set this to zero" fail
 * validation — unusable on a board whose whole subject is depleted stock.
 */
const formSchema = z
  .object({
    material_name: z.string().min(1, "Display name is required"),
    brand: z.string().optional(),
    category: z.string().optional(),
    // Non-negative, not positive: writing 0 is a legitimate correction here.
    stocks: z
      .number({ invalid_type_error: "Enter a quantity" })
      .int("Whole units only")
      .min(0, "Cannot be negative"),
    cost: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
  })
  .refine(
    (data) =>
      data.cost == null || data.price == null || data.cost <= data.price,
    { message: "Cost is higher than the selling price", path: ["cost"] }
  );

type FormValues = z.infer<typeof formSchema>;

export default function SkuRestockForm({
  row,
  suggestedStock,
  onSaved,
}: {
  row: LowStockRow;
  /** Pre-filled quantity when the card was dragged into a lane. */
  suggestedStock?: number | null;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [dirty, setDirty] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      material_name: row.name,
      brand: row.brand ?? "",
      category: row.category ?? "",
      stocks: suggestedStock ?? row.stocks,
      cost: row.cost ?? undefined,
      price: row.price ?? undefined,
    },
  });

  // The sheet keeps this component mounted while the user clicks between cards,
  // so the form has to follow the selected SKU (and any dropped suggestion).
  useEffect(() => {
    form.reset({
      material_name: row.name,
      brand: row.brand ?? "",
      category: row.category ?? "",
      stocks: suggestedStock ?? row.stocks,
      cost: row.cost ?? undefined,
      price: row.price ?? undefined,
    });
    setDirty(suggestedStock != null && suggestedStock !== row.stocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, suggestedStock]);

  useEffect(() => {
    const subscription = form.watch(() => setDirty(true));
    return () => subscription.unsubscribe();
  }, [form]);

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (values: FormValues) =>
      createEditMaterialStock(values as Partial<MaterialStocks>, row.id),
    onSuccess: () => {
      // Both the board and the Materials page read this SKU.
      queryClient.invalidateQueries({ queryKey: ["low_stock"] });
      queryClient.invalidateQueries({ queryKey: ["materialStocks"] });
      toast.success("Stock updated");
      setDirty(false);
      onSaved?.();
    },
    onError: (error) => {
      toast.error("Could not update this material");
      console.error(error);
    },
  });

  const stocksValue = form.watch("stocks");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutate(values))}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="stocks"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                  className="font-bold text-5xl p-4 rounded-xl border h-fit text-center tabular-nums"
                />
              </FormControl>
              <div className="font-semibold flex items-center justify-center gap-3 text-sm">
                <button
                  type="button"
                  aria-label="Decrease stock"
                  onClick={() =>
                    field.onChange(Math.max((field.value ?? 0) - 1, 0))
                  }
                  className="size-6 grid place-items-center border rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Minus size={12} />
                </button>
                On hand
                <button
                  type="button"
                  aria-label="Increase stock"
                  onClick={() => field.onChange((field.value ?? 0) + 1)}
                  className="size-6 grid place-items-center border rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {suggestedStock != null && stocksValue === suggestedStock && (
          <p className="text-[11px] text-center text-brand-deep">
            Suggested from the lane you dropped this into — adjust it before
            saving if the real count differs.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <TextField
            control={form.control}
            name="material_name"
            label="Display name"
            className="col-span-2"
          />
          <TextField control={form.control} name="brand" label="Brand" />
          <TextField control={form.control} name="category" label="Tags" />
          <NumberField control={form.control} name="cost" label="Cost" />
          <NumberField control={form.control} name="price" label="Price" />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="h-fit py-1"
            disabled={isPending || !dirty}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : isSuccess && !dirty ? (
              <>
                <Check className="mr-2 size-4" />
                Saved
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// The two field wrappers below only exist to keep the form body readable; they
// reuse the same borderless underline styling the Materials forms use.
const FIELD_INPUT_CLASS =
  "border-0 border-b p-0 h-fit focus-visible:border-b-foreground focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none";

type ControlProp = { control: ReturnType<typeof useForm<FormValues>>["control"] };

function TextField({
  control,
  name,
  label,
  className = "",
}: ControlProp & {
  name: "material_name" | "brand" | "category";
  label: string;
  className?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={`space-y-0 ${className}`}>
          <FormLabel className="text-[11px] opacity-60">{label}</FormLabel>
          <FormControl>
            <Input
              className={FIELD_INPUT_CLASS}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberField({
  control,
  name,
  label,
}: ControlProp & { name: "cost" | "price"; label: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-0">
          <FormLabel className="text-[11px] opacity-60">{label}</FormLabel>
          <FormControl>
            <Input
              className={`${FIELD_INPUT_CLASS} tabular-nums`}
              inputMode="decimal"
              value={field.value ?? ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "");
                field.onChange(raw === "" ? undefined : parseFloat(raw));
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
