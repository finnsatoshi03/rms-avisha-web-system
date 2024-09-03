import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialStocks } from "../../lib/types";
import toast from "react-hot-toast";
import { createEditMaterialStock } from "../../services/apiMaterials";
import { Loader2 } from "lucide-react";
import { useUser } from "../auth/useUser";
import { Select } from "@radix-ui/react-select";
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const formSchema = z
  .object({
    branch_id: z.number().optional(),
    name: z.string().min(1, "Display name is required"),
    brand: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 3, {
        message: "At least 3 characters required",
      }),
    cost: z.number().int().positive(),
    price: z.number().int().positive(),
    stocks: z.number().int().positive(),
    tags: z.string().optional(),
  })
  .refine((data) => data.cost < data.price, {
    message: "Cost must be lower than the selling price",
    path: ["cost"],
  });

export default function MaterialForm({ onClose }: { onClose?: () => void }) {
  const queryClient = useQueryClient();
  const { isTaytay, isAdmin } = useUser();

  const { mutate: mutateMaterialStock, isPending } = useMutation({
    mutationFn: (newMaterial: Partial<MaterialStocks>) =>
      createEditMaterialStock(newMaterial),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materialStocks"] });
      toast.success("Material created successfully!");
      if (onClose) onClose();
    },
    onError: (error) => {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      brand: "",
      cost: undefined,
      price: undefined,
      stocks: undefined,
      tags: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const finalValues: Partial<MaterialStocks> = {
      ...values,
      material_name: values.name,
      branch_id: isAdmin ? values.branch_id : isTaytay ? 1 : 2,
      category: values?.tags || "",
    };
    delete finalValues.name;
    delete finalValues.tags;

    // console.log(finalValues);
    mutateMaterialStock(finalValues);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {isAdmin && (
            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel
                    className={`${
                      form.watch("branch_id") ? "opacity-60" : "opacity-100"
                    }`}
                  >
                    Branch
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(Number(value));
                    }}
                    // defaultValue={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                        <SelectValue placeholder="Select a Branch" />
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
          <div className="grid grid-cols-[1fr_0.5fr_0.5fr] gap-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel
                    className={`${
                      form.watch("name") ? "opacity-60" : "opacity-100"
                    }`}
                  >
                    Display Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
                      placeholder="Product Name"
                      autoFocus
                      // disabled={readonly}
                      {...field}
                    />
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
                      placeholder="(e.g., 12.34)"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, "");
                        field.onChange(value ? parseFloat(value) : "");
                      }}
                      // disabled={readonly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <Input
                      className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
                      placeholder="(e.g., 123.45)"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, "");
                        field.onChange(value ? parseFloat(value) : "");
                      }}
                      // disabled={readonly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-[1fr_0.5fr] gap-8">
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
            <FormField
              control={form.control}
              name="stocks"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel
                    className={`${
                      form.watch("stocks") ? "opacity-60" : "opacity-100"
                    }`}
                  >
                    Stocks
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
                      placeholder="Quantity"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, "");
                        field.onChange(value ? parseFloat(value) : "");
                      }}
                      // disabled={readonly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel
                  className={`${
                    form.watch("tags") ? "opacity-60" : "opacity-100"
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
          <DialogFooter className="space-x-4">
            <Button
              className="h-fit py-1"
              variant={"outline"}
              onClick={(e) => {
                e.preventDefault();
                if (onClose) onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-fit py-1" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
