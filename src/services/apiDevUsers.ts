import { supabase } from "./supabase";

export type PrivilegedRole = "admin" | "manager";
export type ManageableRole = "admin" | "manager" | "technician";

export type ManagedUserRecord = {
  id: string;
  fullname: string | null;
  email: string | null;
  role: ManageableRole;
  branch_id: number | null;
  shared_manager: boolean;
  deleted: boolean;
  migrated_to?: string | null;
  created_at: string | null;
};

type FunctionError = {
  error?: string;
};

type FunctionErrorResponse = {
  error?: string;
  message?: string;
};

type ErrorWithContext = Error & {
  context?: unknown;
};

async function resolveFunctionInvokeError(error: unknown): Promise<string> {
  if (!(error instanceof Error)) {
    return "Failed to call manage-users function.";
  }

  const context = (error as ErrorWithContext).context;
  if (context instanceof Response) {
    try {
      const contentType = context.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const parsed = (await context
          .clone()
          .json()) as FunctionErrorResponse | null;
        if (typeof parsed?.error === "string" && parsed.error.trim()) {
          return parsed.error.trim();
        }
        if (typeof parsed?.message === "string" && parsed.message.trim()) {
          return parsed.message.trim();
        }
      } else {
        const text = (await context.clone().text()).trim();
        if (text) {
          return text;
        }
      }
    } catch {
      // Fall back to status/message below when response parsing fails.
    }

    return `Manage-users request failed (HTTP ${context.status}).`;
  }

  return error.message || "Failed to call manage-users function.";
}

async function invokeManageUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body,
  });

  if (error) {
    throw new Error(await resolveFunctionInvokeError(error));
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
  shared_manager,
  password,
}: {
  fullname: string;
  email: string;
  role: PrivilegedRole;
  branch_id: number | null;
  shared_manager?: boolean;
  password?: string;
}) {
  return invokeManageUsers<{
    user_id: string;
    role: PrivilegedRole;
    email: string;
    branch_id: number | null;
    shared_manager: boolean;
    invite_sent: boolean;
    invite_error: string | null;
  }>({
    action: "create_privileged_user",
    fullname,
    email,
    role,
    branch_id,
    shared_manager: Boolean(shared_manager),
    password: password?.trim() ? password : undefined,
  });
}

export async function updateManagedUser({
  user_id,
  role,
  branch_id,
  shared_manager,
  deleted,
}: {
  user_id: string;
  role?: ManageableRole;
  branch_id?: number | null;
  shared_manager?: boolean;
  deleted?: boolean;
}) {
  return invokeManageUsers<{
    user: ManagedUserRecord;
  }>({
    action: "update_user",
    user_id,
    role,
    branch_id,
    shared_manager,
    deleted,
  });
}

export async function prepareEmailMigration({
  old_email,
  new_email,
  set_primary,
  shared_manager_mode,
}: {
  old_email: string;
  new_email: string;
  set_primary?: boolean;
  shared_manager_mode?: boolean;
}) {
  return invokeManageUsers<{
    old_user_id: string;
    old_email: string;
    new_email: string;
    new_auth_user_id: string;
    created_target_auth_user: boolean;
    shared_manager_mode: boolean;
    migration_status: "invited";
    invite_sent: boolean;
    invite_error: string | null;
  }>({
    action: "prepare_email_migration",
    old_email,
    new_email,
    set_primary,
    shared_manager_mode,
  });
}
