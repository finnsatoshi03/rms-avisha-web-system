/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateRentalConsumable } from "../lib/types";
import { supabase } from "./supabase";
import { upsertClient } from "./apiJobOrders";

// =============================================
// QUERY: Filtered rentals with pagination
// =============================================

export async function getRentalsFiltered({
  page = 1,
  limit = 10,
  searchTerm = "",
  branchId = null,
  technicianId = undefined,
  statusFilters = [],
  startDate = undefined,
  endDate = undefined,
  showOverdueOnly = false,
}: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  branchId?: number | null;
  technicianId?: string | undefined;
  statusFilters?: string[];
  startDate?: string;
  endDate?: string;
  showOverdueOnly?: boolean;
} = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("rentals").select(
    `
      *,
      clients:client_id (*),
      branches:branch_id (*),
      rental_assets:rental_asset_id (*),
      users:technician_id (*),
      rental_consumables (*),
      rental_inspections (*)
    `,
    { count: "exact" }
  );

  // Status filters
  if (statusFilters.length > 0) {
    const statusConditions = statusFilters
      .map((status) => `status.eq.${status}`)
      .join(",");
    query = query.or(statusConditions);
  }

  // Branch filter
  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  // Technician filter
  if (technicianId) {
    query = query.eq("technician_id", technicianId);
  }

  // Overdue filter
  if (showOverdueOnly) {
    query = query.eq("is_overdue", true);
  }

  // Date range filter
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    query = query.lt("created_at", endDateTime.toISOString().split("T")[0]);
  }

  // Search across rental fields + client name/phone
  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.trim().toLowerCase();

    const rentalConditions = [
      `rental_no.ilike.%${term}%`,
      `notes.ilike.%${term}%`,
      `status.ilike.%${term}%`,
    ].join(",");

    // Search clients by name, phone, email
    const { data: matchingClients, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .or(
        `name.ilike.%${term}%,email.ilike.%${term}%,contact_number.ilike.%${term}%`
      );

    // Search technicians
    const { data: matchingTechnicians, error: techError } = await supabase
      .from("users")
      .select("id")
      .eq("deleted", false)
      .is("migrated_to", null)
      .or(
        `fullname.ilike.%${term}%,email.ilike.%${term}%,migrated_email.ilike.%${term}%`
      );

    let orConditions = rentalConditions;

    if (!clientError && matchingClients && matchingClients.length > 0) {
      const clientIds = matchingClients.map((c) => c.id);
      orConditions += `,client_id.in.(${clientIds.join(",")})`;
    }

    if (!techError && matchingTechnicians && matchingTechnicians.length > 0) {
      const techIds = matchingTechnicians.map((t) => t.id);
      orConditions += `,technician_id.in.(${techIds.join(",")})`;
    }

    query = query.or(orConditions);
  }

  const {
    data: rentals,
    error,
    count,
  } = await query.order("created_at", { ascending: false }).range(from, to);

  if (error) {
    console.log("Query error:", error);
    throw new Error("Rentals could not be fetched");
  }

  return { data: rentals, meta: { totalCount: count } };
}

// =============================================
// QUERY: Single rental with full joins
// =============================================

export async function getRental(id: number) {
  const { data, error } = await supabase
    .from("rentals")
    .select(
      `
      *,
      clients:client_id (*),
      branches:branch_id (*),
      rental_assets:rental_asset_id (*),
      users:technician_id (*),
      rental_consumables (*),
      rental_inspections (*)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.log(error);
    throw new Error("Rental could not be fetched");
  }

  return data;
}

// =============================================
// CREATE: New rental with client + consumables
// =============================================

export async function createRental(
  data: {
    rental_asset_id: number;
    name: string;
    contact_number: string;
    email?: string;
    technician_id?: string | null;
    branch_id: number;
    start_date: string;
    end_date?: string;
    due_date: string;
    rental_type: "DAILY" | "MONTHLY";
    rate_amount: number;
    discount?: number;
    downpayment?: number;
    notes?: string;
    consumables?: CreateRentalConsumable[];
    billing_account_id?: string | null;
    created_by?: string;
  },
  clientId: number | null
) {
  // 1. Upsert client
  const resolvedClientId = await upsertClient(
    supabase,
    {
      name: data.name,
      contact_number: data.contact_number,
      email: data.email,
      date: new Date().toISOString(),
    },
    clientId
  );

  // 2. Calculate consumables total
  const consumables = data.consumables || [];
  const consumablesTotal = consumables.reduce(
    (sum, c) => sum + c.quantity * c.unit_price,
    0
  );
  const discountVal = data.discount || 0;
  const downpaymentVal = data.downpayment || 0;
  const grandTotal = data.rate_amount + consumablesTotal - discountVal;

  // 3. Insert rental (rental_no auto-generated by trigger)
  const { data: rental, error: rentalError } = await supabase
    .from("rentals")
    .insert({
      rental_asset_id: data.rental_asset_id,
      client_id: resolvedClientId,
      technician_id: data.technician_id || null,
      branch_id: data.branch_id,
      start_date: data.start_date,
      end_date: data.end_date || null,
      due_date: data.due_date,
      rental_type: data.rental_type,
      rate_amount: data.rate_amount,
      consumables_total: consumablesTotal,
      discount: discountVal,
      downpayment: downpaymentVal,
      grand_total: grandTotal,
      notes: data.notes || null,
      billing_account_id: data.billing_account_id || null,
      created_by: data.created_by || null,
    })
    .select()
    .single();

  if (rentalError) {
    console.log(rentalError);
    throw new Error("Rental could not be created");
  }

  // 4. Insert consumables and deduct inventory stock
  if (consumables.length > 0) {
    await processConsumables(rental.id, consumables);
  }

  // 5. Update rental asset status to 'rented'
  const { error: assetError } = await supabase
    .from("rental_assets")
    .update({ status: "rented" })
    .eq("id", data.rental_asset_id);

  if (assetError) {
    console.log(assetError);
    throw new Error("Rental asset status could not be updated");
  }

  return { rental, rental_no: rental.rental_no };
}

// =============================================
// UPDATE: Rental fields + consumables
// =============================================

export async function updateRental(
  rentalId: number,
  data: {
    technician_id?: string | null;
    start_date?: string;
    end_date?: string;
    due_date?: string;
    rental_type?: "DAILY" | "MONTHLY";
    rate_amount?: number;
    notes?: string;
    name?: string;
    contact_number?: string;
    email?: string;
    client_id?: number | null;
    billing_account_id?: string | null;
  }
) {
  // Update client info if provided
  if (data.name && data.contact_number) {
    await upsertClient(
      supabase,
      {
        name: data.name,
        contact_number: data.contact_number,
        email: data.email,
        date: new Date().toISOString(),
      },
      data.client_id || null
    );
  }

  // Build rental update payload (only rental fields)
  const rentalUpdate: any = {};
  if (data.technician_id !== undefined)
    rentalUpdate.technician_id = data.technician_id;
  if (data.start_date !== undefined) rentalUpdate.start_date = data.start_date;
  if (data.end_date !== undefined) rentalUpdate.end_date = data.end_date;
  if (data.due_date !== undefined) rentalUpdate.due_date = data.due_date;
  if (data.rental_type !== undefined)
    rentalUpdate.rental_type = data.rental_type;
  if (data.rate_amount !== undefined)
    rentalUpdate.rate_amount = data.rate_amount;
  if (data.notes !== undefined) rentalUpdate.notes = data.notes;
  if (data.billing_account_id !== undefined)
    rentalUpdate.billing_account_id = data.billing_account_id;

  if (Object.keys(rentalUpdate).length > 0) {
    // Recalculate grand_total if rate changes
    if (data.rate_amount !== undefined) {
      const { data: existingConsumables } = await supabase
        .from("rental_consumables")
        .select("total_amount")
        .eq("rental_id", rentalId);

      const consumablesTotal = (existingConsumables || []).reduce(
        (sum, c) => sum + Number(c.total_amount),
        0
      );
      rentalUpdate.consumables_total = consumablesTotal;
      rentalUpdate.grand_total = data.rate_amount + consumablesTotal;
    }

    const { error } = await supabase
      .from("rentals")
      .update(rentalUpdate)
      .eq("id", rentalId);

    if (error) {
      console.log(error);
      throw new Error("Rental could not be updated");
    }
  }
}

// =============================================
// STATUS: Batch status update
// =============================================

export async function updateRentalStatus(ids: number[], status: string) {
  const { error } = await supabase
    .from("rentals")
    .update({ status })
    .in("id", ids);

  if (error) {
    console.log(error);
    throw new Error("Rental status could not be updated");
  }

  // On Cancelled: restore asset status and consumable stock
  if (status === "Cancelled") {
    for (const id of ids) {
      const { data: rental } = await supabase
        .from("rentals")
        .select("rental_asset_id")
        .eq("id", id)
        .single();

      if (rental) {
        await supabase
          .from("rental_assets")
          .update({ status: "available" })
          .eq("id", rental.rental_asset_id);
      }

      // Restore consumable stock
      await restoreConsumableStock(id);
    }
  }

  // On Completed: restore asset status to available
  if (status === "Completed") {
    for (const id of ids) {
      const { data: rental } = await supabase
        .from("rentals")
        .select("rental_asset_id")
        .eq("id", id)
        .single();

      if (rental) {
        await supabase
          .from("rental_assets")
          .update({ status: "available" })
          .eq("id", rental.rental_asset_id);
      }
    }
  }
}

// =============================================
// CONSUMABLES: Add mid-rental
// =============================================

export async function addConsumable(
  rentalId: number,
  consumable: CreateRentalConsumable
) {
  const totalAmount = consumable.quantity * consumable.unit_price;

  // Deduct inventory stock if inventory-based
  if (!consumable.is_manual && consumable.material_stock_id) {
    await deductStock(consumable.material_stock_id, consumable.quantity);
  }

  // Insert consumable
  const { data, error } = await supabase
    .from("rental_consumables")
    .insert({
      rental_id: rentalId,
      material_stock_id: consumable.material_stock_id || null,
      description: consumable.description,
      quantity: consumable.quantity,
      unit_price: consumable.unit_price,
      total_amount: totalAmount,
      is_manual: consumable.is_manual,
      notes: consumable.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.log(error);
    throw new Error("Consumable could not be added");
  }

  // Recalculate rental totals
  await recalculateRentalTotals(rentalId);

  return data;
}

// =============================================
// CONSUMABLES: Remove
// =============================================

export async function removeConsumable(consumableId: number) {
  // Get consumable details first
  const { data: consumable, error: fetchError } = await supabase
    .from("rental_consumables")
    .select("*")
    .eq("id", consumableId)
    .single();

  if (fetchError || !consumable) {
    throw new Error("Consumable not found");
  }

  // Restore stock if inventory-based
  if (!consumable.is_manual && consumable.material_stock_id) {
    await restoreStock(consumable.material_stock_id, consumable.quantity);
  }

  // Delete consumable
  const { error } = await supabase
    .from("rental_consumables")
    .delete()
    .eq("id", consumableId);

  if (error) {
    console.log(error);
    throw new Error("Consumable could not be removed");
  }

  // Recalculate rental totals
  await recalculateRentalTotals(consumable.rental_id);
}

// =============================================
// INSPECTION: Save return inspection
// =============================================

export async function saveInspection(
  rentalId: number,
  data: {
    physical_condition?: string;
    print_quality?: string;
    meter_reading_start?: number | null;
    meter_reading_end?: number | null;
    accessories_returned?: string;
    missing_items?: string;
    damage_assessment?: string;
    damage_penalty?: number;
    notes?: string;
    inspected_by?: string;
  }
) {
  const { data: inspection, error } = await supabase
    .from("rental_inspections")
    .upsert(
      {
        rental_id: rentalId,
        physical_condition: data.physical_condition || null,
        print_quality: data.print_quality || null,
        meter_reading_start: data.meter_reading_start ?? null,
        meter_reading_end: data.meter_reading_end ?? null,
        accessories_returned: data.accessories_returned || null,
        missing_items: data.missing_items || null,
        damage_assessment: data.damage_assessment || null,
        damage_penalty: data.damage_penalty || 0,
        notes: data.notes || null,
        inspected_by: data.inspected_by || null,
      },
      { onConflict: "rental_id" }
    )
    .select()
    .single();

  if (error) {
    console.log(error);
    throw new Error("Inspection could not be saved");
  }

  return inspection;
}

// =============================================
// DELETE: Rentals with stock restoration
// =============================================

export async function deleteRentals(ids: number[]) {
  for (const id of ids) {
    // Get rental details for asset restoration
    const { data: rental } = await supabase
      .from("rentals")
      .select("rental_asset_id, status")
      .eq("id", id)
      .single();

    // Restore consumable stock
    await restoreConsumableStock(id);

    // Delete rental (cascade deletes consumables + inspections)
    const { error } = await supabase.from("rentals").delete().eq("id", id);

    if (error) {
      console.log(error);
      throw new Error("Rental could not be deleted");
    }

    // Restore asset status if it was actively rented
    if (
      rental &&
      ["Created", "Released", "Ongoing"].includes(rental.status)
    ) {
      await supabase
        .from("rental_assets")
        .update({ status: "available" })
        .eq("id", rental.rental_asset_id);
    }
  }
}

// =============================================
// HELPERS: Stock management
// =============================================

async function deductStock(materialStockId: number, quantity: number) {
  const { data: stock, error: fetchError } = await supabase
    .from("material_stocks")
    .select("stocks")
    .eq("id", materialStockId)
    .single();

  if (fetchError || !stock) {
    throw new Error("Could not fetch material stock");
  }

  const newStocks = stock.stocks - quantity;
  if (newStocks < 0) {
    throw new Error("Insufficient stock for this consumable");
  }

  const { error } = await supabase
    .from("material_stocks")
    .update({ stocks: newStocks })
    .eq("id", materialStockId);

  if (error) {
    throw new Error("Could not deduct stock");
  }
}

async function restoreStock(materialStockId: number, quantity: number) {
  const { data: stock, error: fetchError } = await supabase
    .from("material_stocks")
    .select("stocks")
    .eq("id", materialStockId)
    .single();

  if (fetchError || !stock) return;

  await supabase
    .from("material_stocks")
    .update({ stocks: stock.stocks + quantity })
    .eq("id", materialStockId);
}

async function restoreConsumableStock(rentalId: number) {
  const { data: consumables } = await supabase
    .from("rental_consumables")
    .select("*")
    .eq("rental_id", rentalId);

  if (!consumables) return;

  for (const consumable of consumables) {
    if (!consumable.is_manual && consumable.material_stock_id) {
      await restoreStock(consumable.material_stock_id, consumable.quantity);
    }
  }
}

async function processConsumables(
  rentalId: number,
  consumables: CreateRentalConsumable[]
) {
  for (const consumable of consumables) {
    const totalAmount = consumable.quantity * consumable.unit_price;

    // Deduct stock for inventory-based consumables
    if (!consumable.is_manual && consumable.material_stock_id) {
      await deductStock(consumable.material_stock_id, consumable.quantity);
    }

    const { error } = await supabase.from("rental_consumables").insert({
      rental_id: rentalId,
      material_stock_id: consumable.material_stock_id || null,
      description: consumable.description,
      quantity: consumable.quantity,
      unit_price: consumable.unit_price,
      total_amount: totalAmount,
      is_manual: consumable.is_manual,
      notes: consumable.notes || null,
    });

    if (error) {
      console.log(error);
      throw new Error("Consumable could not be added");
    }
  }
}

async function recalculateRentalTotals(rentalId: number) {
  const { data: consumables } = await supabase
    .from("rental_consumables")
    .select("total_amount")
    .eq("rental_id", rentalId);

  const consumablesTotal = (consumables || []).reduce(
    (sum, c) => sum + Number(c.total_amount),
    0
  );

  const { data: rental } = await supabase
    .from("rentals")
    .select("rate_amount")
    .eq("id", rentalId)
    .single();

  const rateAmount = rental ? Number(rental.rate_amount) : 0;

  await supabase
    .from("rentals")
    .update({
      consumables_total: consumablesTotal,
      grand_total: rateAmount + consumablesTotal,
    })
    .eq("id", rentalId);
}
