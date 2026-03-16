import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type AppRole = "dev" | "admin" | "manager" | "technician";

type CreateUserPayload = {
  fullname?: string;
  email?: string;
  password?: string;
  role?: AppRole;
  branch_id?: number | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const isValidRole = (value: unknown): value is AppRole =>
  value === "dev" ||
  value === "admin" ||
  value === "manager" ||
  value === "technician";

const isValidBranchId = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

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
    return json(500, { error: "Supabase environment variables are not configured." });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user: caller },
    error: callerAuthError,
  } = await callerClient.auth.getUser();

  if (callerAuthError || !caller) {
    return json(401, { error: "Unauthorized." });
  }

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("users")
    .select("id, role, branch_id, shared_manager, deleted, migrated_to")
    .eq("id", caller.id)
    .single();

  if (
    callerProfileError ||
    !callerProfile ||
    callerProfile.deleted ||
    callerProfile.migrated_to
  ) {
    return json(403, { error: "Caller account is not allowed to create users." });
  }

  const callerRole = normalizeRole(callerProfile.role);

  if (callerRole !== "dev" && callerRole !== "admin" && callerRole !== "manager") {
    return json(403, {
      error: "Only dev, admin, and manager accounts can create users.",
    });
  }

  let payload: CreateUserPayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  const fullname = payload.fullname?.trim();
  const email = payload.email?.trim().toLowerCase();
  const role = payload.role;
  const branchId =
    payload.branch_id === undefined ? null : payload.branch_id;
  const password = payload.password?.trim();
  const hasProvidedPassword = Boolean(password && password.length >= 8);

  if (!fullname || fullname.length < 2) {
    return json(400, { error: "Fullname must be at least 2 characters." });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "A valid email is required." });
  }

  if (!isValidRole(role) || role !== "technician") {
    return json(400, { error: "Only technician accounts can be created in this flow." });
  }

  if (branchId !== null && !isValidBranchId(branchId)) {
    return json(400, {
      error: "Invalid branch_id. Allowed values are null or a positive integer.",
    });
  }

  const { data: branchRows, error: branchError } = await adminClient
    .from("branches")
    .select("id");

  if (branchError) {
    return json(500, { error: `Failed to validate branches: ${branchError.message}` });
  }

  const availableBranchIds = new Set(
    (branchRows ?? [])
      .map((branch) => branch.id)
      .filter((id): id is number => typeof id === "number")
  );

  if (branchId !== null && !availableBranchIds.has(branchId)) {
    return json(400, { error: "Invalid branch_id. Branch does not exist." });
  }

  if (callerRole === "manager") {
    const isSharedManager = callerProfile.shared_manager === true;
    const callerBranchId = isValidBranchId(callerProfile.branch_id)
      ? callerProfile.branch_id
      : null;

    if (branchId === null) {
      return json(403, {
        error: "Managers must assign a branch when creating technician accounts.",
      });
    }

    if (!isSharedManager && callerBranchId === null) {
      return json(403, { error: "Manager account is missing a valid branch assignment." });
    }

    if (!isSharedManager && branchId !== callerBranchId) {
      return json(403, {
        error: "Managers can only create technician accounts for their own branch.",
      });
    }
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
        role: "technician",
      },
    });

  if (createUserError || !createdUserData.user) {
    return json(400, { error: createUserError?.message || "Unable to create auth user." });
  }

  const createdUser = createdUserData.user;

  const { error: insertProfileError } = await adminClient.from("users").upsert(
    {
      id: createdUser.id,
      fullname,
      email,
      role: "technician",
      branch_id: branchId,
      shared_manager: false,
      deleted: false,
      migrated_to: null,
      must_change_password: true,
      migrated_email: null,
      migration_status: "completed",
      migration_completed_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (insertProfileError) {
    await adminClient.auth.admin.deleteUser(createdUser.id);
    return json(500, { error: `Failed to create user profile: ${insertProfileError.message}` });
  }

  const requestOrigin = req.headers.get("origin");
  const appUrl = (Deno.env.get("APP_URL") || requestOrigin || "https://www.rmsavisha.company").replace(
    /\/$/,
    ""
  );
  const redirectTo = `${appUrl}/auth/callback`;

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      fullname,
      temporary_password_provided: hasProvidedPassword,
      setup_instruction: hasProvidedPassword
        ? "Use the temporary password provided by your admin, then set a new password after first login."
        : "Open this invite link to activate your account and set your password.",
    },
    redirectTo,
  });

  return json(200, {
    user_id: createdUser.id,
    email,
    role: "technician",
    branch_id: branchId,
    must_change_password: true,
    temporary_password_provided: hasProvidedPassword,
    invite_sent: !inviteError,
    invite_error: inviteError?.message ?? null,
  });
});
