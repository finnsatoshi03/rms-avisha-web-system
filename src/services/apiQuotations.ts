import { supabase } from "./supabase";
import { CreateQuotationData } from "../lib/types";

export async function createQuotation(quotationData: CreateQuotationData) {
  const {
    quotation_items,
    auto_generate_quote_no,
    manual_quote_no,
    ...quotation
  } = quotationData;

  // Handle quote number logic
  const finalQuotation = { ...quotation };

  if (
    !auto_generate_quote_no &&
    manual_quote_no &&
    manual_quote_no.trim() !== ""
  ) {
    // Use manual quote number
    finalQuotation.quote_no = manual_quote_no.trim();
  } else {
    // Let database trigger generate the quote number (set to empty string)
    finalQuotation.quote_no = "";
  }

  // First, create the quotation
  const { data: quotationResult, error: quotationError } = await supabase
    .from("quotations")
    .insert([finalQuotation])
    .select(
      `
      *,
      joborders:job_order_id (order_no)
    `
    )
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

  // Add job_order_no to the response
  return {
    ...quotationResult,
    job_order_no: quotationResult.joborders?.order_no || null,
  };
}

export async function getQuotationsByJobOrder(jobOrderId: number) {
  const { data, error } = await supabase
    .from("quotations")
    .select(
      `
      *,
      quotation_items (*),
      joborders:job_order_id (order_no)
    `
    )
    .eq("job_order_id", jobOrderId);

  if (error) {
    console.error("Error fetching quotations:", error);
    throw new Error("Failed to fetch quotations");
  }

  // Add job_order_no to each quotation in the response
  return (
    data?.map((quotation) => ({
      ...quotation,
      job_order_no: quotation.joborders?.order_no || null,
    })) || []
  );
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
  const {
    quotation_items,
    auto_generate_quote_no,
    manual_quote_no,
    ...quotation
  } = quotationData;

  // Handle quote number logic
  const finalQuotation = { ...quotation };

  if (
    !auto_generate_quote_no &&
    manual_quote_no &&
    manual_quote_no.trim() !== ""
  ) {
    // Use manual quote number
    finalQuotation.quote_no = manual_quote_no.trim();
  }
  // If auto_generate_quote_no is true, don't update the quote_no (keep existing)

  // Update the quotation
  const { data: quotationResult, error: quotationError } = await supabase
    .from("quotations")
    .update(finalQuotation)
    .eq("id", quotationId)
    .select(
      `
      *,
      joborders:job_order_id (order_no)
    `
    )
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

  // Add job_order_no to the response
  return {
    ...quotationResult,
    job_order_no: quotationResult.joborders?.order_no || null,
  };
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

// Generate a unique quote number (deprecated - now handled by database trigger)
export function generateQuoteNumber(): string {
  // This function is deprecated. Quote numbers are now generated automatically
  // by the database trigger using sequential numbering (00001, 00002, etc.)
  // Return empty string to let the database handle it
  return "";
}

// Get job orders that have quotations (any status with quotations)
export async function getQuotationJobOrders({
  page = 1,
  limit = 10,
  searchTerm = "",
  branchLocation = null,
  technicianId = undefined,
  showWarningsOnly = false,
}: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  branchLocation?: string | null;
  technicianId?: string | number | undefined;
  showWarningsOnly?: boolean;
} = {}) {
  // Calculate range for pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("joborders").select(
    `
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
      users:technician_id (*),
      quotations (
        id,
        quote_no,
        date_created,
        end_date,
        company,
        address,
        note,
        subtotal,
        discount,
        total_quote,
        status,
        is_active,
        is_final,
        quotation_items (*)
      )
    `,
    { count: "exact" }
  );

  // Filter job orders that have quotations (any status)
  query = query.not("quotations", "is", null);

  // Add warning filter if provided
  if (showWarningsOnly) {
    // Filter for quotations that are pending for more than 2 days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoISO = twoDaysAgo.toISOString();

    query = query.lt("created_at", twoDaysAgoISO);
  }

  // Add branch location filter if provided
  if (branchLocation) {
    // Need to filter using a join for branch location
    const { data: branchIds, error: branchError } = await supabase
      .from("branches")
      .select("id")
      .eq("location", branchLocation);

    if (!branchError && branchIds && branchIds.length > 0) {
      const ids = branchIds.map((branch) => branch.id);
      query = query.in("branch_id", ids);
    }
  }

  // Add technician filter if provided
  if (technicianId) {
    query = query.eq("technician_id", technicianId);
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

    if (clientError) {
      console.error("Error searching clients:", clientError);
    }

    const { data: matchingTechnicians, error: techError } = await supabase
      .from("users")
      .select("id")
      .ilike("fullname", `%${term}%`);

    if (techError) {
      console.error("Error searching technicians:", techError);
    }

    // Build the combined condition
    let combinedCondition = jobOrderConditions;

    // Add client conditions if there are matching clients
    if (matchingClients && matchingClients.length > 0) {
      const clientIds = matchingClients.map((client) => client.id);
      const clientConditions = clientIds
        .map((id) => `client_id.eq.${id}`)
        .join(",");
      combinedCondition += `,${clientConditions}`;
    }

    // Add technician conditions if there are matching technicians
    if (matchingTechnicians && matchingTechnicians.length > 0) {
      const technicianIds = matchingTechnicians.map((tech) => tech.id);
      const technicianConditions = technicianIds
        .map((id) => `technician_id.eq.${id}`)
        .join(",");
      combinedCondition += `,${technicianConditions}`;
    }

    query = query.or(combinedCondition);
  }

  // Apply pagination and ordering
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching quotation job orders:", error);
    throw new Error("Quotation job orders could not be fetched");
  }

  return {
    data: data || [],
    meta: {
      totalCount: count,
    },
  };
}

// Add quotation to existing job order
export async function addQuotationToJobOrder(
  jobOrderId: number,
  quotationData: Omit<CreateQuotationData, "job_order_id">
) {
  const quotation = {
    ...quotationData,
    job_order_id: jobOrderId,
  };

  return await createQuotation(quotation);
}

// Get all quotations for a job order with status information
export async function getJobOrderQuotations(jobOrderId: number) {
  const { data, error } = await supabase
    .from("quotations")
    .select(
      `
      *,
      quotation_items (*)
    `
    )
    .eq("job_order_id", jobOrderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching job order quotations:", error);
    throw new Error("Failed to fetch job order quotations");
  }

  return data;
}

// Update quotation status
export async function updateQuotationStatus(
  quotationId: number,
  status: "draft" | "for_approval" | "approved" | "rejected" | "expired"
) {
  const { data, error } = await supabase
    .from("quotations")
    .update({ status })
    .eq("id", quotationId)
    .select()
    .single();

  if (error) {
    console.error("Error updating quotation status:", error);
    throw new Error("Failed to update quotation status");
  }

  return data;
}

// Set quotation as final (only one final quotation per job order)
export async function setQuotationAsFinal(
  quotationId: number,
  jobOrderId: number
) {
  // First, set all other quotations for this job order as not final
  await supabase
    .from("quotations")
    .update({ is_final: false })
    .eq("job_order_id", jobOrderId)
    .neq("id", quotationId);

  // Then set this quotation as final
  const { data, error } = await supabase
    .from("quotations")
    .update({ is_final: true })
    .eq("id", quotationId)
    .select()
    .single();

  if (error) {
    console.error("Error setting quotation as final:", error);
    throw new Error("Failed to set quotation as final");
  }

  return data;
}

// Get job order details for quotation creation
export async function getJobOrderForQuotation(jobOrderId: number) {
  const { data, error } = await supabase
    .from("joborders")
    .select(
      `
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
    `
    )
    .eq("id", jobOrderId)
    .single();

  if (error) {
    console.error("Error fetching job order for quotation:", error);
    throw new Error("Failed to fetch job order details");
  }

  return data;
}
