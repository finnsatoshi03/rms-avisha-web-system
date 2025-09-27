import { supabase } from "./supabase";
import { CreateQuotationData } from "../lib/types";

export async function createQuotation(quotationData: CreateQuotationData) {
  const { quotation_items, ...quotation } = quotationData;

  // First, create the quotation
  const { data: quotationResult, error: quotationError } = await supabase
    .from("quotations")
    .insert([quotation])
    .select()
    .single();

  if (quotationError) {
    console.error("Error creating quotation:", quotationError);
    throw new Error("Failed to create quotation");
  }

  // Then, create the quotation items
  if (quotation_items && quotation_items.length > 0) {
    const itemsWithQuotationId = quotation_items.map((item) => ({
      ...item,
      quotation_id: quotationResult.id,
    }));

    const { error: itemsError } = await supabase
      .from("quotation_items")
      .insert(itemsWithQuotationId);

    if (itemsError) {
      console.error("Error creating quotation items:", itemsError);
      // Rollback the quotation creation
      await supabase.from("quotations").delete().eq("id", quotationResult.id);
      throw new Error("Failed to create quotation items");
    }
  }

  return quotationResult;
}

export async function getQuotationsByJobOrder(jobOrderId: number) {
  const { data, error } = await supabase
    .from("quotations")
    .select(
      `
      *,
      quotation_items (*)
    `
    )
    .eq("job_order_id", jobOrderId);

  if (error) {
    console.error("Error fetching quotations:", error);
    throw new Error("Failed to fetch quotations");
  }

  return data;
}

export async function getQuotationById(quotationId: number) {
  const { data, error } = await supabase
    .from("quotations")
    .select(
      `
      *,
      quotation_items (*)
    `
    )
    .eq("id", quotationId)
    .single();

  if (error) {
    console.error("Error fetching quotation:", error);
    throw new Error("Failed to fetch quotation");
  }

  return data;
}

export async function updateQuotation(
  quotationId: number,
  quotationData: Partial<CreateQuotationData>
) {
  const { quotation_items, ...quotation } = quotationData;

  // Update the quotation
  const { data: quotationResult, error: quotationError } = await supabase
    .from("quotations")
    .update(quotation)
    .eq("id", quotationId)
    .select()
    .single();

  if (quotationError) {
    console.error("Error updating quotation:", quotationError);
    throw new Error("Failed to update quotation");
  }

  // Update quotation items if provided
  if (quotation_items) {
    // Delete existing items
    await supabase
      .from("quotation_items")
      .delete()
      .eq("quotation_id", quotationId);

    // Insert new items
    if (quotation_items.length > 0) {
      const itemsWithQuotationId = quotation_items.map((item) => ({
        ...item,
        quotation_id: quotationId,
      }));

      const { error: itemsError } = await supabase
        .from("quotation_items")
        .insert(itemsWithQuotationId);

      if (itemsError) {
        console.error("Error updating quotation items:", itemsError);
        throw new Error("Failed to update quotation items");
      }
    }
  }

  return quotationResult;
}

export async function deleteQuotation(quotationId: number) {
  const { error } = await supabase
    .from("quotations")
    .delete()
    .eq("id", quotationId);

  if (error) {
    console.error("Error deleting quotation:", error);
    throw new Error("Failed to delete quotation");
  }
}

// Generate a unique quote number
export function generateQuoteNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `Q-${timestamp.slice(-6)}-${random}`;
}
