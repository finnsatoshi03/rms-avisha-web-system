import { supabase } from "./supabase";

export async function persistActiveBranchSelection(
  userId: string,
  branchId: number
): Promise<void> {
  const { error } = await supabase
    .from("user_active_branch_selections")
    .upsert({ user_id: userId, branch_id: branchId }, { onConflict: "user_id" });

  if (error) {
    throw new Error("Failed to save active branch selection: " + error.message);
  }
}

export async function clearActiveBranchSelectionRemote(
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_active_branch_selections")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error("Failed to clear active branch selection: " + error.message);
  }
}
