import { supabase } from "./supabase";
import { withEffectiveUserEmail } from "../lib/effective-user-email";
import { TechnicianWithJobOrders, User } from "../lib/types";

type UserEmailShape = Pick<
  User,
  "id" | "email" | "migrated_email" | "migrated_to" | "deleted" | "created_at"
>;

function dedupeUsersByIdentity<T extends UserEmailShape>(users: T[]): T[] {
  const deduped = new Map<string, T>();
  const toTimestamp = (value: User["created_at"]) => {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
  };

  users.forEach((user) => {
    const key = user.email?.trim().toLowerCase() || user.id;
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, user);
      return;
    }

    const existingTimestamp = toTimestamp(existing.created_at);
    const currentTimestamp = toTimestamp(user.created_at);

    if (currentTimestamp < existingTimestamp) {
      deduped.set(key, user);
    }
  });

  return Array.from(deduped.values());
}

export async function getTechnicians({
  fetchAll = false,
}: { fetchAll?: boolean } = {}) {
  let query = supabase.from("users").select(`
    *,
    joborders:joborders!technician_id (
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
      order_received_user:order_received (
        id,
        fullname,
        email,
        avatar
      )
    )
  `);

  query = query.eq("deleted", false).is("migrated_to", null);
  if (fetchAll) {
    query = query.order("created_at", { ascending: true });
  }

  const { data: users, error } = await query;

  if (error) {
    console.log(error);
    throw new Error("Technicians could not be fetched");
  }

  const normalizedUsers = (users || []).map(
    (user) => ({
      ...(withEffectiveUserEmail(user as UserEmailShape) ?? user),
      joborders: (user.joborders || []).map((joborder: {
        users?: unknown;
        order_received_user?: unknown;
      }) => ({
        ...joborder,
        users:
          withEffectiveUserEmail(joborder.users as UserEmailShape) ??
          joborder.users,
        order_received_user:
          withEffectiveUserEmail(joborder.order_received_user as UserEmailShape) ??
          joborder.order_received_user,
      })),
    })
  ) as TechnicianWithJobOrders[];

  return dedupeUsersByIdentity(
    normalizedUsers.filter(
      (user) => user.deleted !== true && !user.migrated_to
    )
  );
}

export async function deleteTechnician(ids: string[]) {
  const { error } = await supabase
    .from("users")
    .update({ deleted: true }) // Soft delete by marking as deleted
    .in("id", ids);

  if (error) {
    console.log(error);
    throw new Error("Technician could not be deleted");
  }
}
