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

const formSchema = z.object({
  bill_name: z.string().min(1, "Bill name is required"),
  amount: z.number().min(0, "Amount must be greater than 0"),
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

  const [hasChanges, setHasChanges] = useState(false);

  const { mutate: createExpenseMutation, isPending: isCreating } = useMutation({
    mutationFn: (expense: Partial<Expenses>) => createEditExpense(expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("New Billing Expense created successfully!");
      onClose && onClose();
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
      onClose && onClose();
    },
    onError: (error) => {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    },
  });

  const isPending = isCreating || isEditing;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editSession
      ? expenseToEdit
      : {
          bill_name: "",
          amount: undefined,
        },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editSession)
      editExpenseMutation({ newExpenses: values, editId: expenseToEdit!.id });
    else createExpenseMutation(values);
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
              onClose && onClose();
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
