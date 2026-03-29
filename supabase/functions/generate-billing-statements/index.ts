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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Optional: override period via request body
    let body: { period_start?: string; period_end?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body provided, use defaults
    }

    // Get all active billing accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("billing_accounts")
      .select(`
        id, account_number, interest_rate, billing_cutoff_day,
        billing_contact_name, billing_contact_email,
        clients:client_id (name, email)
      `)
      .eq("status", "active");

    if (accountsError) {
      return json(500, { error: "Failed to fetch accounts", details: accountsError.message });
    }

    if (!accounts || accounts.length === 0) {
      return json(200, { success: true, message: "No active accounts", statements_generated: 0 });
    }

    const results: Array<{
      account_id: string;
      account_number: string;
      status: string;
      statement_number?: string;
      email_sent?: boolean;
      message?: string;
    }> = [];
    let generatedCount = 0;

    for (const account of accounts) {
      const cutoffDay = account.billing_cutoff_day || 1;

      // Determine billing period (previous month)
      // e.g., if cutoff is day 1, and today is March 2, period is Feb 1 - Feb 28
      const now = new Date();
      let periodEnd: Date;
      let periodStart: Date;

      if (body.period_start && body.period_end) {
        periodStart = new Date(body.period_start);
        periodEnd = new Date(body.period_end);
      } else {
        // Previous month's billing cycle
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        periodStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), cutoffDay);

        // End = cutoff day of current month - 1 day (or last day of prev month if cutoff is 1)
        if (cutoffDay === 1) {
          periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
        } else {
          periodEnd = new Date(now.getFullYear(), now.getMonth(), cutoffDay - 1);
        }
      }

      const periodStartStr = periodStart.toISOString().split("T")[0];
      const periodEndStr = periodEnd.toISOString().split("T")[0];

      // Generate statement number
      const acctNum = account.account_number.replace(/-/g, "");
      const year = periodEnd.getFullYear();
      const month = String(periodEnd.getMonth() + 1).padStart(2, "0");
      const statementNumber = `SOA-${acctNum}-${year}-${month}`;

      // Idempotency: check if statement already exists for this period
      const { data: existingStatement } = await supabaseAdmin
        .from("billing_statements")
        .select("id")
        .eq("billing_account_id", account.id)
        .eq("statement_number", statementNumber)
        .maybeSingle();

      if (existingStatement) {
        results.push({
          account_id: account.id,
          account_number: account.account_number,
          status: "skipped",
          statement_number: statementNumber,
          message: "Statement already exists for this period",
        });
        continue;
      }

      // Calculate statement data

      // Previous balance: line items before period start minus payments before period start
      const { data: prevLineItems } = await supabaseAdmin
        .from("billing_line_items")
        .select("amount")
        .eq("billing_account_id", account.id)
        .lt("created_at", `${periodStartStr}T00:00:00`);

      const prevCharges = (prevLineItems || []).reduce(
        (sum: number, li: { amount: number }) => sum + Number(li.amount),
        0
      );

      const { data: prevPayments } = await supabaseAdmin
        .from("billing_payments")
        .select(`
          payment_date,
          billing_payment_allocations (
            amount,
            status
          )
        `)
        .eq("billing_account_id", account.id)
        .lt("payment_date", periodStartStr);

      const prevPaid = (prevPayments || []).reduce(
        (
          sum: number,
          p: { billing_payment_allocations?: Array<{ amount: number; status?: string | null }> }
        ) =>
          sum +
          (p.billing_payment_allocations || [])
            .filter((allocation) => (allocation.status || "active") === "active")
            .reduce(
              (allocationSum, allocation) =>
                allocationSum + Number(allocation.amount || 0),
              0
            ),
        0
      );

      const previousBalance = prevCharges - prevPaid;

      // New charges in period (excluding interest)
      const { data: periodCharges } = await supabaseAdmin
        .from("billing_line_items")
        .select("amount")
        .eq("billing_account_id", account.id)
        .neq("type", "interest")
        .gte("created_at", `${periodStartStr}T00:00:00`)
        .lte("created_at", `${periodEndStr}T23:59:59`);

      const newCharges = (periodCharges || []).reduce(
        (sum: number, li: { amount: number }) => sum + Number(li.amount),
        0
      );

      // Interest in period
      const { data: periodInterest } = await supabaseAdmin
        .from("billing_line_items")
        .select("amount")
        .eq("billing_account_id", account.id)
        .eq("type", "interest")
        .gte("created_at", `${periodStartStr}T00:00:00`)
        .lte("created_at", `${periodEndStr}T23:59:59`);

      const interestApplied = (periodInterest || []).reduce(
        (sum: number, li: { amount: number }) => sum + Number(li.amount),
        0
      );

      // Payments in period
      const { data: periodPaymentData } = await supabaseAdmin
        .from("billing_payments")
        .select(`
          payment_date,
          billing_payment_allocations (
            amount,
            status
          )
        `)
        .eq("billing_account_id", account.id)
        .gte("payment_date", periodStartStr)
        .lte("payment_date", periodEndStr);

      const paymentsReceived = (periodPaymentData || []).reduce(
        (
          sum: number,
          p: { billing_payment_allocations?: Array<{ amount: number; status?: string | null }> }
        ) =>
          sum +
          (p.billing_payment_allocations || [])
            .filter((allocation) => (allocation.status || "active") === "active")
            .reduce(
              (allocationSum, allocation) =>
                allocationSum + Number(allocation.amount || 0),
              0
            ),
        0
      );

      const currentBalance =
        previousBalance + newCharges + interestApplied - paymentsReceived;

      const dueDate = new Date(periodEnd);
      dueDate.setDate(dueDate.getDate() + 15);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      // Insert statement
      const { data: statement, error: insertError } = await supabaseAdmin
        .from("billing_statements")
        .insert({
          billing_account_id: account.id,
          statement_number: statementNumber,
          period_start: periodStartStr,
          period_end: periodEndStr,
          previous_balance: previousBalance,
          new_charges: newCharges,
          payments_received: paymentsReceived,
          interest_applied: interestApplied,
          current_balance: currentBalance,
          due_date: dueDateStr,
          branch_filter: null,
          status: "finalized",
          generated_by: null, // system-generated
        })
        .select("id")
        .single();

      if (insertError) {
        results.push({
          account_id: account.id,
          account_number: account.account_number,
          status: "failed",
          message: insertError.message,
        });
        continue;
      }

      generatedCount++;

      // Auto-send via email and always log result for statement delivery audit.
      let emailSent = false;
      let emailStatusMessage: string | undefined;
      const recipientEmail =
        account.billing_contact_email ||
        (account.clients as unknown as { name: string; email: string | null })
          ?.email;
      const normalizedRecipient = recipientEmail?.trim().toLowerCase() ?? null;

      const clientName =
        account.billing_contact_name ||
        (account.clients as unknown as { name: string; email: string | null })
          ?.name ||
        "Valued Client";

      const periodLabel = `${periodStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} - ${periodEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
      const dueDateLabel = dueDate.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const statementSubject = `Statement of Account - ${account.account_number} - ${periodLabel}`;

      const createStatementEmailLog = async ({
        status,
        sentAt,
        errorMessage,
        metadata,
      }: {
        status: "sent" | "failed";
        sentAt?: string | null;
        errorMessage?: string | null;
        metadata?: Record<string, unknown>;
      }) =>
        await supabaseAdmin.from("email_logs").insert({
          billing_account_id: account.id,
          recipient: normalizedRecipient ?? "N/A",
          recipient_email: normalizedRecipient,
          subject: statementSubject,
          type: "statement",
          entity_type: "billing_statement",
          entity_id: statement.id,
          status,
          sent_at: sentAt ?? null,
          error_message: errorMessage ?? null,
          metadata: {
            source: "generate-billing-statements",
            statement_id: statement.id,
            statement_number: statementNumber,
            current_balance: currentBalance,
            ...(metadata ?? {}),
          },
        });

      if (currentBalance <= 0) {
        emailStatusMessage = "Skipped auto-email: no outstanding balance";
      } else if (!normalizedRecipient) {
        emailStatusMessage = "Auto-email failed: no recipient email configured";
        await createStatementEmailLog({
          status: "failed",
          errorMessage: "No email address configured for account or client",
        });
      } else if (!resendApiKey) {
        emailStatusMessage = "Auto-email failed: RESEND_API_KEY not configured";
        await createStatementEmailLog({
          status: "failed",
          errorMessage: "RESEND_API_KEY not configured",
        });
      } else {
        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "RMS Avisha <billing@rmsavisha.company>",
              to: [normalizedRecipient],
              subject: statementSubject,
              html: buildStatementEmail({
                clientName,
                accountNumber: account.account_number,
                statementNumber,
                period: periodLabel,
                previousBalance,
                newCharges,
                interestApplied,
                paymentsReceived,
                totalDue: currentBalance,
                dueDate: dueDateLabel,
              }),
            }),
          });

          if (emailResponse.ok) {
            emailSent = true;
            const sentAt = new Date().toISOString();

            const { error: statementUpdateError } = await supabaseAdmin
              .from("billing_statements")
              .update({ status: "sent", sent_at: sentAt })
              .eq("id", statement.id);

            await createStatementEmailLog({
              status: "sent",
              sentAt,
              errorMessage: statementUpdateError
                ? `Email delivered but failed to update statement status: ${statementUpdateError.message}`
                : null,
            });

            if (statementUpdateError) {
              emailStatusMessage = `Email delivered but statement update failed: ${statementUpdateError.message}`;
            }
          } else {
            const providerError = await parseEmailProviderError(emailResponse);
            emailStatusMessage = `Auto-email failed: ${providerError}`;
            await createStatementEmailLog({
              status: "failed",
              errorMessage: `Failed to send email: ${providerError}`,
              metadata: {
                provider_status: emailResponse.status,
              },
            });
          }
        } catch (emailError) {
          const message = (emailError as Error).message;
          emailStatusMessage = `Auto-email failed: ${message}`;
          await createStatementEmailLog({
            status: "failed",
            errorMessage: message,
          });
        }
      }

      results.push({
        account_id: account.id,
        account_number: account.account_number,
        status: "generated",
        statement_number: statementNumber,
        email_sent: emailSent,
        message: emailStatusMessage,
      });
    }

    return json(200, {
      success: true,
      statements_generated: generatedCount,
      total_accounts: accounts.length,
      results,
    });
  } catch (error) {
    return json(500, { error: (error as Error).message });
  }
});
