import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { z } from "zod";

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

import { Expenses } from "../../lib/types";
import { createEditExpense } from "../../services/apiExpenses";
import { useUser } from "../auth/useUser";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const formSchema = z.object({
  bill_name: z.string().min(1, "Bill name is required"),
  amount: z.number().min(0, "Amount must be greater than 0"),
  branch_id: z.number().optional(),
});

export default function ExpensesForm({
  expenseToEdit,
  onClose,
}: {
  expenseToEdit?: Expenses;
  onClose?: () => void;
}) {
  const editSession = Boolean(expenseToEdit?.id);
  const queryClient = useQueryClient();
  const { isAdmin, isTaytay, isPasig } = useUser();

  const [hasChanges, setHasChanges] = useState(false);

  const { mutate: createExpenseMutation, isPending: isCreating } = useMutation({
    mutationFn: (expense: Partial<Expenses>) => createEditExpense(expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("New Billing Expense created successfully!");
      if (onClose) onClose();
    },
    onError: (error) => {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    },
  });

  const { mutate: editExpenseMutation, isPending: isEditing } = useMutation({
    mutationFn: ({
      newExpenses,
      editId,
    }: {
      newExpenses: Partial<Expenses>;
      editId: number;
    }) => createEditExpense(newExpenses, editId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Bill expense successfully edited!");
      if (onClose) onClose();
    },
    onError: (error) => {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    },
  });

  const isPending = isCreating || isEditing;

  const extendedFormSchema = isAdmin
    ? formSchema.extend({
        branch_id: z.number().min(1, "Branch is required"),
      })
    : formSchema;

  const form = useForm<z.infer<typeof extendedFormSchema>>({
    resolver: zodResolver(extendedFormSchema),
    defaultValues: editSession
      ? expenseToEdit
      : {
          bill_name: "",
          amount: undefined,
          branch_id: undefined,
        },
  });

  const onSubmit = (values: z.infer<typeof extendedFormSchema>) => {
    const branchId = isTaytay
      ? 1
      : isPasig
      ? 2
      : isAdmin
      ? values.branch_id
      : 0;

    const submittedValues = {
      ...values,
      branch_id: branchId,
    };

    if (editSession) {
      editExpenseMutation({
        newExpenses: submittedValues,
        editId: expenseToEdit!.id,
      });
    } else {
      createExpenseMutation(submittedValues);
    }
  };

  useEffect(() => {
    const subscription = form.watch((value) => {
      setHasChanges(
        editSession
          ? value.bill_name !== expenseToEdit?.bill_name ||
              value.amount !== expenseToEdit?.amount
          : value.bill_name !== "" || value.amount !== undefined
      );
    });
    return () => subscription.unsubscribe();
  }, [form.watch, editSession, expenseToEdit]);

  return (
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
        <FormField
          control={form.control}
          name="bill_name"
          render={({ field }) => (
            <FormItem className="space-y-0 mt-2">
              <FormLabel
                className={`${
                  form.watch("bill_name") ? "opacity-60" : "opacity-100"
                }`}
              >
                Bill To
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter billing name"
                  autoFocus
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="space-y-0 pb-2">
              <FormLabel
                className={`${
                  form.watch("amount") ? "opacity-60" : "opacity-100"
                }`}
              >
                Amount
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Total cost or expense"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    field.onChange(value ? parseFloat(value) : "");
                  }}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-[0.5fr_1fr] gap-2">
          <Button
            type="submit"
            className="bg-primaryRed hover:bg-hoveredRed col-start-2"
            disabled={isPending || !hasChanges}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editSession ? "Editing..." : "Creating..."}
              </>
            ) : editSession ? (
              "Edit"
            ) : (
              "Create"
            )}
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              if (onClose) onClose();
            }}
            className="col-start-1 row-start-1"
            variant={"secondary"}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
