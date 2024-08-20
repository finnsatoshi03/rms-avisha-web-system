import { supabase } from "./supabase";

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

  return users;
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
