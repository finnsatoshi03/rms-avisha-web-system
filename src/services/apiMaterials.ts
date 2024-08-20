import { MaterialStocks } from "../lib/types";
import { supabase } from "./supabase";

export async function getMaterialStocks({
  fetchAll = false,
}: {
  fetchAll?: boolean;
}) {
  let query = supabase
    .from("material_stocks")
    .select("*, branches:branch_id(*)");

  if (!fetchAll) {
    query = query.eq("deleted", false);
  }

  const { data: material_stocks, error } = await query;

  if (error) {
    console.log(error);
    throw new Error("Material Stocks could not be fetched");
  }

  return material_stocks;
}

export async function createEditMaterialStock(
  newMaterialStock: Partial<MaterialStocks>,
  editId?: number
) {
  if (editId) {
    const { data: existingStock, error: fetchError } = await supabase
      .from("material_stocks")
      .select("stocks")
      .eq("id", editId)
      .single();

    if (fetchError) {
      console.log(fetchError);
      throw new Error("Existing Material Stock could not be fetched");
    }

    const stocksChanged = existingStock?.stocks !== newMaterialStock.stocks;

    const { error } = await supabase
      .from("material_stocks")
      .update({
        ...newMaterialStock,
        ...(stocksChanged && { last_stocks_added: new Date().toISOString() }),
      })
      .eq("id", editId)
      .select()
      .single();

    if (error) {
      console.log(error);
      throw new Error("Material Stocks could not be updated");
    }
  } else {
    const { error } = await supabase
      .from("material_stocks")
      .insert({
        ...newMaterialStock,
        created_at: new Date().toISOString(),
        last_stocks_added: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.log(error);
      throw new Error("Material Stocks could not be created");
    }
  }
}

export async function deleteMaterialStock(ids: number[]) {
  const { error } = await supabase
    .from("material_stocks")
    .update({ deleted: true }) // Soft delete by marking as deleted
    .in("id", ids);

  if (error) {
    console.log(error);
    throw new Error("Material Stocks could not be deleted");
  }
}
