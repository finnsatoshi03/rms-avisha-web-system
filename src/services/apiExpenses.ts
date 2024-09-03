/* eslint-disable @typescript-eslint/no-unused-vars */
import { Expenses } from "../lib/types";
import { supabase } from "./supabase";

export async function getExpenses() {
  const { data: expenses, error } = await supabase.from("expenses").select("*");

  if (error) {
    throw new Error(error.message);
  }

  console.log(expenses);
  return expenses;
}

export async function createEditExpense(
  expenses: Partial<Expenses>,
  editId?: number
) {
  if (editId) {
    const { error } = await supabase
      .from("expenses")
      .update({ ...expenses })
      .eq("id", editId)
      .select();

    if (error) {
      console.log(error);
      throw new Error("Bill Expenses could not be updated");
    }
  } else {
    const { data, error } = await supabase.from("expenses").insert([expenses]);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}

export async function deleteExepense(ids: number[]) {
  const { error } = await supabase.from("expenses").delete().in("id", ids);

  if (error) {
    throw new Error(error.message);
  }
}

export async function duplicateExpense(id: number) {
  const expenses = await getExpenses();
  const expenseToDuplicate = expenses.find((expense) => expense.id === id);

  if (!expenseToDuplicate) {
    throw new Error("Expense not found");
  }

  const { id: _, ...expenseWithoutId } = expenseToDuplicate;

  const { data, error } = await supabase
    .from("expenses")
    .insert([expenseWithoutId])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
