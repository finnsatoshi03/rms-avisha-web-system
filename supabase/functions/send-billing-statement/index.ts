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
      account_number,
      statement_number,
      period,
      balance_due,
      due_date,
    } = payload;

    if (!statement_id || !to_email) {
      return json(400, { error: "statement_id and to_email are required" });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      // Build email body
      const emailBody: Record<string, unknown> = {
        from: "RMS Avisha <billing@rmsavisha.company>",
        to: [to_email],
        subject: `Statement of Account - ${account_number} - ${period}`,
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
        const errorData = await emailResponse.json();
        return json(500, {
          error: "Failed to send email",
          details: errorData,
        });
      }
    }

    // Update statement status
    const { error: updateError } = await supabaseAdmin
      .from("billing_statements")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", statement_id);

    if (updateError) {
      return json(500, {
        error: "Failed to update statement status",
        details: updateError.message,
      });
    }

    return json(200, {
      success: true,
      email_sent: !!resendApiKey,
      pdf_attached: !!payload.pdf_base64,
      message: resendApiKey
        ? `Statement sent to ${to_email}`
        : "Statement marked as sent (email service not configured - set RESEND_API_KEY)",
    });
  } catch (error) {
    return json(500, { error: (error as Error).message });
  }
});
