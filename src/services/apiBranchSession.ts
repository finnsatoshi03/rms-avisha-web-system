import { supabase } from "./supabase";

// The active branch is keyed on the auth login rather than the user profile:
// shared manager accounts are signed in from several branches at once, and a
// profile-keyed row would let one branch overwrite another's selection.
async function getAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.id) {
    throw new Error("Unable to resolve the signed-in user.");
  }

  return data.user.id;
}

export async function persistActiveBranchSelection(
  userId: string,
  branchId: number
): Promise<void> {
  const authUserId = await getAuthUserId();

  const { error } = await supabase.from("user_active_branch_selections").upsert(
    { auth_user_id: authUserId, user_id: userId, branch_id: branchId },
    { onConflict: "auth_user_id" }
  );

  if (error) {
    throw new Error("Failed to save active branch selection: " + error.message);
  }
}

export async function clearActiveBranchSelectionRemote(
  userId: string
): Promise<void> {
  const authUserId = await getAuthUserId();

  const { error } = await supabase
    .from("user_active_branch_selections")
    .delete()
    .eq("auth_user_id", authUserId)
    .eq("user_id", userId);

  if (error) {
    throw new Error("Failed to clear active branch selection: " + error.message);
  }
}
