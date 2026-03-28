import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildReminderEmail } from "../_shared/email-template.ts";

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

type AccountWithBalance = {
  id: string;
  account_number: string;
  interest_rate: number;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_cutoff_day: number;
  clients: {
    name: string;
    email: string | null;
  } | null;
  outstanding_balance: number;
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Fetch all active billing accounts with their client info
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("billing_accounts")
      .select(`
        id, account_number, interest_rate, billing_contact_name,
        billing_contact_email, billing_cutoff_day,
        clients:client_id (name, email)
      `)
      .eq("status", "active");

    if (accountsError) {
      return json(500, { error: "Failed to fetch accounts", details: accountsError.message });
    }

    if (!accounts || accounts.length === 0) {
      return json(200, { success: true, message: "No active billing accounts", reminders_sent: 0 });
    }

    const results: Array<{ account_id: string; account_number: string; status: string; email?: string; error?: string }> = [];
    let sentCount = 0;

    for (const account of accounts) {
      // Get outstanding balance via RPC
      const { data: balance } = await supabaseAdmin.rpc("get_billing_account_balance", {
        p_account_id: account.id,
      });

      const outstandingBalance = balance ?? 0;

      // Skip accounts with no outstanding balance
      if (outstandingBalance <= 0) {
        results.push({
          account_id: account.id,
          account_number: account.account_number,
          status: "skipped",
        });
        continue;
      }

      // Determine recipient email (prefer billing contact, fall back to client)
      const recipientEmail =
        account.billing_contact_email ||
        (account.clients as unknown as { name: string; email: string | null })?.email;

      const clientName =
        account.billing_contact_name ||
        (account.clients as unknown as { name: string; email: string | null })?.name ||
        "Valued Client";

      if (!recipientEmail) {
        // Log as failed - no email address
        await supabaseAdmin.from("email_logs").insert({
          billing_account_id: account.id,
          recipient: "N/A",
          subject: "Billing Reminder (no email)",
          type: "billing_reminder",
          status: "failed",
          error_message: "No email address configured for account or client",
          metadata: { balance: outstandingBalance },
        });

        results.push({
          account_id: account.id,
          account_number: account.account_number,
          status: "failed",
          error: "No email address",
        });
        continue;
      }

      // Calculate due date (cutoff day of current month or next month)
      const now = new Date();
      const cutoffDay = account.billing_cutoff_day || 1;
      let dueDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay);
      if (dueDate <= now) {
        dueDate = new Date(now.getFullYear(), now.getMonth() + 1, cutoffDay);
      }
      const dueDateStr = dueDate.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const subject = `Billing Reminder — RMS Avisha (${account.account_number})`;

      // Create email log entry as pending
      const { data: emailLog } = await supabaseAdmin
        .from("email_logs")
        .insert({
          billing_account_id: account.id,
          recipient: recipientEmail,
          subject,
          type: "billing_reminder",
          status: "pending",
          metadata: {
            balance: outstandingBalance,
            due_date: dueDateStr,
            client_name: clientName,
          },
        })
        .select("id")
        .single();

      if (resendApiKey) {
        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "RMS Avisha <billing@rmsavisha.company>",
              to: [recipientEmail],
              subject,
              html: buildReminderEmail({
                clientName,
                accountNumber: account.account_number,
                amountDue: outstandingBalance,
                dueDate: dueDateStr,
                interestRate: account.interest_rate,
              }),
            }),
          });

          if (emailResponse.ok) {
            // Update log to sent
            if (emailLog?.id) {
              await supabaseAdmin
                .from("email_logs")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("id", emailLog.id);
            }
            sentCount++;
            results.push({
              account_id: account.id,
              account_number: account.account_number,
              status: "sent",
              email: recipientEmail,
            });
          } else {
            const errorData = await emailResponse.json();
            // Update log to failed
            if (emailLog?.id) {
              await supabaseAdmin
                .from("email_logs")
                .update({
                  status: "failed",
                  error_message: JSON.stringify(errorData),
                })
                .eq("id", emailLog.id);
            }
            results.push({
              account_id: account.id,
              account_number: account.account_number,
              status: "failed",
              error: JSON.stringify(errorData),
            });
          }
        } catch (emailErr) {
          if (emailLog?.id) {
            await supabaseAdmin
              .from("email_logs")
              .update({
                status: "failed",
                error_message: (emailErr as Error).message,
              })
              .eq("id", emailLog.id);
          }
          results.push({
            account_id: account.id,
            account_number: account.account_number,
            status: "failed",
            error: (emailErr as Error).message,
          });
        }
      } else {
        // No email service configured - mark as failed
        if (emailLog?.id) {
          await supabaseAdmin
            .from("email_logs")
            .update({
              status: "failed",
              error_message: "RESEND_API_KEY not configured",
            })
            .eq("id", emailLog.id);
        }
        results.push({
          account_id: account.id,
          account_number: account.account_number,
          status: "failed",
          error: "Email service not configured",
        });
      }
    }

    return json(200, {
      success: true,
      reminders_sent: sentCount,
      total_accounts: accounts.length,
      results,
    });
  } catch (error) {
    return json(500, { error: (error as Error).message });
  }
});
