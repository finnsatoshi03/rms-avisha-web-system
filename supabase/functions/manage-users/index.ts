import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type AppRole = "dev" | "admin" | "manager" | "technician";
type PrivilegedRole = "admin" | "manager";
type ManageableRole = "admin" | "manager" | "technician";

type RequestPayload = {
  action?:
    | "list_privileged_users"
    | "list_managers"
    | "create_privileged_user"
    | "update_user";
  fullname?: string;
  email?: string;
  role?: PrivilegedRole | ManageableRole;
  branch_id?: number | null;
  shared_manager?: boolean;
  password?: string;
  user_id?: string;
  deleted?: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const isManageableRole = (value: unknown): value is ManageableRole =>
  value === "admin" || value === "manager" || value === "technician";

const isPrivilegedRole = (value: unknown): value is PrivilegedRole =>
  value === "admin" || value === "manager";

const isValidBranchId = (value: unknown): value is number | null =>
  value === null || value === 1 || value === 2;

const normalizeRole = (value: unknown): AppRole => {
  if (
    value === "dev" ||
    value === "admin" ||
    value === "manager" ||
    value === "technician"
  ) {
    return value;
  }

  return "technician";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, {
      error: "Supabase environment variables are not configured.",
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user: callerAuthUser },
    error: callerAuthError,
  } = await callerClient.auth.getUser();

  if (callerAuthError || !callerAuthUser) {
    return json(401, { error: "Unauthorized." });
  }

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("users")
    .select("id, role, deleted")
    .eq("id", callerAuthUser.id)
    .single();

  if (callerProfileError || !callerProfile || callerProfile.deleted) {
    return json(403, { error: "Caller is not allowed to manage users." });
  }

  const callerRole = normalizeRole(callerProfile.role);

  if (callerRole !== "dev") {
    return json(403, { error: "Only dev accounts can manage admin/manager users." });
  }

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  const action = payload.action;

  if (action === "list_privileged_users" || action === "list_managers") {
    const { data, error } = await adminClient
      .from("users")
      .select("id, fullname, email, role, branch_id, shared_manager, deleted, created_at")
      .in("role", ["admin", "manager"])
      .order("created_at", { ascending: false });

    if (error) {
      return json(500, {
        error: `Failed to list privileged users: ${error.message}`,
      });
    }

    return json(200, {
      users: data ?? [],
      managers: data ?? [],
    });
  }

  if (action === "create_privileged_user") {
    const fullname = payload.fullname?.trim();
    const email = payload.email?.trim().toLowerCase();
    const role = payload.role;
    const password = payload.password?.trim();
    const hasProvidedPassword = Boolean(password && password.length >= 8);
    const branchId =
      typeof payload.branch_id === "number" ? payload.branch_id : null;
    const isSharedManager = payload.shared_manager === true;

    if (!fullname || fullname.length < 2) {
      return json(400, { error: "Fullname must be at least 2 characters." });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: "A valid email is required." });
    }

    if (!isPrivilegedRole(role)) {
      return json(400, {
        error: "Invalid role. Only admin and manager can be created here.",
      });
    }

    if (role === "manager" && isSharedManager && branchId !== null) {
      return json(400, {
        error: "Shared manager accounts must have branch_id = null.",
      });
    }

    if (role === "manager" && !isSharedManager && (branchId !== 1 && branchId !== 2)) {
      return json(400, {
        error: "Branch is required for manager and must be 1 or 2.",
      });
    }

    if (role === "admin" && branchId !== null) {
      return json(400, {
        error: "Admin accounts must have branch_id = null.",
      });
    }

    const temporaryPassword = hasProvidedPassword
      ? password!
      : `${crypto.randomUUID()}Aa1!`;

    const { data: createdUserData, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: false,
        user_metadata: {
          fullname,
          avatar: "",
          role,
        },
      });

    if (createUserError || !createdUserData.user) {
      return json(400, {
        error: createUserError?.message || "Unable to create auth user.",
      });
    }

    const createdUser = createdUserData.user;
    const profileSharedManager = role === "manager" && isSharedManager;
    const profileBranchId =
      role === "admin" || profileSharedManager ? null : branchId;

    const { error: insertProfileError } = await adminClient.from("users").upsert(
      {
        id: createdUser.id,
        fullname,
        email,
        role,
        branch_id: profileBranchId,
        shared_manager: profileSharedManager,
        deleted: false,
        must_change_password: true,
      },
      { onConflict: "id" }
    );

    if (insertProfileError) {
      await adminClient.auth.admin.deleteUser(createdUser.id);
      return json(500, {
        error: `Failed to create user profile: ${insertProfileError.message}`,
      });
    }

    const requestOrigin = req.headers.get("origin");
    const appUrl = (
      Deno.env.get("APP_URL") ||
      requestOrigin ||
      "https://www.rmsavisha.company"
    ).replace(/\/$/, "");
    const redirectTo = `${appUrl}/auth/callback`;

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          fullname,
          role,
          shared_manager: profileSharedManager,
          temporary_password_provided: hasProvidedPassword,
        },
        redirectTo,
      }
    );

    return json(200, {
      user_id: createdUser.id,
      email,
      role,
      branch_id: profileBranchId,
      shared_manager: profileSharedManager,
      invite_sent: !inviteError,
      invite_error: inviteError?.message ?? null,
    });
  }

  if (action === "update_user") {
    const userId = payload.user_id;
    const role = payload.role;
    const deleted = payload.deleted;
    const branchId =
      payload.branch_id === undefined ? undefined : payload.branch_id;
    const sharedManager =
      payload.shared_manager === undefined ? undefined : payload.shared_manager;

    if (!userId) {
      return json(400, { error: "user_id is required." });
    }

    if (role !== undefined && !isManageableRole(role)) {
      return json(400, {
        error: "Invalid role. Allowed roles: admin, manager, technician.",
      });
    }

    if (branchId !== undefined && !isValidBranchId(branchId)) {
      return json(400, {
        error: "Invalid branch_id. Allowed values: null, 1, 2.",
      });
    }

    if (sharedManager !== undefined && typeof sharedManager !== "boolean") {
      return json(400, {
        error: "Invalid shared_manager. Allowed values: true or false.",
      });
    }

    const { data: existingUser, error: existingUserError } = await adminClient
      .from("users")
      .select("id, email, role, branch_id, shared_manager, deleted")
      .eq("id", userId)
      .single();

    if (existingUserError || !existingUser) {
      return json(404, { error: "Target user not found." });
    }

    if (normalizeRole(existingUser.role) === "dev") {
      return json(403, { error: "Dev accounts cannot be modified." });
    }

    const nextRole = role ?? normalizeRole(existingUser.role);
    let nextBranchId =
      branchId !== undefined ? branchId : (existingUser.branch_id as number | null);
    let nextSharedManager =
      sharedManager !== undefined
        ? sharedManager
        : (existingUser.shared_manager as boolean);
    const nextDeleted =
      typeof deleted === "boolean" ? deleted : (existingUser.deleted as boolean);

    if (nextRole === "admin") {
      nextBranchId = null;
      nextSharedManager = false;
    }

    if (nextRole === "manager") {
      if (nextSharedManager) {
        nextBranchId = null;
      } else if (nextBranchId !== 1 && nextBranchId !== 2) {
        return json(400, {
          error: "Manager accounts must have branch_id = 1 or 2 when shared_manager is false.",
        });
      }
    }

    if (nextRole === "technician") {
      nextSharedManager = false;
      if (!isValidBranchId(nextBranchId)) {
        return json(400, {
          error: "Technician branch_id must be null, 1, or 2.",
        });
      }
    }

    const { data: updatedUser, error: updateError } = await adminClient
      .from("users")
      .update({
        role: nextRole,
        branch_id: nextBranchId,
        shared_manager: nextSharedManager,
        deleted: nextDeleted,
      })
      .eq("id", userId)
      .select("id, fullname, email, role, branch_id, shared_manager, deleted, created_at")
      .single();

    if (updateError || !updatedUser) {
      return json(500, { error: `Failed to update user: ${updateError?.message}` });
    }

    return json(200, { user: updatedUser });
  }

  return json(400, { error: "Unsupported action." });
});
