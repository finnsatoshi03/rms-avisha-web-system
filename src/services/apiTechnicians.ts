import { supabase } from "./supabase";
import { withEffectiveUserEmail } from "../lib/effective-user-email";

type UserEmailShape = {
  email?: string | null;
  migrated_email?: string | null;
};

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

  // Add condition to check for non-deleted users
  if (!fetchAll) {
    query = query.eq("deleted", false);
  }

  const { data: users, error } = await query;

  if (error) {
    console.log(error);
    throw new Error("Technicians could not be fetched");
  }

  return (users || []).map((user) => ({
    ...(withEffectiveUserEmail(user as UserEmailShape) ?? user),
    joborders: (user.joborders || []).map(
      (joborder: { users?: unknown; order_received_user?: unknown }) => ({
      ...joborder,
      users:
        withEffectiveUserEmail(joborder.users as UserEmailShape) ??
        joborder.users,
      order_received_user:
        withEffectiveUserEmail(joborder.order_received_user as UserEmailShape) ??
        joborder.order_received_user,
      })
    ),
  }));
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
