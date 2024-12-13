import { Client } from "../lib/types";
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

    const clientWithJobOrders = clients.map((client) => ({
      ...client,
      joborders: jobOrders.filter(
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
