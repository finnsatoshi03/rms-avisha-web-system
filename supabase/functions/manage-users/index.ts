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
    | "update_user"
    | "prepare_email_migration";
  fullname?: string;
  email?: string;
  role?: PrivilegedRole | ManageableRole;
  branch_id?: number | null;
  shared_manager?: boolean;
  password?: string;
  user_id?: string;
  deleted?: boolean;
  old_email?: string;
  new_email?: string;
  set_primary?: boolean;
  shared_manager_mode?: boolean;
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
  value === null || (typeof value === "number" && Number.isInteger(value) && value > 0);

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

const normalizeEmail = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

const isAlreadyRegisteredError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("already") &&
    (normalized.includes("registered") || normalized.includes("exists"))
  );
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
  let cachedBranchIds: Set<number> | null = null;
  const getBranchIds = async (): Promise<Set<number>> => {
    if (cachedBranchIds) {
      return cachedBranchIds;
    }

    const { data: branches, error: branchesError } = await adminClient
      .from("branches")
      .select("id");

    if (branchesError) {
      throw new Error(`Failed to load branches: ${branchesError.message}`);
    }

    cachedBranchIds = new Set(
      (branches ?? [])
        .map((branch) => branch.id)
        .filter((id): id is number => typeof id === "number")
    );

    return cachedBranchIds;
  };

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

  if (action === "prepare_email_migration") {
    const oldEmail = normalizeEmail(payload.old_email);
    const newEmail = normalizeEmail(payload.new_email);
    const setPrimary = payload.set_primary !== false;
    const requestedSharedManagerMode = payload.shared_manager_mode === true;

    if (!oldEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(oldEmail)) {
      return json(400, { error: "A valid old_email is required." });
    }

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return json(400, { error: "A valid new_email is required." });
    }

    const { data: oldMatches, error: oldUserError } = await adminClient
      .from("users")
      .select("id, email, fullname, role, branch_id, shared_manager, deleted")
      .ilike("email", oldEmail)
      .limit(2);

    if (oldUserError) {
      return json(500, {
        error: `Failed to find source account: ${oldUserError.message}`,
      });
    }

    if (!oldMatches || oldMatches.length === 0) {
      return json(404, { error: "Source account not found for old_email." });
    }

    if (oldMatches.length > 1) {
      return json(400, {
        error: "Multiple source accounts matched old_email. Use a unique email.",
      });
    }

    const sourceUser = oldMatches[0];

    if (sourceUser.deleted) {
      return json(400, { error: "Cannot migrate a deleted source account." });
    }

    let targetAuthUserId: string | null = null;
    let createdTargetAuthUser = false;

    // Reuse an existing target auth id if this email was already used by a
    // previous migration (shared manager secondary mapping).
    const { data: migratedTargets, error: migratedTargetsError } = await adminClient
      .from("users")
      .select("id")
      .ilike("migrated_email", newEmail)
      .in("migration_status", ["invited", "completed"])
      .limit(20);

    if (migratedTargetsError) {
      return json(500, {
        error: `Failed to inspect existing migration targets: ${migratedTargetsError.message}`,
      });
    }

    if (migratedTargets && migratedTargets.length > 0) {
      const migratedTargetUserIds = migratedTargets.map((row) => row.id);
      const { data: migratedTargetLinks, error: migratedTargetLinksError } =
        await adminClient
          .from("user_auth_links")
          .select("auth_user_id, user_id, is_primary")
          .in("user_id", migratedTargetUserIds);

      if (migratedTargetLinksError) {
        return json(500, {
          error:
            "Email migration support tables are unavailable. Run migration 20260315_add_user_email_migration_support.sql first.",
        });
      }

      const nonLegacyTargetLink = (migratedTargetLinks ?? [])
        .filter((link) => link.auth_user_id !== link.user_id)
        .sort((left, right) => {
          const leftRank = left.is_primary ? 0 : 1;
          const rightRank = right.is_primary ? 0 : 1;
          return leftRank - rightRank;
        })[0];

      if (nonLegacyTargetLink) {
        targetAuthUserId = nonLegacyTargetLink.auth_user_id;
      }
    }

    // If this email already exists as a primary profile email, try that id.
    if (!targetAuthUserId) {
      const { data: profileEmailMatches, error: profileEmailMatchError } =
        await adminClient
          .from("users")
          .select("id")
          .ilike("email", newEmail)
          .eq("deleted", false)
          .limit(2);

      if (profileEmailMatchError) {
        return json(500, {
          error: `Failed to inspect existing profiles for target email: ${profileEmailMatchError.message}`,
        });
      }

      if (profileEmailMatches && profileEmailMatches.length > 1) {
        return json(400, {
          error:
            "Multiple active profiles already use this target email. Please resolve duplicates first.",
        });
      }

      if (profileEmailMatches && profileEmailMatches.length === 1) {
        targetAuthUserId = profileEmailMatches[0].id;
      }
    }

    if (!targetAuthUserId) {
      const { data: createdAuthData, error: createAuthError } =
        await adminClient.auth.admin.createUser({
          email: newEmail,
          email_confirm: false,
          user_metadata: {
            fullname: sourceUser.fullname ?? "",
            role: sourceUser.role,
            migration_source_email: oldEmail,
          },
        });

      if (createAuthError || !createdAuthData.user) {
        if (isAlreadyRegisteredError(createAuthError?.message)) {
          return json(409, {
            error:
              "Target email is already registered but is not linked in migration records yet. Use a fresh email for simulation or migrate from the original source account first.",
          });
        }

        return json(400, {
          error: createAuthError?.message || "Unable to create target auth user.",
        });
      }

      targetAuthUserId = createdAuthData.user.id;
      createdTargetAuthUser = true;
    }

    if (!targetAuthUserId) {
      return json(500, {
        error: "Unable to resolve or create target auth user.",
      });
    }

    const { data: existingLinks, error: existingLinksError } = await adminClient
      .from("user_auth_links")
      .select("auth_user_id, user_id, is_primary")
      .eq("auth_user_id", targetAuthUserId);

    if (existingLinksError) {
      return json(500, {
        error:
          "Email migration support tables are unavailable. Run migration 20260315_add_user_email_migration_support.sql first.",
      });
    }

    const links = existingLinks ?? [];
    const linksOtherUsers = links.some((link) => link.user_id !== sourceUser.id);
    const isManagerSource = normalizeRole(sourceUser.role) === "manager";
    const sourceAlreadySharedManager = sourceUser.shared_manager === true;
    const sharedManagerMode =
      isManagerSource &&
      (requestedSharedManagerMode || sourceAlreadySharedManager || linksOtherUsers);

    if (linksOtherUsers && !isManagerSource) {
      return json(400, {
        error:
          "Target email is already linked to another account. Only manager accounts can share a target login.",
      });
    }

    if (createdTargetAuthUser && targetAuthUserId !== sourceUser.id) {
      const { data: targetShadowProfile } = await adminClient
        .from("users")
        .select("id")
        .eq("id", targetAuthUserId)
        .maybeSingle();

      const shadowProfileIsLinked = links.some(
        (link) => link.user_id === targetAuthUserId
      );

      if (targetShadowProfile && !shadowProfileIsLinked) {
        await adminClient.from("users").delete().eq("id", targetAuthUserId);
      }
    }

    const { error: ensureLegacyLinkError } = await adminClient
      .from("user_auth_links")
      .upsert(
        {
          auth_user_id: sourceUser.id,
          user_id: sourceUser.id,
          is_primary: true,
        },
        { onConflict: "auth_user_id,user_id" }
      );

    if (ensureLegacyLinkError) {
      return json(500, {
        error: `Failed to ensure legacy auth link: ${ensureLegacyLinkError.message}`,
      });
    }

    if (setPrimary) {
      const { error: clearPrimaryError } = await adminClient
        .from("user_auth_links")
        .update({ is_primary: false })
        .eq("auth_user_id", targetAuthUserId);

      if (clearPrimaryError) {
        return json(500, {
          error: `Failed to update target auth links: ${clearPrimaryError.message}`,
        });
      }
    }

    const { error: upsertLinkError } = await adminClient
      .from("user_auth_links")
      .upsert(
        {
          auth_user_id: targetAuthUserId,
          user_id: sourceUser.id,
          is_primary: setPrimary,
        },
        { onConflict: "auth_user_id,user_id" }
      );

    if (upsertLinkError) {
      return json(500, {
        error: `Failed to link target auth user to source profile: ${upsertLinkError.message}`,
      });
    }

    const updatePayload: Record<string, unknown> = {
      migrated_email: newEmail,
      migration_status: "invited",
      migration_completed_at: null,
      must_change_password: true,
    };

    if (isManagerSource && sharedManagerMode) {
      updatePayload.shared_manager = true;
      updatePayload.branch_id = null;
    }

    const { error: updateMigrationStateError } = await adminClient
      .from("users")
      .update(updatePayload)
      .eq("id", sourceUser.id);

    if (updateMigrationStateError) {
      return json(500, {
        error: `Failed to update migration status: ${updateMigrationStateError.message}`,
      });
    }

    if (sharedManagerMode) {
      const { data: linkedUsers, error: linkedUsersError } = await adminClient
        .from("user_auth_links")
        .select("user_id")
        .eq("auth_user_id", targetAuthUserId);

      if (linkedUsersError) {
        return json(500, {
          error: `Failed to inspect linked users for shared manager sync: ${linkedUsersError.message}`,
        });
      }

      const linkedUserIds = Array.from(
        new Set(
          (linkedUsers ?? [])
            .map((link) => link.user_id)
            .filter((userId): userId is string => typeof userId === "string")
        )
      );

      if (linkedUserIds.length > 0) {
        const { error: syncSharedManagersError } = await adminClient
          .from("users")
          .update({ shared_manager: true, branch_id: null })
          .in("id", linkedUserIds)
          .eq("role", "manager")
          .eq("deleted", false);

        if (syncSharedManagersError) {
          return json(500, {
            error: `Failed to sync shared manager profiles: ${syncSharedManagersError.message}`,
          });
        }
      }
    }

    const requestOrigin = req.headers.get("origin");
    const appUrl = (
      Deno.env.get("APP_URL") ||
      requestOrigin ||
      "https://www.rmsavisha.company"
    ).replace(/\/$/, "");
    const redirectTo = `${appUrl}/auth/callback`;

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      newEmail,
      {
        data: {
          fullname: sourceUser.fullname ?? "",
          role: sourceUser.role,
          migration_source_email: oldEmail,
          migration_target_email: newEmail,
        },
        redirectTo,
      }
    );

    return json(200, {
      old_user_id: sourceUser.id,
      old_email: oldEmail,
      new_email: newEmail,
      new_auth_user_id: targetAuthUserId,
      created_target_auth_user: createdTargetAuthUser,
      shared_manager_mode: sharedManagerMode,
      migration_status: "invited",
      invite_sent: !inviteError,
      invite_error: inviteError?.message ?? null,
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

    if (branchId !== null && !isValidBranchId(branchId)) {
      return json(400, {
        error: "Invalid branch_id. Allowed values: null or a positive integer.",
      });
    }

    let availableBranchIds: Set<number>;
    try {
      availableBranchIds = await getBranchIds();
    } catch (error) {
      return json(500, {
        error: error instanceof Error ? error.message : "Failed to validate branch_id.",
      });
    }

    if (role === "manager" && isSharedManager && branchId !== null) {
      return json(400, {
        error: "Shared manager accounts must have branch_id = null.",
      });
    }

    if (role === "manager" && !isSharedManager && branchId === null) {
      return json(400, {
        error: "Branch is required for non-shared manager accounts.",
      });
    }

    if (
      role === "manager" &&
      !isSharedManager &&
      branchId !== null &&
      !availableBranchIds.has(branchId)
    ) {
      return json(400, {
        error: "Invalid branch_id. Branch does not exist.",
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
        migrated_email: null,
        migration_status: "completed",
        migration_completed_at: new Date().toISOString(),
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
        error: "Invalid branch_id. Allowed values: null or a positive integer.",
      });
    }

    let availableBranchIds: Set<number>;
    try {
      availableBranchIds = await getBranchIds();
    } catch (error) {
      return json(500, {
        error: error instanceof Error ? error.message : "Failed to validate branch_id.",
      });
    }

    if (
      branchId !== undefined &&
      branchId !== null &&
      !availableBranchIds.has(branchId)
    ) {
      return json(400, {
        error: "Invalid branch_id. Branch does not exist.",
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
      } else if (
        nextBranchId === null ||
        !isValidBranchId(nextBranchId) ||
        !availableBranchIds.has(nextBranchId)
      ) {
        return json(400, {
          error:
            "Manager accounts must have a valid existing branch_id when shared_manager is false.",
        });
      }
    }

    if (nextRole === "technician") {
      nextSharedManager = false;
      if (
        !isValidBranchId(nextBranchId) ||
        (nextBranchId !== null && !availableBranchIds.has(nextBranchId))
      ) {
        return json(400, {
          error: "Technician branch_id must be null or an existing branch id.",
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
