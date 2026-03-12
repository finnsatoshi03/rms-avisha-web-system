import { supabase } from "./supabase";

export type PrivilegedRole = "admin" | "manager";
export type ManageableRole = "admin" | "manager" | "technician";

export type ManagedUserRecord = {
  id: string;
  fullname: string | null;
  email: string | null;
  role: ManageableRole;
  branch_id: number | null;
  deleted: boolean;
  created_at: string | null;
};

type FunctionError = {
  error?: string;
};

async function invokeManageUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  const functionError = data as FunctionError | null;
  if (functionError?.error) {
    throw new Error(functionError.error);
  }

  return data as T;
}

export async function getPrivilegedUsers(): Promise<ManagedUserRecord[]> {
  const result = await invokeManageUsers<{
    users?: ManagedUserRecord[];
    managers?: ManagedUserRecord[];
  }>({
    action: "list_privileged_users",
  });

  return result.users || result.managers || [];
}

export async function createPrivilegedUser({
  fullname,
  email,
  role,
  branch_id,
  password,
}: {
  fullname: string;
  email: string;
  role: PrivilegedRole;
  branch_id: number | null;
  password?: string;
}) {
  return invokeManageUsers<{
    user_id: string;
    role: PrivilegedRole;
    email: string;
    branch_id: number | null;
    invite_sent: boolean;
    invite_error: string | null;
  }>({
    action: "create_privileged_user",
    fullname,
    email,
    role,
    branch_id,
    password: password?.trim() ? password : undefined,
  });
}

export async function updateManagedUser({
  user_id,
  role,
  branch_id,
  deleted,
}: {
  user_id: string;
  role?: ManageableRole;
  branch_id?: number | null;
  deleted?: boolean;
}) {
  return invokeManageUsers<{
    user: ManagedUserRecord;
  }>({
    action: "update_user",
    user_id,
    role,
    branch_id,
    deleted,
  });
}
