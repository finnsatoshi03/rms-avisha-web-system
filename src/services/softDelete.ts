import { supabase } from "./supabase";

export const ACTIVE_RECORD_FILTER = { deleted_at: null as string | null };

export const RESTORE_SOFT_DELETE_UPDATE = {
  deleted_at: null,
  deleted_by: null,
};

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function buildSoftDeleteUpdate() {
  return {
    deleted_at: new Date().toISOString(),
    deleted_by: await getCurrentUserId(),
  };
}
