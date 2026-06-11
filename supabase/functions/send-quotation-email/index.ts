import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildQuotationEmail } from "../_shared/email-template.ts";

type AppRole = "dev" | "admin" | "manager" | "technician";
type EmailLogStatus = "sent" | "failed";

type SendQuotationPayload = {
  quotation_id: number | string;
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  message?: string;
  pdf_base64?: string;
  pdf_filename?: string;
  force_send?: boolean;
  client_name?: string;
  quote_no?: string;
  job_order_no?: string;
  quotation_date?: string;
  total_quote?: number;
  downpayment?: number;
  branch_name?: string;
};

type QuotationLookupRow = {
  id: number;
  quote_no: string | null;
  subtotal: number | null;
  discount: number | null;
  downpayment: number | null;
  labor_rate: number | null;
  service_fee: number | null;
  total_quote: number | null;
  date_created: string | null;
  job_order_id: number | null;
  quotation_items?: Array<{
    amount?: number | null;
    total_amount?: number | null;
    qty?: number | null;
    quantity?: number | null;
    unit_price?: number | null;
    unitPrice?: number | null;
    is_manual?: boolean | null;
  }> | null;
  joborders?: {
    order_no?: string | null;
    discount?: number | null;
    downpayment?: number | null;
    branches?: {
      name?: string | null;
    } | null;
    clients?: {
      name?: string | null;
      email?: string | null;
    } | null;
  } | null;
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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const parseRecipientList = (
  value: string | string[] | null | undefined
): string[] => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizeEmail(item))
          .filter((item) => item.length > 0)
      )
    );
  }

  if (typeof value !== "string") {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/[,\n;]+/)
        .map((item) => normalizeEmail(item))
        .filter((item) => item.length > 0)
    )
  );
};

function resolveRecipientGroups(payload: SendQuotationPayload, fallbackTo?: string) {
  const to = parseRecipientList(payload.to);
  if (to.length === 0 && fallbackTo) {
    to.push(...parseRecipientList(fallbackTo));
  }

  const cc = parseRecipientList(payload.cc);
  const bcc = parseRecipientList(payload.bcc);

  if (to.length === 0) {
    return { to, cc, bcc, error: "At least one recipient is required in To." };
  }

  const invalid = [...to, ...cc, ...bcc].find((email) => !isValidEmail(email));
  if (invalid) {
    return { to, cc, bcc, error: `Invalid email address: ${invalid}` };
  }

  const seen = new Map<string, string>();
  const groups: Array<{ label: string; values: string[] }> = [
    { label: "To", values: to },
    { label: "CC", values: cc },
    { label: "BCC", values: bcc },
  ];

  for (const group of groups) {
    for (const email of group.values) {
      const existing = seen.get(email);
      if (existing && existing !== group.label) {
        return {
          to,
          cc,
          bcc,
          error: `Duplicate recipient across groups: ${email} (${existing} and ${group.label}).`,
        };
      }
      seen.set(email, group.label);
    }
  }

  return { to, cc, bcc };
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function parseEmailProviderError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return JSON.stringify(payload);
  } catch {
    try {
      return await response.text();
    } catch {
      return `Email provider returned HTTP ${response.status}`;
    }
  }
}

function toCurrencyNumber(value: number | string | null | undefined): number {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(numericValue, 0);
}

function resolveItemAmount(item: {
  amount?: number | null;
  total_amount?: number | null;
  qty?: number | null;
  quantity?: number | null;
  unit_price?: number | null;
  unitPrice?: number | null;
}): number {
  if (item.amount !== undefined && item.amount !== null) {
    return toCurrencyNumber(item.amount);
  }

  if (item.total_amount !== undefined && item.total_amount !== null) {
    return toCurrencyNumber(item.total_amount);
  }

  const qty = toCurrencyNumber(item.qty ?? item.quantity);
  const unitPrice = toCurrencyNumber(item.unit_price ?? item.unitPrice);
  return qty * unitPrice;
}

function computeQuotationGrandTotal(input: {
  subtotal: number | null;
  discount: number | null;
  downpayment: number | null;
  labor_rate: number | null;
  service_fee: number | null;
  total_quote: number | null;
  quotation_items?: QuotationLookupRow["quotation_items"];
}): number {
  const discount = toCurrencyNumber(input.discount);
  const downpayment = toCurrencyNumber(input.downpayment);
  const laborRate = toCurrencyNumber(input.labor_rate);
  const serviceFee = toCurrencyNumber(input.service_fee);
  const laborTotal = Math.max(serviceFee, laborRate);

  const items = input.quotation_items ?? [];
  let materialTotal = items.reduce((sum, item) => sum + resolveItemAmount(item), 0);

  if (items.length === 0) {
    const rawSubtotal = toCurrencyNumber(input.subtotal);
    const assumedLegacyMaterial = rawSubtotal;
    const assumedCombinedMaterial = Math.max(rawSubtotal - laborTotal, 0);
    const storedTotal = toCurrencyNumber(input.total_quote);

    const legacyGrandTotal = Math.max(assumedLegacyMaterial + laborTotal - discount, 0);
    const combinedGrandTotal = Math.max(rawSubtotal - discount, 0);
    const legacyDelta = Math.abs(storedTotal - legacyGrandTotal);
    const combinedDelta = Math.abs(storedTotal - combinedGrandTotal);

    materialTotal =
      combinedDelta < legacyDelta ? assumedCombinedMaterial : assumedLegacyMaterial;
  }

  const subtotal = laborTotal + materialTotal;
  const totalBeforeDownpayment = Math.max(subtotal - discount, 0);
  return Math.max(totalBeforeDownpayment - downpayment, 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: callerAuthError,
    } = await callerClient.auth.getUser();

    if (callerAuthError || !caller) {
      return json(401, {
        success: false,
        error: "Unauthorized. Missing or invalid authenticated session.",
        reason_code: "caller_auth_invalid",
        details: callerAuthError?.message ?? null,
      });
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("users")
      .select("id, role, deleted, migrated_to")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerProfileError) {
      return json(403, {
        success: false,
        error:
          "Caller profile lookup failed in public.users. Please contact your administrator.",
        reason_code: "caller_profile_lookup_failed",
        caller_id: caller.id,
        details: callerProfileError.message,
      });
    }

    if (!callerProfile) {
      return json(403, {
        success: false,
        error:
          "Caller account is missing in public.users. Your account must be provisioned before sending quotation emails.",
        reason_code: "caller_profile_missing",
        caller_id: caller.id,
      });
    }

    if (callerProfile.deleted) {
      return json(403, {
        success: false,
        error:
          "Caller account is marked as deleted in public.users. Please ask an administrator to restore your account.",
        reason_code: "caller_profile_deleted",
        caller_id: caller.id,
      });
    }

    if (callerProfile.migrated_to) {
      return json(403, {
        success: false,
        error:
          "Caller account has been migrated and is no longer allowed to send quotation emails. Sign in using the migrated account.",
        reason_code: "caller_profile_migrated",
        caller_id: caller.id,
        migrated_to: callerProfile.migrated_to,
      });
    }

    const callerRole = normalizeRole(callerProfile.role);
    if (
      callerRole !== "dev" &&
      callerRole !== "admin" &&
      callerRole !== "manager"
    ) {
      return json(403, {
        success: false,
        error: `Role '${callerRole}' is not allowed to send quotation emails. Allowed roles: dev, admin, manager.`,
        reason_code: "caller_role_not_allowed",
        caller_id: caller.id,
        role: callerRole,
        allowed_roles: ["dev", "admin", "manager"],
      });
    }

    const payload: SendQuotationPayload = await req.json();
    const quotationId = Number(payload.quotation_id);

    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return json(400, { error: "quotation_id must be a positive integer." });
    }

    const { data: quotationRaw, error: quotationError } = await supabaseAdmin
      .from("quotations")
      .select(
        `
        id,
        quote_no,
        subtotal,
        discount,
        downpayment,
        labor_rate,
        service_fee,
        total_quote,
        date_created,
        job_order_id,
        quotation_items (
          amount,
          total_amount,
          qty,
          quantity,
          unit_price,
          is_manual
        ),
        joborders:job_order_id (
          order_no,
          discount,
          downpayment,
          branches:branch_id (
            name
          ),
          clients:client_id (
            name,
            email
          )
        )
      `
      )
      .eq("id", quotationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (quotationError) {
      return json(500, {
        error: `Failed to load quotation: ${quotationError.message}`,
      });
    }

    if (!quotationRaw) {
      return json(404, { error: "Quotation not found." });
    }

    const quotation = quotationRaw as unknown as QuotationLookupRow;
    const resolvedClientName =
      payload.client_name?.trim() ||
      quotation.joborders?.clients?.name?.trim() ||
      "Valued Client";
    const recipientGroups = resolveRecipientGroups(
      payload,
      quotation.joborders?.clients?.email || undefined
    );
    if (recipientGroups.error) {
      return json(400, { error: recipientGroups.error });
    }

    const resolvedSubject =
      payload.subject?.trim() || "Quotation from RMS Avisha";
    const entityId = String(quotationId);
    const quoteNo =
      payload.quote_no?.trim() || quotation.quote_no?.trim() || "N/A";
    const jobOrderNo =
      payload.job_order_no?.trim() ||
      quotation.joborders?.order_no?.trim() ||
      "N/A";
    const quotationDate = formatDateLabel(
      payload.quotation_date || quotation.date_created
    );
    const resolvedDiscount =
      quotation.discount ?? quotation.joborders?.discount ?? 0;
    const resolvedDownpayment =
      payload.downpayment ??
      quotation.downpayment ??
      quotation.joborders?.downpayment ??
      0;
    const computedQuotationTotal = computeQuotationGrandTotal({
      subtotal: quotation.subtotal,
      discount: resolvedDiscount,
      downpayment: resolvedDownpayment,
      labor_rate: quotation.labor_rate,
      service_fee: quotation.service_fee,
      total_quote: quotation.total_quote,
      quotation_items: quotation.quotation_items,
    });
    const quotationTotal = Number(computedQuotationTotal);
    const branchName =
      payload.branch_name?.trim() ||
      quotation.joborders?.branches?.name?.trim() ||
      undefined;

    const createEmailLog = async ({
      status,
      sentAt,
      errorMessage,
      metadata,
    }: {
      status: EmailLogStatus;
      sentAt?: string | null;
      errorMessage?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      return await supabaseAdmin
        .from("email_logs")
        .insert({
          billing_account_id: null,
          recipient: recipientGroups.to[0],
          recipient_email: recipientGroups.to[0],
          recipient_to: recipientGroups.to,
          recipient_cc: recipientGroups.cc,
          recipient_bcc: recipientGroups.bcc,
          subject: resolvedSubject,
          type: "quotation",
          entity_type: "quotation",
          entity_id: entityId,
          status,
          sent_at: sentAt ?? null,
          error_message: errorMessage ?? null,
          metadata: {
            source: "send-quotation-email",
            quotation_id: quotationId,
            quote_no: quoteNo,
            job_order_no: jobOrderNo,
            quotation_date: quotationDate,
            computed_total_quote: computedQuotationTotal,
            stored_total_quote: quotation.total_quote,
            payload_total_quote: payload.total_quote,
            total_quote: quotationTotal,
            discount: resolvedDiscount,
            downpayment: resolvedDownpayment,
            ...(metadata ?? {}),
          },
        })
        .select("id")
        .single();
    };

    const { count: sentCount } = await supabaseAdmin
      .from("email_logs")
      .select("id", { head: true, count: "exact" })
      .eq("entity_type", "quotation")
      .eq("entity_id", entityId)
      .eq("status", "sent");

    if ((sentCount ?? 0) > 0 && !payload.force_send) {
      return json(409, {
        success: false,
        error: "This quotation has already been emailed.",
        already_sent_before: true,
        sent_count: sentCount ?? 0,
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      const failureReason = "RESEND_API_KEY not configured";
      const { data: failedLog, error: logError } = await createEmailLog({
        status: "failed",
        errorMessage: failureReason,
      });

      return json(200, {
        success: false,
        error: failureReason,
        status: "failed",
        entity_type: "quotation",
        entity_id: entityId,
        log_id: failedLog?.id ?? null,
        log_error: logError?.message ?? null,
      });
    }

    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") ||
      "RMS Avisha <billing@rmsavisha.company>";

    const emailBody: Record<string, unknown> = {
      from: fromEmail,
      to: recipientGroups.to,
      subject: resolvedSubject,
      html: buildQuotationEmail({
        clientName: resolvedClientName,
        quoteNumber: quoteNo,
        quotationDate,
        totalAmount: quotationTotal,
        branchName,
        customMessage: payload.message,
      }),
    };

    if (recipientGroups.cc.length > 0) {
      emailBody.cc = recipientGroups.cc;
    }

    if (recipientGroups.bcc.length > 0) {
      emailBody.bcc = recipientGroups.bcc;
    }

    if (payload.pdf_base64) {
      emailBody.attachments = [
        {
          filename: payload.pdf_filename || `quotation-${entityId}.pdf`,
          content: payload.pdf_base64,
        },
      ];
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    });

    if (!emailResponse.ok) {
      const providerError = await parseEmailProviderError(emailResponse);
      const failureReason = `Failed to send email: ${providerError}`;
      const { data: failedLog, error: logError } = await createEmailLog({
        status: "failed",
        errorMessage: failureReason,
        metadata: { provider_status: emailResponse.status },
      });

      return json(200, {
        success: false,
        error: failureReason,
        status: "failed",
        entity_type: "quotation",
        entity_id: entityId,
        log_id: failedLog?.id ?? null,
        log_error: logError?.message ?? null,
      });
    }

    const sentAt = new Date().toISOString();
    const { data: sentLog, error: sentLogError } = await createEmailLog({
      status: "sent",
      sentAt,
      metadata: {
        force_send: Boolean(payload.force_send),
        prior_sent_count: sentCount ?? 0,
      },
    });

    if (sentLogError) {
      return json(500, {
        success: false,
        error: "Email delivered but failed to write audit log",
        details: sentLogError.message,
        status: "sent",
        entity_type: "quotation",
        entity_id: entityId,
      });
    }

    return json(200, {
      success: true,
      email_sent: true,
      status: "sent",
      recipient_email: recipientGroups.to[0],
      recipient_to: recipientGroups.to,
      recipient_cc: recipientGroups.cc,
      recipient_bcc: recipientGroups.bcc,
      entity_type: "quotation",
      entity_id: entityId,
      sent_at: sentAt,
      log_id: sentLog.id,
      message: `Quotation sent to ${recipientGroups.to[0]}`,
    });
  } catch (error) {
    return json(500, { error: (error as Error).message });
  }
});
