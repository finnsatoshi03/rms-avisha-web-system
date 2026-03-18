import { Client } from "../lib/types";
import { withEffectiveUserEmail } from "../lib/effective-user-email";
import { supabase } from "./supabase";

type UserEmailShape = {
  email?: string | null;
  migrated_email?: string | null;
};

export async function getClientsWithJobOrders() {
  try {
    const { data: clients, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("is_active", true);

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
      users:
        withEffectiveUserEmail(jobOrder.users as UserEmailShape) ??
        jobOrder.users,
      order_received_user:
        withEffectiveUserEmail(jobOrder.order_received_user as UserEmailShape) ??
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
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .eq("is_active", true);

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

export async function searchClients(searchTerm: string): Promise<Client[]> {
  if (!searchTerm || searchTerm.trim().length < 2) return [];

  const { data, error } = await supabase.rpc("search_clients", {
    search_term: searchTerm.trim(),
    result_limit: 10,
  });

  if (error) {
    console.error("Error searching clients:", error);
    throw new Error("Error searching clients");
  }

  return data || [];
}

export async function createClient(
  data: Partial<Client> & { name: string }
): Promise<Client> {
  const { data: newClient, error } = await supabase
    .from("clients")
    .insert([
      {
        name: data.name,
        contact_number: data.contact_number || "",
        email: data.email || "",
        type: data.type || "individual",
        address: data.address || null,
        notes: data.notes || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Error creating client");
  }

  return newClient;
}

export async function updateClient(
  id: number,
  data: Partial<Client>
): Promise<Client> {
  const { data: updatedClient, error } = await supabase
    .from("clients")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Error updating client");
  }

  return updatedClient;
}
