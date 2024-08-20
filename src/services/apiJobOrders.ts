/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from "@supabase/supabase-js";
import { CreateJobOrderData, MaterialItem } from "../lib/types";
import { supabase } from "./supabase";

export async function getJobOrders() {
  const { data: joborders, error } = await supabase.from("joborders").select(`
      *,
      clients:client_id (*),
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
    `);

  if (error) {
    console.log(error);
    throw new Error("Job Orders could not be fetched");
  }

  return joborders;
}

async function upsertClient(
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
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .update({
        name: client.name,
        contact_number: client.contact_number,
        email: client.email,
        created_at: client.date,
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
    // Check if a client with the same name already exists
    const { data: existingClient, error: existingClientError } = await supabase
      .from("clients")
      .select("id")
      .eq("name", client.name)
      .single();

    if (existingClientError && existingClientError.code !== "PGRST116") {
      console.log(existingClientError);
      throw new Error("Error checking existing client");
    }

    if (existingClient) {
      return existingClient.id;
    }

    // If client does not exist, create a new one
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert([
        {
          name: client.name,
          contact_number: client.contact_number,
          email: client.email,
          created_at: client.date,
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
): Promise<number> {
  // Initialize the job order data without the status field
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
    warranty:
      jobOrder.status?.toLowerCase() === "completed"
        ? new Date(new Date().setDate(new Date().getDate() + 29))
        : null,
    is_copy: jobOrder.is_copy ?? false,
    technical_report: jobOrder.technical_report,
  };

  if (jobOrderId) {
    // Fetch the existing job order
    const { data: existingJobOrder, error: fetchError } = await supabase
      .from("joborders")
      .select("status")
      .eq("id", jobOrderId)
      .single();

    if (fetchError) {
      console.log(fetchError);
      throw new Error("Existing Job Order could not be fetched");
    }

    // If status is not provided in the jobOrder object, retain the current status
    if (!jobOrder.status) {
      jobOrderData.status = existingJobOrder.status;
    } else {
      jobOrderData.status = jobOrder.status;
    }

    const { data, error } = await supabase
      .from("joborders")
      .update(jobOrderData)
      .eq("id", jobOrderId)
      .select()
      .single();

    if (error) {
      console.log(error);
      throw new Error("Job Order could not be updated");
    }

    return data.id;
  } else {
    jobOrderData.status = jobOrder.status ?? "Pending";

    const { data, error } = await supabase
      .from("joborders")
      .insert([jobOrderData])
      .select()
      .single();

    if (error) {
      console.log(error);
      throw new Error("Job Order could not be created");
    }

    return data.id;
  }
}

async function upsertMaterials(
  supabase: SupabaseClient,
  materials: CreateJobOrderData["materials"],
  jobOrderId: number
) {
  if (!materials || materials.length === 0) {
    return;
  }

  // Fetch current stock levels
  const materialIds = materials.map((material) => material.material_id);
  const { data: materialStocks, error: fetchError } = await supabase
    .from("material_stocks")
    .select("id, stocks")
    .in("id", materialIds);

  if (fetchError) {
    console.log(fetchError);
    throw new Error("Could not fetch material stocks");
  }

  const materialStocksMap = materialStocks.reduce((acc, stock) => {
    acc[stock.id] = stock.stocks;
    return acc;
  }, {} as { [key: number]: number });

  // Calculate new stock levels and prepare material data
  const materialsWithJobOrderId = materials.map((material) => {
    if (material.material_id === undefined) {
      throw new Error(
        `Material ID is undefined for material ${material.material}`
      );
    }

    const newQuantity =
      materialStocksMap[material.material_id] - (material.quantity ?? 0);
    if (newQuantity < 0) {
      throw new Error(
        `Not enough stock for material ID ${material.material_id}`
      );
    }

    materialStocksMap[material.material_id] = newQuantity;

    return {
      used: material.used,
      material_id: material.material_id,
      material_description: material.material,
      quantity: material.quantity,
      unit_price: material.unitPrice,
      total_amount: (material.quantity ?? 0) * (material.unitPrice ?? 0),
      job_order_id: jobOrderId,
    };
  });

  // Delete existing materials
  const { error: deleteMaterialsError } = await supabase
    .from("materials")
    .delete()
    .eq("job_order_id", jobOrderId);

  if (deleteMaterialsError) {
    console.log(deleteMaterialsError);
    throw new Error("Existing materials could not be deleted");
  }

  // Insert new materials
  const { data: materialData, error: materialError } = await supabase
    .from("materials")
    .insert(materialsWithJobOrderId)
    .select();

  if (materialError) {
    console.log(materialError);
    throw new Error("Materials could not be created or updated");
  }

  // Update stock levels
  for (const [materialId, newQuantity] of Object.entries(materialStocksMap)) {
    const { error: updateStockError } = await supabase
      .from("material_stocks")
      .update({ stocks: newQuantity })
      .eq("id", parseInt(materialId, 10));

    if (updateStockError) {
      console.log(updateStockError);
      throw new Error(
        `Stock for material ID ${materialId} could not be updated`
      );
    }
  }

  return materialData;
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

    // If the name is changed and it's not a copy anymore
    let finalClientId;
    if (clientId && clientData.name !== originalClientName) {
      finalClientId = await upsertClient(supabase, clientData, null); // Create new client
      newJobOrder.is_copy = false; // Set is_copy to false
    } else {
      finalClientId = await upsertClient(supabase, clientData, clientId);
    }

    const finalJobOrderId = await upsertJobOrder(
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

    return { jobOrder: finalJobOrderId, materials: materialData };
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
      status: "Pending",
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
  const warranty =
    status.toLowerCase() === "completed"
      ? new Date(new Date().setDate(new Date().getDate() + 29))
      : null;

  const { data, error } = await supabase
    .from("joborders")
    .update({ status, warranty })
    .in("id", ids)
    .select();

  if (error) {
    console.log(error);
    throw new Error("Job Order status could not be updated");
  }

  return data;
}

export async function deleteJobOrder(ids: number[]) {
  try {
    // Retrieve client IDs associated with the job orders to be deleted
    const { data: jobOrders, error: jobOrdersError } = await supabase
      .from("joborders")
      .select("client_id")
      .in("id", ids);

    if (jobOrdersError) {
      console.log(jobOrdersError);
      throw new Error(`Job Orders with IDs ${ids} could not be fetched`);
    }

    const clientIds = jobOrders.map((jobOrder) => jobOrder.client_id);

    // Delete materials associated with the job orders
    const { error: materialError } = await supabase
      .from("materials")
      .delete()
      .in("job_order_id", ids);

    if (materialError) {
      console.log(materialError);
      throw new Error(
        `Materials for Job Orders with IDs ${ids} could not be deleted`
      );
    }

    // Delete the job orders
    const { error: jobOrderError } = await supabase
      .from("joborders")
      .delete()
      .in("id", ids);

    if (jobOrderError) {
      console.log(jobOrderError);
      throw new Error(`Job Orders with IDs ${ids} could not be deleted`);
    }

    // Check if any of the clients have remaining job orders
    const { data: remainingJobOrders, error: remainingJobOrdersError } =
      await supabase
        .from("joborders")
        .select("client_id")
        .in("client_id", clientIds);

    if (remainingJobOrdersError) {
      console.log(remainingJobOrdersError);
      throw new Error(
        `Remaining Job Orders for Clients with IDs ${clientIds} could not be fetched`
      );
    }

    // Filter out clients that still have job orders
    const clientsToDelete = clientIds.filter(
      (clientId) =>
        !remainingJobOrders.some((jobOrder) => jobOrder.client_id === clientId)
    );

    // Delete the clients that no longer have job orders
    if (clientsToDelete.length > 0) {
      const { error: clientError } = await supabase
        .from("clients")
        .delete()
        .in("id", clientsToDelete);

      if (clientError) {
        console.log(clientError);
        throw new Error(
          `Clients with IDs ${clientsToDelete} could not be deleted`
        );
      }
    }
  } catch (error) {
    console.error("Error deleting Job Orders with details:", error);
    throw error;
  }
}
