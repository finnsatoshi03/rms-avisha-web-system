import { Client } from "../lib/types";
import { withEffectiveUserEmail } from "../lib/effective-user-email";
import { supabase } from "./supabase";

export async function getClientsWithJobOrders() {
  try {
    const { data: clients, error: clientError } = await supabase
      .from("clients")
      .select("*");

    if (clientError) {
      console.error(clientError);
      throw new Error("Error fetching clients");
    }

    if (!clients.length) {
      return [];
    }

    const clientIds = clients.map((client) => client.id);

    const { data: jobOrders, error: jobOrderError } = await supabase
      .from("joborders")
      .select(
        `
        *,
        clients:client_id (*),
        branches:branch_id (*),
        materials (*),
        users:technician_id (*)
      `
      )
      .in("client_id", clientIds);

    if (jobOrderError) {
      console.error(jobOrderError);
      throw new Error("Error fetching job orders");
    }

    const normalizedJobOrders = (jobOrders || []).map((jobOrder) => ({
      ...jobOrder,
      users: withEffectiveUserEmail(jobOrder.users as any) ?? jobOrder.users,
      order_received_user:
        withEffectiveUserEmail(jobOrder.order_received_user as any) ??
        jobOrder.order_received_user,
    }));

    const clientWithJobOrders = clients.map((client) => ({
      ...client,
      joborders: normalizedJobOrders.filter(
        (jobOrder) => jobOrder.client_id === client.id
      ),
    }));

    return clientWithJobOrders;
  } catch (error) {
    console.error("Error fetching clients with job orders:", error);
    throw error;
  }
}

export async function getClients() {
  const { data: clients, error } = await supabase.from("clients").select("*");

  if (error) {
    console.error(error);
    throw new Error("Error fetching clients");
  }

  return clients;
}

export async function getClient(id: string) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    throw new Error("Error fetching client");
  }

  return client;
}

export async function createClient(
  data: Omit<Client, "id" | "created_at">
): Promise<Client> {
  // Check if a client with the same name already exists
  const { data: existingClient, error: existingClientError } = await supabase
    .from("clients")
    .select("id")
    .eq("name", data.name)
    .single();

  if (existingClientError && existingClientError.code !== "PGRST116") {
    console.error(existingClientError);
    throw new Error("Error checking existing client");
  }

  if (existingClient) {
    // Update the existing client with the latest data
    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update({
        contact_number: data.contact_number,
        email: data.email,
      })
      .eq("id", existingClient.id)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      throw new Error("Existing client could not be updated with new data");
    }

    return updatedClient;
  }

  // Create a new client if one with the same name doesn't exist
  const { data: newClient, error } = await supabase
    .from("clients")
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Error creating client");
  }

  return newClient;
}
