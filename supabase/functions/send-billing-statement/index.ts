import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildStatementEmail } from "../_shared/email-template.ts";

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

type SendStatementPayload = {
  statement_id: string;
  to_email: string;
  client_name?: string;
  billing_account_id?: string;
  account_number: string;
  statement_number: string;
  period: string;
  previous_balance?: number;
  new_charges?: number;
  interest_applied?: number;
  payments_received?: number;
  balance_due: number;
  due_date: string;
  pdf_base64?: string;
  pdf_filename?: string;
};

type StatementEmailLogStatus = "sent" | "failed";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: SendStatementPayload = await req.json();
    const {
      statement_id,
      to_email,
      billing_account_id,
      account_number,
      statement_number,
      period,
      balance_due,
      due_date,
    } = payload;

    if (!statement_id || !to_email) {
      return json(400, { error: "statement_id and to_email are required" });
    }

    const normalizedRecipient = to_email.trim().toLowerCase();
    const subject = `Statement of Account - ${account_number} - ${period}`;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Resolve billing_account_id from statement when not passed in payload.
    let resolvedBillingAccountId: string | null = billing_account_id ?? null;
    if (!resolvedBillingAccountId) {
      const { data: statementRow, error: statementLookupError } = await supabaseAdmin
        .from("billing_statements")
        .select("billing_account_id")
        .eq("id", statement_id)
        .maybeSingle();

      if (!statementLookupError) {
        resolvedBillingAccountId = statementRow?.billing_account_id ?? null;
      }
    }

    const createEmailLog = async ({
      status,
      sentAt,
      errorMessage,
      metadata,
    }: {
      status: StatementEmailLogStatus;
      sentAt?: string | null;
      errorMessage?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      return await supabaseAdmin
        .from("email_logs")
        .insert({
          billing_account_id: resolvedBillingAccountId,
          recipient: normalizedRecipient,
          recipient_email: normalizedRecipient,
          subject,
          type: "statement",
          entity_type: "billing_statement",
          entity_id: statement_id,
          status,
          sent_at: sentAt ?? null,
          error_message: errorMessage ?? null,
          metadata: {
            source: "send-billing-statement",
            statement_id,
            statement_number,
            account_number,
            period,
            balance_due,
            due_date,
            ...(metadata ?? {}),
          },
        })
        .select("id")
        .single();
    };

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
        email_sent: false,
        recipient_email: normalizedRecipient,
        entity_type: "billing_statement",
        entity_id: statement_id,
        log_id: failedLog?.id ?? null,
        log_error: logError?.message ?? null,
      });
    }

    // Build email body
    const emailBody: Record<string, unknown> = {
      from: "RMS Avisha <billing@rmsavisha.company>",
      to: [normalizedRecipient],
      subject,
      html: buildStatementEmail({
        clientName: payload.client_name || "Valued Client",
        accountNumber: account_number,
        statementNumber: statement_number,
        period,
        previousBalance: payload.previous_balance ?? 0,
        newCharges: payload.new_charges ?? balance_due,
        interestApplied: payload.interest_applied ?? 0,
        paymentsReceived: payload.payments_received ?? 0,
        totalDue: balance_due,
        dueDate: due_date,
      }),
    };

    // Attach PDF if provided
    if (payload.pdf_base64) {
      emailBody.attachments = [
        {
          filename: payload.pdf_filename || `${statement_number}.pdf`,
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
        metadata: {
          provider_status: emailResponse.status,
        },
      });

      return json(200, {
        success: false,
        error: failureReason,
        status: "failed",
        email_sent: false,
        recipient_email: normalizedRecipient,
        entity_type: "billing_statement",
        entity_id: statement_id,
        log_id: failedLog?.id ?? null,
        log_error: logError?.message ?? null,
      });
    }

    const sentAt = new Date().toISOString();

    // Update statement only after confirmed delivery attempt success.
    const { error: updateError } = await supabaseAdmin
      .from("billing_statements")
      .update({
        status: "sent",
        sent_at: sentAt,
      })
      .eq("id", statement_id);

    const { data: sentLog, error: sentLogError } = await createEmailLog({
      status: "sent",
      sentAt,
      errorMessage: updateError
        ? `Email delivered but failed to update statement status: ${updateError.message}`
        : null,
    });

    if (updateError) {
      return json(500, {
        success: false,
        error: "Email delivered but failed to update statement status",
        details: updateError.message,
        email_sent: true,
        recipient_email: normalizedRecipient,
        entity_type: "billing_statement",
        entity_id: statement_id,
        status: "sent",
        sent_at: sentAt,
        log_id: sentLog?.id ?? null,
        log_error: sentLogError?.message ?? null,
      });
    }

    if (sentLogError) {
      return json(500, {
        success: false,
        error: "Email delivered but failed to write audit log",
        details: sentLogError.message,
        email_sent: true,
        recipient_email: normalizedRecipient,
        entity_type: "billing_statement",
        entity_id: statement_id,
        status: "sent",
        sent_at: sentAt,
      });
    }

    return json(200, {
      success: true,
      email_sent: true,
      pdf_attached: !!payload.pdf_base64,
      status: "sent",
      recipient_email: normalizedRecipient,
      entity_type: "billing_statement",
      entity_id: statement_id,
      sent_at: sentAt,
      log_id: sentLog.id,
      message: `Statement sent to ${normalizedRecipient}`,
    });
  } catch (error) {
    return json(500, { error: (error as Error).message });
  }
});
