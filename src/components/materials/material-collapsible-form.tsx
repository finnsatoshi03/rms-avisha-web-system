/* eslint-disable @typescript-eslint/no-explicit-any */
import { Check, Loader2, Minus, Plus } from "lucide-react";
import { MaterialStocks } from "../../lib/types";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEditMaterialStock } from "../../services/apiMaterials";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

const formSchema = z
  .object({
    material_name: z.string().min(1, "Display name is required"),
    brand: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 3, {
        message: "At least 3 characters required",
      }),
    cost: z.number().int().positive(),
    price: z.number().int().positive(),
    stocks: z.number().int().positive(),
    category: z.string().optional(),
  })
  .refine((data) => data.cost < data.price, {
    message: "Cost must be lower than the selling price",
    path: ["cost"],
  });

export default function MaterialCollapsibleForm({
  visibleColumns,
  material,
  onClose,
}: {
  visibleColumns: string[];
  material: MaterialStocks;
  onClose?: () => void;
}) {
  const queryClient = useQueryClient();
  const editSession = Boolean(material.id);
  const [isFormChanged, setIsFormChanged] = useState(false);

  const {
    mutate: mutateMaterialStock,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: ({
      newMaterial,
      id,
    }: {
      newMaterial: Partial<MaterialStocks>;
      id: number;
    }) => createEditMaterialStock(newMaterial, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materialStocks"] });
      toast.success("Material updated successfully!");
    },
    onError: (error) => {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editSession
      ? material
      : {
          material_name: "",
          brand: "",
          cost: undefined,
          price: undefined,
          stocks: undefined,
          category: "",
        },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutateMaterialStock({ newMaterial: values, id: material.id });
  };

  const increment = (field: any) => {
    field.onChange(field.value + 1);
  };

  const decrement = (field: any) => {
    field.onChange(Math.max(field.value - 1, 0));
  };

  const calculateProfitPercentage = (cost: number, price: number) => {
    if (cost && price) {
      return ((price - cost) / cost) * 100;
    }
    return 0;
  };

  const profitPercentage = calculateProfitPercentage(
    form.watch("cost"),
    form.watch("price")
  );

  useEffect(() => {
    const subscription = form.watch(() => setIsFormChanged(true));
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <tr className="px-4 pt-2">
      <td colSpan={visibleColumns.length + 6} className="border">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="mx-16 my-4 grid grid-cols-[1fr_1fr_1fr_1fr] gap-8">
              <FormField
                control={form.control}
                name="stocks"
                render={({ field }) => (
                  <div className="space-y-2">
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="font-bold text-6xl p-4 rounded-xl border h-fit text-center"
                      />
                    </FormControl>
                    <p className="font-semibold flex items-center justify-center gap-2">
                      <span onClick={() => decrement(field)}>
                        <Minus
                          size={12}
                          className="size-5 p-1 border rounded-full cursor-pointer"
                        />
                      </span>
                      Stocks
                      <span onClick={() => increment(field)}>
                        <Plus
                          size={12}
                          className="size-5 p-1 border rounded-full cursor-pointer"
                        />
                      </span>
                    </p>
                  </div>
                )}
              />
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="material_name"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel
                        className={`${
                          form.watch("material_name")
                            ? "opacity-60"
                            : "opacity-100"
                        }`}
                      >
                        Display Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
                          placeholder="Product Name"
                          // disabled={readonly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-[0.5fr_1fr] gap-4">
                  <div>
                    <Label className="opacity-60">SKU</Label>
                    <Input
                      className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2 placeholder:text-black"
                      placeholder={material.sku}
                      disabled
                      style={{ opacity: 1 }}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel
                          className={`${
                            form.watch("brand") ? "opacity-60" : "opacity-100"
                          }`}
                        >
                          Brand
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
                            placeholder="Brand Name"
                            // disabled={readonly}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <Label className="opacity-60">Date Material Added</Label>
                  <Input
                    className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2 placeholder:text-black"
                    placeholder={new Date(
                      material.created_at
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "Asia/Singapore",
                    })}
                    disabled
                    style={{ opacity: 1 }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel
                        className={`${
                          form.watch("price") ? "opacity-60" : "opacity-100"
                        }`}
                      >
                        Price
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
                            placeholder="Price (e.g., 123.45)"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(
                                /[^0-9.]/g,
                                ""
                              );
                              field.onChange(value ? parseFloat(value) : "");
                            }}
                            // disabled={readonly}
                          />
                          <TooltipProvider>
                            <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <p
                                  className={`${
                                    profitPercentage > 0
                                      ? "text-green-500"
                                      : "text-red-500"
                                  } font-mono text-xs absolute right-0 top-0`}
                                >
                                  {profitPercentage.toFixed(2)}%
                                </p>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs w-[250px]">
                                <p>
                                  This percentage represents the profit margin
                                  based on the cost and selling price of the
                                  material. A positive value indicates a profit,
                                  while a negative value indicates a loss.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {/*add the percentage of profit/gain*/}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel
                        className={`${
                          form.watch("cost") ? "opacity-60" : "opacity-100"
                        }`}
                      >
                        Cost
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
                          placeholder="Cost (e.g., 12.34)"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(
                              /[^0-9.]/g,
                              ""
                            );
                            field.onChange(value ? parseFloat(value) : "");
                          }}
                          // disabled={readonly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Label className="opacity-60">Material Last In</Label>
                  <Input
                    className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2 placeholder:text-black"
                    placeholder={new Date(
                      material.last_stocks_added
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "Asia/Singapore",
                    })}
                    disabled
                    style={{ opacity: 1 }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel
                        className={`${
                          form.watch("category") ? "opacity-60" : "opacity-100"
                        }`}
                      >
                        Tags
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
                          placeholder="Keywords (separated by commas)"
                          // disabled={readonly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="border-t flex justify-end px-16 py-2 gap-4">
              <Button
                className="h-fit py-1 m-0"
                variant={"outline"}
                onClick={(e) => {
                  e.preventDefault();
                  onClose && onClose();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-fit py-1"
                disabled={isPending || !isFormChanged}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Save...
                  </>
                ) : isSuccess ? (
                  <>
                    <Check className="mr-2 size-4 " />
                    Saved
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </td>
    </tr>
  );
}
