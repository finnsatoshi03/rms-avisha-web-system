/* eslint-disable @typescript-eslint/no-explicit-any */
import { withEffectiveUserEmail } from "../lib/effective-user-email";
import { supabase } from "./supabase";
import {
  buildSoftDeleteUpdate,
  RESTORE_SOFT_DELETE_UPDATE,
} from "./softDelete";

export type ArchiveRecordType = "joborders" | "rentals" | "quotations";

export type ArchiveFilterParams = {
  page?: number;
  limit?: number;
  searchTerm?: string;
  branchId?: number | null;
  deletedBy?: string | null;
  startDate?: string;
  endDate?: string;
};

export type ArchiveQueryResult<T> = {
  data: T[];
  meta: {
    totalCount: number | null;
  };
};

export type ArchiveDeletedUser = {
  id: string;
  fullname: string | null;
  email: string | null;
  migrated_email: string | null;
};

function addDeletedAtDateRange<T>(query: T, startDate?: string, endDate?: string) {
  let nextQuery = query as any;

  if (startDate) {
    nextQuery = nextQuery.gte("deleted_at", startDate);
  }

  if (endDate) {
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    nextQuery = nextQuery.lt("deleted_at", endDateTime.toISOString().split("T")[0]);
  }

  return nextQuery;
}

async function attachDeletedByUsers<T extends { deleted_by?: string | null }>(
  rows: T[] | null | undefined
) {
  const safeRows = rows ?? [];
  const deletedByIds = Array.from(
    new Set(
      safeRows
        .map((row) => row.deleted_by)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  if (deletedByIds.length === 0) {
    return safeRows.map((row) => ({ ...row, deleted_by_user: null }));
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, fullname, email, migrated_email")
    .in("id", deletedByIds);

  if (error) {
    return safeRows.map((row) => ({ ...row, deleted_by_user: null }));
  }

  const userMap = new Map<string, ArchiveDeletedUser>();
  for (const row of data ?? []) {
    const normalized = withEffectiveUserEmail({
      id: row.id,
      fullname: row.fullname ?? null,
      email: row.email ?? null,
      migrated_email: row.migrated_email ?? null,
    }) ?? {
      id: row.id,
      fullname: row.fullname ?? null,
      email: row.email ?? null,
      migrated_email: row.migrated_email ?? null,
    };

    userMap.set(normalized.id, normalized);
  }

  return safeRows.map((row) => ({
    ...row,
    deleted_by_user:
      row.deleted_by && userMap.has(row.deleted_by)
        ? userMap.get(row.deleted_by)
        : null,
  }));
}

export async function getArchivedJobOrdersFiltered({
  page = 1,
  limit = 10,
  searchTerm = "",
  branchId = null,
  deletedBy = null,
  startDate,
  endDate,
}: ArchiveFilterParams = {}): Promise<ArchiveQueryResult<any>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("joborders")
    .select(
      `
      id,
      order_no,
      machine_type,
      status,
      branch_id,
      client_id,
      transferred_to_billing,
      billing_account_id,
      deleted_at,
      deleted_by,
      clients:client_id (id, name),
      branches:branch_id (id, name, prefix)
    `,
      { count: "exact" }
    )
    .not("deleted_at", "is", null);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  if (deletedBy) {
    query = query.eq("deleted_by", deletedBy);
  }

  query = addDeletedAtDateRange(query, startDate, endDate);

  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.trim().toLowerCase();

    const { data: matchingClients } = await supabase
      .from("clients")
      .select("id")
      .or(
        `name.ilike.%${term}%,email.ilike.%${term}%,contact_number.ilike.%${term}%`
      );

    const clientIds = (matchingClients ?? []).map((client) => client.id);

    let orConditions = [
      `order_no.ilike.%${term}%`,
      `machine_type.ilike.%${term}%`,
      `status.ilike.%${term}%`,
      `problem_statement.ilike.%${term}%`,
      `brand_model.ilike.%${term}%`,
    ];

    if (clientIds.length > 0) {
      orConditions = [...orConditions, `client_id.in.(${clientIds.join(",")})`];
    }

    query = query.or(orConditions.join(","));
  }

  const { data, error, count } = await query
    .order("deleted_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Archived Job Orders could not be fetched: ${error.message}`);
  }

  return {
    data: await attachDeletedByUsers(data),
    meta: { totalCount: count },
  };
}

export async function getArchivedRentalsFiltered({
  page = 1,
  limit = 10,
  searchTerm = "",
  branchId = null,
  deletedBy = null,
  startDate,
  endDate,
}: ArchiveFilterParams = {}): Promise<ArchiveQueryResult<any>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("rentals")
    .select(
      `
      id,
      rental_no,
      status,
      branch_id,
      client_id,
      transferred_to_billing,
      billing_account_id,
      deleted_at,
      deleted_by,
      clients:client_id (id, name),
      branches:branch_id (id, name, prefix),
      rental_assets:rental_asset_id (id, unit_name, model)
    `,
      { count: "exact" }
    )
    .not("deleted_at", "is", null);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  if (deletedBy) {
    query = query.eq("deleted_by", deletedBy);
  }

  query = addDeletedAtDateRange(query, startDate, endDate);

  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.trim().toLowerCase();

    const { data: matchingClients } = await supabase
      .from("clients")
      .select("id")
      .or(
        `name.ilike.%${term}%,email.ilike.%${term}%,contact_number.ilike.%${term}%`
      );

    const clientIds = (matchingClients ?? []).map((client) => client.id);

    let orConditions = [
      `rental_no.ilike.%${term}%`,
      `status.ilike.%${term}%`,
      `notes.ilike.%${term}%`,
    ];

    if (clientIds.length > 0) {
      orConditions = [...orConditions, `client_id.in.(${clientIds.join(",")})`];
    }

    query = query.or(orConditions.join(","));
  }

  const { data, error, count } = await query
    .order("deleted_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Archived Rentals could not be fetched: ${error.message}`);
  }

  return {
    data: await attachDeletedByUsers(data),
    meta: { totalCount: count },
  };
}

export async function getArchivedQuotationsFiltered({
  page = 1,
  limit = 10,
  searchTerm = "",
  branchId = null,
  deletedBy = null,
  startDate,
  endDate,
}: ArchiveFilterParams = {}): Promise<ArchiveQueryResult<any>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("quotations")
    .select(
      `
      id,
      quote_no,
      status,
      job_order_id,
      company,
      address,
      note,
      total_quote,
      deleted_at,
      deleted_by,
      joborders:job_order_id (
        id,
        order_no,
        branch_id,
        client_id,
        clients:client_id (id, name),
        branches:branch_id (id, name, prefix)
      )
    `,
      { count: "exact" }
    )
    .not("deleted_at", "is", null);

  if (deletedBy) {
    query = query.eq("deleted_by", deletedBy);
  }

  if (branchId) {
    const { data: branchJobOrders, error: branchJobOrdersError } = await supabase
      .from("joborders")
      .select("id")
      .eq("branch_id", branchId);

    if (branchJobOrdersError) {
      throw new Error("Failed to filter archived quotations by branch");
    }

    const branchJobOrderIds = (branchJobOrders ?? []).map((row) => row.id);

    if (branchJobOrderIds.length === 0) {
      return { data: [], meta: { totalCount: 0 } };
    }

    query = query.in("job_order_id", branchJobOrderIds);
  }

  query = addDeletedAtDateRange(query, startDate, endDate);

  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.trim().toLowerCase();

    const { data: matchingClients } = await supabase
      .from("clients")
      .select("id")
      .or(
        `name.ilike.%${term}%,email.ilike.%${term}%,contact_number.ilike.%${term}%`
      );

    const matchingClientIds = (matchingClients ?? []).map((client) => client.id);

    let matchingJobOrderIds: number[] = [];
    if (matchingClientIds.length > 0) {
      const { data: matchingJobOrders } = await supabase
        .from("joborders")
        .select("id")
        .in("client_id", matchingClientIds);
      matchingJobOrderIds = (matchingJobOrders ?? []).map((row) => row.id);
    }

    let orConditions = [
      `quote_no.ilike.%${term}%`,
      `company.ilike.%${term}%`,
      `status.ilike.%${term}%`,
      `address.ilike.%${term}%`,
      `note.ilike.%${term}%`,
    ];

    if (matchingJobOrderIds.length > 0) {
      orConditions = [
        ...orConditions,
        `job_order_id.in.(${matchingJobOrderIds.join(",")})`,
      ];
    }

    query = query.or(orConditions.join(","));
  }

  const { data, error, count } = await query
    .order("deleted_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Archived Quotations could not be fetched: ${error.message}`);
  }

  return {
    data: await attachDeletedByUsers(data),
    meta: { totalCount: count },
  };
}

async function getArchivedJobOrderRows(ids: number[]) {
  const { data, error } = await supabase
    .from("joborders")
    .select("id, order_no")
    .in("id", ids)
    .not("deleted_at", "is", null);

  if (error) {
    throw new Error("Failed to load archived job orders");
  }

  return data ?? [];
}

async function getArchivedRentalRows(ids: number[]) {
  const { data, error } = await supabase
    .from("rentals")
    .select("id, rental_no, rental_asset_id, status")
    .in("id", ids)
    .not("deleted_at", "is", null);

  if (error) {
    throw new Error("Failed to load archived rentals");
  }

  return data ?? [];
}

export async function restoreArchivedJobOrders(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;

  const targetRows = await getArchivedJobOrderRows(uniqueIds);
  if (targetRows.length === 0) return;

  const targetIds = targetRows.map((row) => row.id);

  const { error: restoreError } = await supabase
    .from("joborders")
    .update(RESTORE_SOFT_DELETE_UPDATE)
    .in("id", targetIds)
    .not("deleted_at", "is", null);

  if (restoreError) {
    throw new Error("Archived Job Orders could not be restored");
  }

  const { error: quotationRestoreError } = await supabase
    .from("quotations")
    .update(RESTORE_SOFT_DELETE_UPDATE)
    .in("job_order_id", targetIds)
    .not("deleted_at", "is", null);

  if (quotationRestoreError) {
    throw new Error(
      "Job Orders restored, but linked archived quotations could not be restored"
    );
  }
}

export async function restoreArchivedRentals(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;

  const targetRows = await getArchivedRentalRows(uniqueIds);
  if (targetRows.length === 0) return;

  const targetIds = targetRows.map((row) => row.id);

  const { error: restoreError } = await supabase
    .from("rentals")
    .update(RESTORE_SOFT_DELETE_UPDATE)
    .in("id", targetIds)
    .not("deleted_at", "is", null);

  if (restoreError) {
    throw new Error("Archived Rentals could not be restored");
  }

  const assetsToMarkRented = targetRows
    .filter((row) => ["Created", "Released", "Ongoing"].includes(row.status))
    .map((row) => row.rental_asset_id)
    .filter((assetId): assetId is number => typeof assetId === "number");

  if (assetsToMarkRented.length > 0) {
    const { error: assetError } = await supabase
      .from("rental_assets")
      .update({ status: "rented" })
      .in("id", Array.from(new Set(assetsToMarkRented)));

    if (assetError) {
      throw new Error(
        "Rental restored, but linked printer status could not be reactivated"
      );
    }
  }
}

export async function restoreArchivedQuotations(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;

  const { error } = await supabase
    .from("quotations")
    .update(RESTORE_SOFT_DELETE_UPDATE)
    .in("id", uniqueIds)
    .not("deleted_at", "is", null);

  if (error) {
    throw new Error("Archived Quotations could not be restored");
  }
}

export async function permanentlyDeleteArchivedJobOrders(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;

  const targetRows = await getArchivedJobOrderRows(uniqueIds);
  if (targetRows.length === 0) return;

  const targetIds = targetRows.map((row) => row.id);

  const { data: linkedBilling, error: billingError } = await supabase
    .from("billing_line_items")
    .select("id, job_order_id")
    .in("job_order_id", targetIds);

  if (billingError) {
    throw new Error("Could not validate billing links before permanent delete");
  }

  if ((linkedBilling ?? []).length > 0) {
    const linkedIds = new Set((linkedBilling ?? []).map((row) => row.job_order_id));
    const linkedOrderNumbers = targetRows
      .filter((row) => linkedIds.has(row.id))
      .map((row) => row.order_no)
      .join(", ");

    throw new Error(
      `Cannot permanently delete archived Job Order(s): ${linkedOrderNumbers}. Billing records are still linked.`
    );
  }

  const { error: materialsDeleteError } = await supabase
    .from("materials")
    .delete()
    .in("job_order_id", targetIds);

  if (materialsDeleteError) {
    throw new Error("Failed to delete Job Order materials during permanent delete");
  }

  const { error: deleteError } = await supabase
    .from("joborders")
    .delete()
    .in("id", targetIds)
    .not("deleted_at", "is", null);

  if (deleteError) {
    throw new Error(`Archived Job Orders could not be permanently deleted: ${deleteError.message}`);
  }
}

export async function permanentlyDeleteArchivedRentals(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;

  const targetRows = await getArchivedRentalRows(uniqueIds);
  if (targetRows.length === 0) return;

  const targetIds = targetRows.map((row) => row.id);

  const { data: linkedBilling, error: billingError } = await supabase
    .from("billing_line_items")
    .select("id, rental_id")
    .in("rental_id", targetIds);

  if (billingError) {
    throw new Error("Could not validate billing links before permanent delete");
  }

  if ((linkedBilling ?? []).length > 0) {
    const linkedIds = new Set((linkedBilling ?? []).map((row) => row.rental_id));
    const linkedRentalNumbers = targetRows
      .filter((row) => linkedIds.has(row.id))
      .map((row) => row.rental_no)
      .join(", ");

    throw new Error(
      `Cannot permanently delete archived Rental(s): ${linkedRentalNumbers}. Billing records are still linked.`
    );
  }

  const { error: deleteError } = await supabase
    .from("rentals")
    .delete()
    .in("id", targetIds)
    .not("deleted_at", "is", null);

  if (deleteError) {
    throw new Error(`Archived Rentals could not be permanently deleted: ${deleteError.message}`);
  }
}

export async function permanentlyDeleteArchivedQuotations(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;

  const { error } = await supabase
    .from("quotations")
    .delete()
    .in("id", uniqueIds)
    .not("deleted_at", "is", null);

  if (error) {
    throw new Error(`Archived Quotations could not be permanently deleted: ${error.message}`);
  }
}

export async function getArchiveDeletedUsers(): Promise<ArchiveDeletedUser[]> {
  const [jobOrdersResult, rentalsResult, quotationsResult] = await Promise.all([
    supabase.from("joborders").select("deleted_by").not("deleted_by", "is", null),
    supabase.from("rentals").select("deleted_by").not("deleted_by", "is", null),
    supabase.from("quotations").select("deleted_by").not("deleted_by", "is", null),
  ]);

  if (jobOrdersResult.error || rentalsResult.error || quotationsResult.error) {
    throw new Error("Failed to load archive users");
  }

  const userIds = [
    ...(jobOrdersResult.data ?? []).map((row) => row.deleted_by),
    ...(rentalsResult.data ?? []).map((row) => row.deleted_by),
    ...(quotationsResult.data ?? []).map((row) => row.deleted_by),
  ].filter((id): id is string => typeof id === "string");

  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, fullname, email, migrated_email")
    .in("id", uniqueUserIds)
    .eq("deleted", false)
    .is("migrated_to", null)
    .order("fullname", { ascending: true });

  if (error) {
    throw new Error("Failed to load archive users");
  }

  return (data ?? []).map((row) => {
    const baseUser: ArchiveDeletedUser = {
      id: row.id,
      fullname: row.fullname ?? null,
      email: row.email ?? null,
      migrated_email: row.migrated_email ?? null,
    };

    return withEffectiveUserEmail(baseUser) ?? baseUser;
  });
}

export async function archiveRecords(
  type: ArchiveRecordType,
  ids: number[]
): Promise<void> {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;

  const softDeletePayload = await buildSoftDeleteUpdate();

  if (type === "joborders") {
    const { error } = await supabase
      .from("joborders")
      .update(softDeletePayload)
      .in("id", uniqueIds)
      .is("deleted_at", null);

    if (error) throw new Error("Failed to archive job orders");
    return;
  }

  if (type === "rentals") {
    const { error } = await supabase
      .from("rentals")
      .update(softDeletePayload)
      .in("id", uniqueIds)
      .is("deleted_at", null);

    if (error) throw new Error("Failed to archive rentals");
    return;
  }

  const { error } = await supabase
    .from("quotations")
    .update(softDeletePayload)
    .in("id", uniqueIds)
    .is("deleted_at", null);

  if (error) throw new Error("Failed to archive quotations");
}
