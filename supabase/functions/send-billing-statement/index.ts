import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  account_number: string;
  statement_number: string;
  period: string;
  balance_due: number;
  due_date: string;
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

    // NOTE: Email sending requires an email service to be configured.
    // Options: Resend, SendGrid, or Supabase's built-in email.
    //
    // To configure with Resend (recommended):
    // 1. Sign up at resend.com and get an API key
    // 2. Set the RESEND_API_KEY secret in your Supabase project:
    //    supabase secrets set RESEND_API_KEY=re_xxxxx
    // 3. Uncomment the email sending code below
    //
    // For now, this function updates the statement status to 'sent'
    // and returns success. The actual email sending is a TODO.

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      // Send email via Resend
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "RMS Avisha <billing@rmsavisha.com>",
          to: [to_email],
          subject: `Statement of Account - ${account_number} - ${period}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Statement of Account</h2>
              <p>Dear Client,</p>
              <p>Please find below your statement of account summary:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">Account Number</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${account_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">Statement Number</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${statement_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">Period</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${period}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">Balance Due</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">₱${balance_due.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">Due Date</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${due_date}</td>
                </tr>
              </table>
              <p>Please settle your outstanding balance on or before the due date.</p>
              <p>Thank you for your continued patronage.</p>
              <br/>
              <p style="color: #666; font-size: 12px;">RMS Avisha Repair Management System</p>
            </div>
          `,
        }),
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
      message: resendApiKey
        ? `Statement sent to ${to_email}`
        : "Statement marked as sent (email service not configured - set RESEND_API_KEY)",
    });
  } catch (error) {
    return json(500, { error: (error as Error).message });
  }
});
