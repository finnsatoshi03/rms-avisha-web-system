/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from "@supabase/supabase-js";
import { CreateJobOrderData, MaterialItem } from "../lib/types";
import { withEffectiveUserEmail } from "../lib/effective-user-email";
import { supabase } from "./supabase";
import { buildSoftDeleteUpdate } from "./softDelete";
import { expandClientIdsWithChildren } from "./apiClients";

function normalizeJobOrderUsers<T extends { users?: unknown; order_received_user?: unknown }>(
  joborders: T[] | null | undefined
) {
  return (joborders ?? []).map((joborder) => ({
    ...joborder,
    users: withEffectiveUserEmail(joborder.users as any) ?? joborder.users,
    order_received_user:
      withEffectiveUserEmail(joborder.order_received_user as any) ??
      joborder.order_received_user,
  }));
}

export async function getJobOrders() {
  const { data: joborders, error } = await supabase.from("joborders").select(`
      *,
      clients:client_id (*, parent_client:parent_client_id (id, name)),
      branches:branch_id (*),
      materials (
        id,
        material_description,
        quantity,
        unit_price,
        total_amount,
        job_order_id,
        material_id,
        used
        ),
        users:technician_id (*)
    `)
    .is("deleted_at", null);

  if (error) {
    console.log(error);
    throw new Error("Job Orders could not be fetched");
  }

  return normalizeJobOrderUsers(joborders);
}

export async function getJobOrdersFiltered({
  page = 1,
  limit = 10,
  searchTerm = "",
  branchId = null,
  technicianId = undefined,
  statusFilters = [],
  startDate = undefined,
  endDate = undefined,
  showWarningsOnly = false,
}: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  branchId?: number | null;
  technicianId?: string | number | undefined;
  statusFilters?: string[];
  startDate?: string;
  endDate?: string;
  showWarningsOnly?: boolean;
} = {}) {
  // Calculate range for pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("joborders").select(
    `
      *,
      clients:client_id (*, parent_client:parent_client_id (id, name)),
      branches:branch_id (*),
      materials (
        id,
        material_description,
        quantity,
        unit_price,
        total_amount,
        job_order_id,
        material_id,
        used
      ),
      users:technician_id (*)
    `,
    { count: "exact" }
  )
    .is("deleted_at", null);

  // Add status filters if provided
  if (statusFilters.length > 0) {
    const statusConditions = statusFilters
      .map((status) => `status.eq.${status}`)
      .join(",");
    query = query.or(statusConditions);
  }

  // Add warning filter if provided
  if (showWarningsOnly) {
    // Filter for job orders that are pending for more than 2 days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoISO = twoDaysAgo.toISOString();

    query = query.eq("status", "Pending").lt("created_at", twoDaysAgoISO);
  }

  // Add branch filter if provided
  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  // Add technician filter if provided
  if (technicianId) {
    query = query.eq("technician_id", technicianId);
  }

  // Add date range filter if provided
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    // Add 1 day to endDate to include the full end date
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    query = query.lt("created_at", endDateTime.toISOString().split("T")[0]);
  }

  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.trim().toLowerCase();
    console.log("Using search term:", term);

    const jobOrderConditions = [
      `brand_model.ilike.%${term}%`,
      `serial_number.ilike.%${term}%`,
      `machine_type.ilike.%${term}%`,
      `problem_statement.ilike.%${term}%`,
      `additional_comments.ilike.%${term}%`,
      `labor_description.ilike.%${term}%`,
      `accessories.ilike.%${term}%`,
      `order_no.ilike.%${term}%`,
      `status.ilike.%${term}%`,
      `warranty.ilike.%${term}%`,
      `technical_report.ilike.%${term}%`,
    ].join(",");

    const { data: matchingClients, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .or(
        `name.ilike.%${term}%,` +
          `email.ilike.%${term}%,` +
          `contact_number.ilike.%${term}%`
      );

    const { data: matchingTechnicians, error: techError } = await supabase
      .from("users")
      .select("id")
      .eq("deleted", false)
      .is("migrated_to", null)
      .or(
        `fullname.ilike.%${term}%,email.ilike.%${term}%,migrated_email.ilike.%${term}%`
      );

    let orConditions = jobOrderConditions;

    if (clientError) {
      console.error("Error searching clients:", clientError);
    } else if (matchingClients && matchingClients.length > 0) {
      const baseClientIds = matchingClients.map((client) => client.id);
      const clientIds = await expandClientIdsWithChildren(baseClientIds);
      orConditions += `,client_id.in.(${clientIds.join(",")})`;
    }

    if (techError) {
      console.error("Error searching technicians:", techError);
    } else if (matchingTechnicians && matchingTechnicians.length > 0) {
      const technicianIds = matchingTechnicians.map((tech) => tech.id);
      orConditions += `,technician_id.in.(${technicianIds.join(",")})`;
    }

    query = query.or(orConditions);
  }

  const {
    data: joborders,
    error,
    count,
  } = await query.order("created_at", { ascending: false }).range(from, to);

  if (error) {
    console.log("Query error:", error);
    throw new Error("Job Orders could not be fetched");
  }

  return { data: normalizeJobOrderUsers(joborders), meta: { totalCount: count } };
}

export async function upsertClient(
  supabase: SupabaseClient,
  client: {
    name: string;
    contact_number: string;
    email?: string;
    date: string | Date;
  },
  clientId: number | null
): Promise<number> {
  if (clientId) {
    // Update existing client with latest contact info
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .update({
        name: client.name,
        contact_number: client.contact_number,
        email: client.email,
      })
      .eq("id", clientId)
      .select()
      .single();

    if (clientError) {
      console.log(clientError);
      throw new Error("Client could not be updated");
    }

    return clientData.id;
  } else {
    // Create a new client
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert([
        {
          name: client.name,
          contact_number: client.contact_number,
          email: client.email,
        },
      ])
      .select()
      .single();

    if (clientError) {
      console.log(clientError);
      throw new Error("Client could not be created");
    }

    return clientData.id;
  }
}

async function upsertJobOrder(
  supabase: SupabaseClient,
  jobOrder: Omit<CreateJobOrderData, "materials"> & { is_copy?: boolean },
  jobOrderId: number | null,
  clientId: number
): Promise<{ id: number; order_no: string }> {
  const jobOrderData: any = {
    accessories: jobOrder.accessories,
    additional_comments: jobOrder.additional_comments,
    amount: jobOrder.amount,
    branch_id: jobOrder.branch_id,
    brand_model: jobOrder.brand_model,
    client_id: clientId,
    created_at: jobOrder.date,
    materials_expense: jobOrder.materials_expense,
    discount: jobOrder.discount,
    downpayment: jobOrder.downpayment,
    grand_total: jobOrder.grand_total,
    net_sales: jobOrder.net_sales,
    labor_description: jobOrder.labor_description,
    labor_total: jobOrder.labor_total,
    machine_type: jobOrder.machine_type,
    material_total: jobOrder.material_total,
    order_received: jobOrder.order_received,
    problem_statement: jobOrder.problem_statement,
    rate: jobOrder.rate,
    serial_number: jobOrder.serial_number,
    sub_total: jobOrder.sub_total,
    technician_id: jobOrder.technician_id,
    warranty: jobOrder.warranty || null,
    warranty_months: jobOrder.warranty_months || null,
    is_copy: jobOrder.is_copy ?? false,
    is_manual_rate: jobOrder.is_manual_rate ?? false,
    include_quotation_items: jobOrder.include_quotation_items ?? false,
    technical_report: jobOrder.technical_report,
  };

  if (jobOrderId) {
    const { data: existingJobOrder, error: fetchError } = await supabase
      .from("joborders")
      .select("status, order_no")
      .eq("id", jobOrderId)
      .is("deleted_at", null)
      .single();

    if (fetchError) {
      console.log(fetchError);
      throw new Error("Existing Job Order could not be fetched");
    }

    jobOrderData.status = jobOrder.status || existingJobOrder.status;

    const { data, error } = await supabase
      .from("joborders")
      .update(jobOrderData)
      .eq("id", jobOrderId)
      .is("deleted_at", null)
      .select("id, order_no")
      .single();

    if (error) {
      console.log(error);
      throw new Error("Job Order could not be updated");
    }

    return { id: data.id, order_no: data.order_no };
  } else {
    // Set status to "Quotation" if creating a quotation, otherwise "Pending"
    jobOrderData.status = jobOrder.isCreatingQuotation
      ? "Quotation"
      : jobOrder.status ?? "Pending";

    const { data, error } = await supabase
      .from("joborders")
      .insert([jobOrderData])
      .select("id, order_no")
      .single();

    if (error) {
      console.log(error);
      throw new Error("Job Order could not be created");
    }

    return { id: data.id, order_no: data.order_no };
  }
}

async function upsertMaterials(
  supabase: SupabaseClient,
  materials: CreateJobOrderData["materials"],
  jobOrderId: number
) {
  // Step 1: Fetch current materials for the job order
  const { data: existingMaterials, error: fetchExistingError } = await supabase
    .from("materials")
    .select("material_id, quantity")
    .eq("job_order_id", jobOrderId);

  if (fetchExistingError) {
    console.log(fetchExistingError);
    throw new Error("Could not fetch existing materials");
  }

  // Step 2: Create a map of existing materials for easy lookup
  const existingMaterialsMap = (existingMaterials || []).reduce(
    (acc, material) => {
      acc[material.material_id] = material.quantity;
      return acc;
    },
    {} as { [key: number]: number }
  );

  // Step 3: Determine materials to delete
  const updatedMaterialIds = new Set(materials?.map((m) => m.material_id));
  const materialsToDelete = (existingMaterials || []).filter(
    (material) => !updatedMaterialIds.has(material.material_id)
  );

  // Step 4: Delete materials that are no longer associated with the job order
  for (const material of materialsToDelete) {
    // Restore stock levels before deleting the material
    const { data: materialStock, error: fetchStockError } = await supabase
      .from("material_stocks")
      .select("stocks")
      .eq("id", material.material_id)
      .single();

    if (fetchStockError || !materialStock) {
      console.log(fetchStockError);
      throw new Error(
        `Could not fetch stock for material ID ${material.material_id}`
      );
    }

    // Update stock to add back the quantity of the deleted material
    const updatedStock = materialStock.stocks + material.quantity;

    const { error: updateStockError } = await supabase
      .from("material_stocks")
      .update({ stocks: updatedStock })
      .eq("id", material.material_id);

    if (updateStockError) {
      console.log(updateStockError);
      throw new Error(
        `Stock for material ID ${material.material_id} could not be updated`
      );
    }

    // Delete the material from the materials table
    const { error: deleteMaterialError } = await supabase
      .from("materials")
      .delete()
      .eq("job_order_id", jobOrderId)
      .eq("material_id", material.material_id);

    if (deleteMaterialError) {
      console.log(deleteMaterialError);
      throw new Error(
        `Material with ID ${material.material_id} could not be deleted`
      );
    }
  }

  // Step 5: Update stock levels and upsert remaining materials
  for (const material of materials!) {
    let existingQuantity = existingMaterialsMap[material.material_id!] || 0;
    const newQuantity = material.quantity ?? 0;
    const quantityChange = newQuantity - existingQuantity;

    if (quantityChange !== 0) {
      // Fetch the current stock level for the material
      const { data: materialStock, error: fetchStockError } = await supabase
        .from("material_stocks")
        .select("stocks")
        .eq("id", material.material_id)
        .single();

      if (fetchStockError || !materialStock) {
        console.log(fetchStockError);
        throw new Error(
          `Could not fetch stock for material ID ${material.material_id}`
        );
      }

      // Calculate the new stock level
      const updatedStock = materialStock.stocks - quantityChange;
      if (updatedStock < 0) {
        throw new Error(
          `Not enough stock for material ID ${material.material_id}`
        );
      }

      // Update the stock level
      const { error: updateStockError } = await supabase
        .from("material_stocks")
        .update({ stocks: updatedStock })
        .eq("id", material.material_id);

      if (updateStockError) {
        console.log(updateStockError);
        throw new Error(
          `Stock for material ID ${material.material_id} could not be updated`
        );
      }
    }

    // Update existing material or insert new material
    existingQuantity = existingMaterialsMap[material.material_id!];
    if (existingQuantity !== undefined) {
      // Update existing material
      const { error: updateError } = await supabase
        .from("materials")
        .update({
          quantity: material.quantity,
          total_amount: (material.quantity ?? 0) * (material.unitPrice ?? 0),
          used: material.used,
          material_description: material.material,
          unit_price: material.unitPrice,
        })
        .eq("job_order_id", jobOrderId)
        .eq("material_id", material.material_id);

      if (updateError) {
        console.log(updateError);
        throw new Error(
          `Material with ID ${material.material_id} could not be updated`
        );
      }
    } else {
      // Insert new material
      const { error: insertError } = await supabase.from("materials").insert([
        {
          job_order_id: jobOrderId,
          material_id: material.material_id,
          material_description: material.material,
          quantity: material.quantity,
          unit_price: material.unitPrice,
          total_amount: (material.quantity ?? 0) * (material.unitPrice ?? 0),
          used: material.used,
        },
      ]);

      if (insertError) {
        console.log(insertError);
        throw new Error(
          `Material with ID ${material.material_id} could not be inserted`
        );
      }
    }
  }

  return materials; // return the updated materials data
}

export async function createEditJobOrder(
  newJobOrder: CreateJobOrderData,
  jobOrderId: number | null,
  clientId: number | null,
  originalClientName: string | null
) {
  try {
    const clientData = {
      name: newJobOrder.name
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" "),
      contact_number: newJobOrder.contact_number,
      email: newJobOrder.email,
      date: newJobOrder.date,
    };

    // If client_id was provided by auto-suggest, use it directly and update contact info
    let finalClientId;
    if (newJobOrder.client_id) {
      finalClientId = await upsertClient(supabase, clientData, newJobOrder.client_id);
    } else if (clientId && clientData.name !== originalClientName) {
      finalClientId = await upsertClient(supabase, clientData, null);
      newJobOrder.is_copy = false;
    } else {
      finalClientId = await upsertClient(supabase, clientData, clientId);
    }

    const { id: finalJobOrderId, order_no } = await upsertJobOrder(
      supabase,
      newJobOrder,
      jobOrderId,
      finalClientId
    );

    const materialData = await upsertMaterials(
      supabase,
      newJobOrder.materials,
      finalJobOrderId
    );

    return { jobOrder: finalJobOrderId, order_no, materials: materialData };
  } catch (error) {
    console.error("Error creating or updating Job Order with details:", error);
    throw error;
  }
}

export async function duplicateJobOrder(id: number) {
  try {
    // Fetch the existing job order details using getJobOrders
    const jobOrders = await getJobOrders();
    const jobOrderData = jobOrders.find((jobOrder) => jobOrder.id === id);

    if (!jobOrderData) {
      throw new Error("Job Order not found for duplication");
    }

    const newClientId = jobOrderData.clients.id;
    const newJobOrderData = {
      accessories: jobOrderData.accessories,
      additional_comments: jobOrderData.additional_comments,
      amount: jobOrderData.amount,
      branch_id: jobOrderData.branch_id,
      brand_model: jobOrderData.brand_model,
      client_id: newClientId,
      created_at: new Date().toISOString(),
      materials_expense: jobOrderData.materials_expense,
      discount: jobOrderData.discount,
      grand_total: jobOrderData.grand_total,
      net_sales: jobOrderData.net_sales,
      labor_description: jobOrderData.labor_description,
      labor_total: jobOrderData.labor_total,
      machine_type: jobOrderData.machine_type,
      material_total: jobOrderData.material_total,
      order_received: jobOrderData.order_received,
      problem_statement: jobOrderData.problem_statement,
      rate: jobOrderData.rate,
      serial_number: jobOrderData.serial_number,
      sub_total: jobOrderData.sub_total,
      status: jobOrderData.status === "Quotation" ? "Quotation" : "Pending",
      technician_id: jobOrderData.technician_id,
      technical_report: jobOrderData.technical_report,
      is_copy: true,
    };

    // Insert the new job order
    const { data: newJobOrder, error: jobOrderInsertError } = await supabase
      .from("joborders")
      .insert([newJobOrderData])
      .select()
      .single();

    if (jobOrderInsertError) {
      console.log(jobOrderInsertError);
      throw new Error("Job Order could not be created for duplication");
    }

    // Prepare the new materials data
    const newMaterialsData = jobOrderData.materials.map(
      (material: MaterialItem) => ({
        material_description: material.material_description,
        quantity: material.quantity,
        unit_price: material.unit_price,
        total_amount: material.total_amount,
        job_order_id: newJobOrder.id,
      })
    );

    // Insert the new materials
    const { error: materialsError } = await supabase
      .from("materials")
      .insert(newMaterialsData);

    if (materialsError) {
      console.log(materialsError);
      throw new Error(
        "Materials could not be duplicated for the new job order"
      );
    }

    return newJobOrder;
  } catch (error) {
    console.error("Error duplicating Job Order with details:", error);
    throw error;
  }
}

export async function updateJobOrderStatus(ids: number[], status: string) {
  const nextStatusNormalized = status.toLowerCase();
  const isNextTerminalPaidStatus =
    nextStatusNormalized === "completed" || nextStatusNormalized === "pull out";

  // Fetch current status and billing linkage so we can handle rollback behavior safely.
  const { data: jobOrders, error: fetchError } = await supabase
    .from("joborders")
    .select("id, warranty_months, status, transferred_to_billing, rate")
    .in("id", ids)
    .is("deleted_at", null);

  if (fetchError) {
    console.error("Error fetching job orders:", fetchError);
    throw new Error("Could not fetch job orders");
  }

  const warranty =
    nextStatusNormalized === "completed"
      ? new Date(new Date().setDate(new Date().getDate() + 30)) // Default 1 month if no warranty_months
      : null;

  const completedAt =
    isNextTerminalPaidStatus ? new Date() : null;

  const shouldResetCounterPayment = (jobOrder: {
    status?: string | null;
    transferred_to_billing?: boolean | null;
  }) => {
    if (jobOrder.transferred_to_billing) return false;

    const previousStatus = (jobOrder.status || "").toLowerCase();
    const wasTerminalPaidStatus =
      previousStatus === "completed" || previousStatus === "pull out";

    return wasTerminalPaidStatus && !isNextTerminalPaidStatus;
  };

  if (nextStatusNormalized === "pull out") {
    for (const jobOrder of jobOrders) {
      let newRate = jobOrder.rate;
      if (jobOrder.rate === 1500 || jobOrder.rate === "1500") {
        newRate = 250;
      } else if (jobOrder.rate === 2000 || jobOrder.rate === "2000") {
        newRate = 500;
      }

      const payload: Record<string, unknown> = {
        status,
        warranty,
        completed_at: completedAt,
        rate: Number(newRate),
        grand_total: Number(newRate),
        net_sales: Number(newRate),
      };

      if (shouldResetCounterPayment(jobOrder)) {
        payload.payment_details = null;
        payload.receipt_url = null;
        payload.receipt_uploaded_at = null;
        payload.receipt_uploaded_by = null;
      }

      const { error: updateError } = await supabase
        .from("joborders")
        .update(payload)
        .eq("id", jobOrder.id)
        .is("deleted_at", null);

      if (updateError) {
        console.error(`Error updating job order ${jobOrder.id}:`, updateError);
        throw new Error(`Job Order ${jobOrder.id} could not be updated`);
      }
    }
  } else {
    // Update each job order individually to use their specific warranty_months
    for (const jobOrder of jobOrders) {
      const warrantyDate =
        nextStatusNormalized === "completed" &&
        jobOrder.warranty_months &&
        jobOrder.warranty_months > 0
          ? new Date(
              new Date().setDate(
                new Date().getDate() + jobOrder.warranty_months * 30
              )
            )
          : null;

      const payload: Record<string, unknown> = {
        status,
        warranty: warrantyDate,
        completed_at: completedAt,
      };

      if (shouldResetCounterPayment(jobOrder)) {
        payload.payment_details = null;
        payload.receipt_url = null;
        payload.receipt_uploaded_at = null;
        payload.receipt_uploaded_by = null;
      }

      const { error } = await supabase
        .from("joborders")
        .update(payload)
        .eq("id", jobOrder.id)
        .is("deleted_at", null);

      if (error) {
        console.error(`Error updating job order ${jobOrder.id}:`, error);
        throw new Error(`Job Order ${jobOrder.id} could not be updated`);
      }
    }
  }
}

export async function updateJobOrderPayment(
  orderId: number,
  payments: Record<string, number>
) {
  const { error } = await supabase
    .from("joborders")
    .update({
      payment_details: payments,
    })
    .eq("id", orderId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error updating payment details:", error);
    throw new Error("Could not update payment details");
  }
}

export async function deleteJobOrder(ids: number[]) {
  try {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;

    const softDeletePayload = await buildSoftDeleteUpdate();

    const { data: jobOrders, error: jobOrdersError } = await supabase
      .from("joborders")
      .select("id")
      .in("id", uniqueIds)
      .is("deleted_at", null);

    if (jobOrdersError) {
      console.log(jobOrdersError);
      throw new Error(`Job Orders with IDs ${uniqueIds} could not be fetched`);
    }

    const jobOrderIds = (jobOrders ?? []).map((jobOrder) => jobOrder.id);
    if (jobOrderIds.length === 0) return;

    const { error: jobOrderArchiveError } = await supabase
      .from("joborders")
      .update(softDeletePayload)
      .in("id", jobOrderIds)
      .is("deleted_at", null);

    if (jobOrderArchiveError) {
      console.log(jobOrderArchiveError);
      throw new Error(
        `Job Orders could not be archived. ${jobOrderArchiveError.message}`
      );
    }

    const { error: quotationArchiveError } = await supabase
      .from("quotations")
      .update(softDeletePayload)
      .in("job_order_id", jobOrderIds)
      .is("deleted_at", null);

    if (quotationArchiveError) {
      console.log(quotationArchiveError);
      throw new Error(
        "Job Orders were archived, but linked quotations could not be archived."
      );
    }
  } catch (error) {
    console.error("Error archiving Job Orders with details:", error);
    throw error;
  }
}
