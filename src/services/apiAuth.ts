import { User as SupabaseAuthUser, UserAttributes } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AppUserRole = "dev" | "admin" | "manager" | "technician";

type UserProfileRow = {
  id: string;
  email: string | null;
  fullname: string | null;
  avatar: string | null;
  role: AppUserRole;
  branch_id: number | null;
  deleted: boolean;
  must_change_password: boolean;
  created_at: string | null;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppUserRole;
  branch_id: number | null;
  deleted: boolean;
  must_change_password: boolean;
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

function buildCurrentUser(
  authUser: SupabaseAuthUser,
  profile: UserProfileRow
): CurrentUser {
  const role = normalizeRole(profile.role);

  return {
    id: authUser.id,
    email: authUser.email ?? profile.email ?? null,
    role,
    branch_id: profile.branch_id,
    deleted: profile.deleted,
    must_change_password: profile.must_change_password,
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
      "id, email, fullname, avatar, role, branch_id, deleted, must_change_password, created_at"
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("User profile not found");
  }

  return {
    ...data,
    role: normalizeRole(data.role),
  } as UserProfileRow;
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

  const profile = await getProfileById(authData.user.id);
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
    const profile = await getProfileById(data.user.id);
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
      .eq("id", authUser.id);

    if (profileError) throw new Error(profileError.message);
  }

  if (fullname) {
    const { error: profileError } = await supabase
      .from("users")
      .update({ fullname })
      .eq("id", authUser.id);

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
      .eq("id", authUser.id);

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
  const { data, error } = await supabase.rpc("update_password", {
    current_plain_password: currentPassword,
    new_plain_password: newPassword,
    current_id: userId,
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
      .eq("id", userId);

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

  const { error: authUpdateError } = await supabase.auth.updateUser({
    password,
  });

  if (authUpdateError) {
    throw new Error(authUpdateError.message);
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ must_change_password: false })
    .eq("id", authUser.id);

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
