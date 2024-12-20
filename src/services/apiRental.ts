/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { RentalFormType } from "../components/rental/rental-form";
import { RentalUnitAndDetailsFormType } from "../components/rental/rental-unit-details-form";
import { supabase } from "./supabase";

interface CreateRentalData extends RentalFormType {
  unit_id: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface UpdateRentalData
  extends Partial<RentalUnitAndDetailsFormType> {
  id: number;
}

async function upsertClient(clientData: {
  name: string;
  contact_number?: string;
  email?: string;
}) {
  // Standardize name capitalization
  const formattedName = clientData.name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // First, check if client with this name already exists
  const { data: existingClient, error: searchError } = await supabase
    .from("clients")
    .select("id")
    .eq("name", formattedName)
    .single();

  if (searchError && searchError.code !== "PGRST116") {
    console.error("Error searching for client:", searchError);
    throw searchError;
  }

  // If client exists, update or return existing client ID
  if (existingClient) {
    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update({
        contact_number: clientData.contact_number,
        email: clientData.email,
      })
      .eq("id", existingClient.id)
      .select("id")
      .single();

    if (updateError) {
      console.error("Error updating client:", updateError);
      throw updateError;
    }

    return updatedClient.id;
  }

  // If client doesn't exist, insert new client
  const { data: newClient, error: insertError } = await supabase
    .from("clients")
    .insert({
      name: formattedName,
      contact_number: clientData.contact_number,
      email: clientData.email,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error creating client:", insertError);
    throw insertError;
  }

  return newClient.id;
}

export async function createRental(data: CreateRentalData) {
  const { data: assignedRental, error } = await supabase
    .from("rentals")
    .insert([data]);

  if (error) {
    console.log(error);
    throw new Error("Error assigning a unit for rental");
  }
  return assignedRental;
}

export async function getRentalByUnitId(unitId: number) {
  const { data: rental, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("unit_id", unitId)
    .single();

  if (error) {
    console.log(error);
    throw new Error("Error getting rental by unit id");
  }
  return rental;
}

export async function createRentalWithClient(data: CreateRentalData) {
  const clientId = await upsertClient(data.client);
  console.log("Client ID:", clientId);

  // Create rental with client ID
  const { client, ...rest } = data;
  const rentalData = {
    ...rest,
    client_id: clientId,
  };

  const { data: assignedRental, error } = await supabase
    .from("rentals")
    .insert([rentalData]);

  if (error) {
    console.error("Error creating rental:", error);
    throw new Error("Error creating rental");
  }

  return { rental: assignedRental, clientId };
}

// Get Rental by Unit ID with Client Details
export async function getRentalByUnitIdWithClient(unitId: number) {
  const { data: rental, error } = await supabase
    .from("rentals")
    .select(
      `
      *,
      clients(*)
    `
    )
    .eq("unit_id", unitId)
    .single();

  if (error) {
    console.error("Error getting rental by unit id:", error);
    throw new Error("Error getting rental by unit id");
  }

  return rental;
}

export async function updateRental(rentalData: UpdateRentalData) {
  // Destructure only what we need, ignoring unitData completely
  const { rental_details } = rentalData;

  // Prepare the rental update payload
  const rentalUpdatePayload: any = {
    ...(rental_details && {
      id: rental_details.rental_id,
      start_date: rental_details.start_date,
      end_date: rental_details.end_date,
      rental_type: rental_details.rental_type,
      rate_amount: rental_details.rate_amount,
      payment_terms: rental_details.payment_terms,
      status: rental_details.status || "ACTIVE",
      grand_total: rental_details.grand_total,
      branch_id: rental_details.branch_id,
    }),
  };

  // Update client if client details exist
  let clientId;
  if (rental_details?.client) {
    clientId = await upsertClient(rental_details.client);
    rentalUpdatePayload.client_id = clientId;
  }

  // Perform the rental update
  const { data, error } = await supabase
    .from("rentals")
    .update(rentalUpdatePayload)
    .eq("id", rentalUpdatePayload.id)
    .select();

  if (error) {
    console.error("Error updating rental:", error);
    throw new Error("Failed to update rental");
  }

  return { rental: data, clientId };
}
