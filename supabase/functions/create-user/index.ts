import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type AppRole = "admin" | "manager" | "technician";

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
  value === "admin" || value === "manager" || value === "technician";

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
    .select("id, role, branch_id, deleted")
    .eq("id", caller.id)
    .single();

  if (callerProfileError || !callerProfile || callerProfile.deleted) {
    return json(403, { error: "Caller account is not allowed to create users." });
  }

  const callerRole = callerProfile.role as AppRole;
  if (callerRole !== "admin" && callerRole !== "manager") {
    return json(403, { error: "Only admins and managers can create users." });
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
  const branchId = payload.branch_id ?? null;
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

  if (branchId !== null && branchId !== 1 && branchId !== 2) {
    return json(400, { error: "Invalid branch_id. Allowed values are 1, 2, or null." });
  }

  if (callerRole === "manager") {
    if (callerProfile.branch_id !== 1 && callerProfile.branch_id !== 2) {
      return json(403, { error: "Manager account is missing a valid branch assignment." });
    }

    if (branchId !== callerProfile.branch_id) {
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
      deleted: false,
      must_change_password: true,
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
