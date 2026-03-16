import { User as SupabaseAuthUser, UserAttributes } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AppUserRole = "dev" | "admin" | "manager" | "technician";
export type MigrationStatus = "pending" | "invited" | "completed";

type UserProfileRow = {
  id: string;
  email: string | null;
  fullname: string | null;
  avatar: string | null;
  role: AppUserRole;
  branch_id: number | null;
  shared_manager: boolean;
  deleted: boolean;
  migrated_to: string | null;
  must_change_password: boolean;
  migrated_email: string | null;
  migration_status: MigrationStatus;
  migration_completed_at: string | null;
  created_at: string | null;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppUserRole;
  branch_id: number | null;
  shared_manager: boolean;
  deleted: boolean;
  migrated_to: string | null;
  must_change_password: boolean;
  migrated_email: string | null;
  migration_status: MigrationStatus;
  migration_completed_at: string | null;
  migration_notice_required: boolean;
  fullname: string | null;
  avatar: string | null;
  created_at: string | null;
  user_metadata: {
    fullname: string | null;
    avatar: string | null;
    role: AppUserRole;
  };
  auth_user: SupabaseAuthUser;
};

const VALID_ROLES = new Set<AppUserRole>([
  "dev",
  "admin",
  "manager",
  "technician",
]);

function normalizeRole(role: string | null): AppUserRole {
  if (role && VALID_ROLES.has(role as AppUserRole)) {
    return role as AppUserRole;
  }
  return "technician";
}

function normalizeMigrationStatus(status: string | null): MigrationStatus {
  if (status === "invited" || status === "completed") {
    return status;
  }
  return "pending";
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function normalizeProfileRow(
  data: Omit<UserProfileRow, "role" | "shared_manager" | "migration_status"> & {
    role: string | null;
    shared_manager: unknown;
    migration_status: string | null;
  }
): UserProfileRow {
  return {
    ...data,
    role: normalizeRole(data.role),
    shared_manager: Boolean(data.shared_manager),
    migrated_to: data.migrated_to ?? null,
    migration_status: normalizeMigrationStatus(data.migration_status),
    migrated_email: normalizeEmail(data.migrated_email),
  };
}

function isUsingMigratedEmail(
  authUser: SupabaseAuthUser,
  profile: UserProfileRow
): boolean {
  const authEmail = normalizeEmail(authUser.email);
  const migratedEmail = normalizeEmail(profile.migrated_email);
  return Boolean(authEmail && migratedEmail && authEmail === migratedEmail);
}

function shouldBlockLegacyLogin(
  authUser: SupabaseAuthUser,
  profile: UserProfileRow
): boolean {
  const migratedEmail = normalizeEmail(profile.migrated_email);
  if (!migratedEmail) {
    return false;
  }

  const authEmail = normalizeEmail(authUser.email);
  return authEmail !== migratedEmail;
}

function isLegacyProfile(profile: UserProfileRow): boolean {
  return Boolean(profile.migrated_to);
}

function buildCurrentUser(
  authUser: SupabaseAuthUser,
  profile: UserProfileRow
): CurrentUser {
  const role = normalizeRole(profile.role);
  const migrationNoticeRequired =
    Boolean(profile.migrated_email) &&
    profile.migration_status !== "completed" &&
    !isUsingMigratedEmail(authUser, profile);

  return {
    id: profile.id,
    email: authUser.email ?? profile.email ?? null,
    role,
    branch_id: profile.branch_id,
    shared_manager: Boolean(profile.shared_manager),
    deleted: profile.deleted,
    migrated_to: profile.migrated_to,
    must_change_password: profile.must_change_password,
    migrated_email: profile.migrated_email,
    migration_status: profile.migration_status,
    migration_completed_at: profile.migration_completed_at,
    migration_notice_required: migrationNoticeRequired,
    fullname: profile.fullname,
    avatar: profile.avatar,
    created_at: profile.created_at,
    user_metadata: {
      fullname: profile.fullname,
      avatar: profile.avatar,
      role,
    },
    auth_user: authUser,
  };
}

async function getProfileById(userId: string): Promise<UserProfileRow> {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, fullname, avatar, role, branch_id, shared_manager, deleted, migrated_to, must_change_password, migrated_email, migration_status, migration_completed_at, created_at"
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("User profile not found");
  }

  return normalizeProfileRow(data);
}

async function resolveProfileByAuthId(authUserId: string): Promise<UserProfileRow> {
  const { data, error } = await supabase.rpc("resolve_user_profile_for_auth", {
    p_auth_user_id: authUserId,
  });

  const resolved = Array.isArray(data) ? data[0] : data;
  if (!error && resolved) {
    return normalizeProfileRow(resolved);
  }

  return getProfileById(authUserId);
}

async function markMigrationCompletedForAuth(authUserId: string) {
  const { error } = await supabase.rpc("mark_migration_completed_for_auth", {
    p_auth_user_id: authUserId,
  });

  if (error) {
    console.error("Failed to mark migration as completed:", error.message);
  }
}

export async function signup({
  fullname,
  email,
  password,
  role,
  branchId,
}: {
  fullname: string;
  email: string;
  password?: string;
  role: AppUserRole;
  branchId: number | null;
}): Promise<{
  invite_sent?: boolean;
  invite_error?: string | null;
  must_change_password?: boolean;
  temporary_password_provided?: boolean;
}> {
  // Save creator session before creating another account.
  const { data: savedSessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error saving current session:", sessionError);
    throw new Error("Unable to save current session.");
  }

  try {
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        fullname,
        email,
        password: password?.trim() ? password : undefined,
        role,
        branch_id: branchId,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  } finally {
    // Keep creator logged in.
    if (savedSessionData?.session) {
      const { error: restoreError } = await supabase.auth.setSession(
        savedSessionData.session
      );

      if (restoreError) {
        console.error("Error restoring previous session:", restoreError);
      }
    }
  }
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error(
      "Email not verified. Please verify your email before signing in."
    );
  }

  await markMigrationCompletedForAuth(authData.user.id);
  const profile = await resolveProfileByAuthId(authData.user.id);

  if (isLegacyProfile(profile)) {
    await supabase.auth.signOut();
    throw new Error(
      "This account has been migrated to a new profile. Please use the active account."
    );
  }

  if (shouldBlockLegacyLogin(authData.user, profile)) {
    await supabase.auth.signOut();
    throw new Error(
      `This legacy email is no longer active. Sign in using ${profile.migrated_email}.`
    );
  }

  if (profile.deleted) {
    await supabase.auth.signOut();
    throw new Error(
      "This account has been deactivated. Please contact support for more information."
    );
  }

  return { user: buildCurrentUser(authData.user, profile) };
}

export async function getCurrentUser() {
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session) return null;

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.user) return null;
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return null;
  }

  try {
    await markMigrationCompletedForAuth(data.user.id);
    const profile = await resolveProfileByAuthId(data.user.id);

    if (isLegacyProfile(profile)) {
      await supabase.auth.signOut();
      return null;
    }

    if (shouldBlockLegacyLogin(data.user, profile)) {
      await supabase.auth.signOut();
      return null;
    }

    if (profile.deleted) {
      await supabase.auth.signOut();
      return null;
    }

    return buildCurrentUser(data.user, profile);
  } catch {
    await supabase.auth.signOut();
    return null;
  }
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function updateUser({
  password,
  fullname,
  avatar,
}: {
  password: string;
  fullname: string;
  avatar?: File | null;
}) {
  const {
    data: { user: authUser },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !authUser) {
    throw new Error("Unable to load current user.");
  }

  const profile = await resolveProfileByAuthId(authUser.id);

  const updateData: UserAttributes = {};
  if (password) updateData.password = password;
  if (fullname) updateData.data = { fullname };

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase.auth.updateUser(updateData);
    if (error) throw new Error(error.message);
  }

  if (password) {
    const { error: profileError } = await supabase
      .from("users")
      .update({ must_change_password: false })
      .eq("id", profile.id);

    if (profileError) throw new Error(profileError.message);
  }

  if (fullname) {
    const { error: profileError } = await supabase
      .from("users")
      .update({ fullname })
      .eq("id", profile.id);

    if (profileError) throw new Error(profileError.message);
  }

  if (avatar) {
    const filename = `avatar-${authUser.id}-${Math.random()}`;

    const { error: storageError } = await supabase.storage
      .from("avatars")
      .upload(filename, avatar);

    if (storageError) throw new Error(storageError.message);

    const avatarUrl = `${
      import.meta.env.VITE_SUPABASE_URL
    }/storage/v1/object/public/avatars/${filename}`;

    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: { avatar: avatarUrl },
    });

    if (authUpdateError) throw new Error(authUpdateError.message);

    const { error: profileError } = await supabase
      .from("users")
      .update({ avatar: avatarUrl })
      .eq("id", profile.id);

    if (profileError) throw new Error(profileError.message);
  }

  return getCurrentUser();
}

export async function updatePassword({
  currentPassword,
  newPassword,
  userId,
}: {
  currentPassword: string;
  newPassword: string;
  userId: string;
}) {
  void userId;

  const {
    data: { user: authUser },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !authUser) {
    throw new Error("Unable to load current user.");
  }

  const profile = await resolveProfileByAuthId(authUser.id);

  const { data, error } = await supabase.rpc("update_password", {
    current_plain_password: currentPassword,
    new_plain_password: newPassword,
    current_id: authUser.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data === "incorrect") {
    throw new Error("Current password is incorrect");
  }

  if (data === "success") {
    const { error: profileError } = await supabase
      .from("users")
      .update({ must_change_password: false })
      .eq("id", profile.id);

    if (profileError) {
      throw new Error(profileError.message);
    }

    return { success: true };
  }

  throw new Error("Failed to update password");
}

export async function setInitialPassword({
  password,
}: {
  password: string;
}) {
  const {
    data: { user: authUser },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !authUser) {
    throw new Error("Unable to load current user.");
  }

  const profile = await resolveProfileByAuthId(authUser.id);

  const { error: authUpdateError } = await supabase.auth.updateUser({
    password,
  });

  if (authUpdateError) {
    throw new Error(authUpdateError.message);
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ must_change_password: false })
    .eq("id", profile.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return getCurrentUser();
}

export async function requestPasswordReset({ email }: { email: string }) {
  const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(
    /\/$/,
    ""
  );

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?flow=recovery`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}
