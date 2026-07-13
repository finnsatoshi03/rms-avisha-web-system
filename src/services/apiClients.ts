import { Client } from "../lib/types";
import { withEffectiveUserEmail } from "../lib/effective-user-email";
import { supabase } from "./supabase";

export type ClientSearchResult = Client & {
  score: number;
  match_type: "exact" | "contains" | "similar" | "sounds_like" | "close_spelling";
};

type UserEmailShape = {
  email?: string | null;
  migrated_email?: string | null;
};

function normalizeClientSearchKey(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isParentAliasRow(client: ClientSearchResult): boolean {
  if (client.parent_client_id == null) return false;

  const ownKey = normalizeClientSearchKey(client.name);
  const parentKey = normalizeClientSearchKey(client.parent_name || "");

  if (!ownKey) return true;
  return Boolean(parentKey) && ownKey === parentKey;
}

export async function getClientsWithJobOrders() {
  try {
    const { data: clients, error: clientError } = await supabase
      .from("clients")
      .select("*, parent_client:parent_client_id(id, name)")
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
      .in("client_id", clientIds)
      .is("deleted_at", null);

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
    .select("*, parent_client:parent_client_id(id, name)")
    .eq("is_active", true);

  if (error) {
    console.error(error);
    throw new Error("Error fetching clients");
  }

  return clients;
}

export async function getClient(id: string) {
  const clientId = Number(id);
  const { data: client, error } = await supabase
    .from("clients")
    .select("*, parent_client:parent_client_id(id, name)")
    .eq("id", clientId)
    .single();

  if (error) {
    console.error(error);
    throw new Error("Error fetching client");
  }

  const { data: childClients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("parent_client_id", clientId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  return {
    ...client,
    child_clients: childClients || [],
  };
}

export async function searchClients(searchTerm: string): Promise<ClientSearchResult[]> {
  if (!searchTerm || searchTerm.trim().length < 2) return [];

  const { data, error } = await supabase.rpc("search_clients", {
    search_term: searchTerm.trim(),
    result_limit: 10,
  });

  if (error) {
    console.error("Error searching clients:", error);
    throw new Error("Error searching clients");
  }

  const rows = ((data || []) as ClientSearchResult[]).filter(
    (row) => !isParentAliasRow(row)
  );

  return rows;
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
        parent_client_id: data.parent_client_id ?? null,
      },
    ])
    .select("*, parent_client:parent_client_id(id, name)")
    .single();

  if (error) {
    console.error(error);
    throw new Error("Error creating client");
  }

  return newClient;
}

export type ClientImpact = {
  job_orders: number;
  rentals: number;
  billing_accounts: number;
};

export async function getClientImpact(clientId: number): Promise<ClientImpact> {
  const { data, error } = await supabase.rpc("get_client_impact", {
    p_client_id: clientId,
  });

  if (error) {
    console.error(error);
    throw new Error("Error fetching client impact");
  }

  return data as ClientImpact;
}

export async function updateClient(
  id: number,
  data: Partial<Client>
): Promise<Client> {
  const { data: updatedClient, error } = await supabase
    .from("clients")
    .update(data)
    .eq("id", id)
    .select("*, parent_client:parent_client_id(id, name)")
    .single();

  if (error) {
    console.error(error);
    throw new Error("Error updating client");
  }

  return updatedClient;
}

export async function getClientChildren(parentClientId: number): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*, parent_client:parent_client_id(id, name)")
    .eq("parent_client_id", parentClientId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Error fetching child clients");
  }

  return data || [];
}

export async function getScopedClientIds(clientId: number): Promise<number[]> {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, parent_client_id")
    .eq("id", clientId)
    .single();

  if (error) {
    console.error(error);
    return [clientId];
  }

  // Child-level scope: only itself.
  if (client.parent_client_id != null) {
    return [client.id];
  }

  // Parent-level scope: parent + all children.
  const { data: children, error: childError } = await supabase
    .from("clients")
    .select("id")
    .eq("parent_client_id", client.id);

  if (childError) {
    console.error(childError);
    return [client.id];
  }

  return [client.id, ...(children || []).map((row) => row.id)];
}

export async function expandClientIdsWithChildren(
  clientIds: number[]
): Promise<number[]> {
  const uniqueClientIds = Array.from(new Set(clientIds)).filter((id) =>
    Number.isFinite(id)
  );
  if (uniqueClientIds.length === 0) return [];

  const { data: parentRows, error: parentError } = await supabase
    .from("clients")
    .select("id")
    .in("id", uniqueClientIds)
    .is("parent_client_id", null);

  if (parentError) {
    console.error(parentError);
    return uniqueClientIds;
  }

  const parentIds = (parentRows || []).map((row) => row.id);
  if (parentIds.length === 0) {
    return uniqueClientIds;
  }

  const { data: children, error: childError } = await supabase
    .from("clients")
    .select("id")
    .in("parent_client_id", parentIds);

  if (childError) {
    console.error(childError);
    return uniqueClientIds;
  }

  return Array.from(
    new Set([...uniqueClientIds, ...(children || []).map((row) => row.id)])
  );
}
