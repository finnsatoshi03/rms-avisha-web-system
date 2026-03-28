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
        .select("amount")
        .eq("billing_account_id", account.id)
        .lt("payment_date", periodStartStr);

      const prevPaid = (prevPayments || []).reduce(
        (sum: number, p: { amount: number }) => sum + Number(p.amount),
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
        .select("amount")
        .eq("billing_account_id", account.id)
        .gte("payment_date", periodStartStr)
        .lte("payment_date", periodEndStr);

      const paymentsReceived = (periodPaymentData || []).reduce(
        (sum: number, p: { amount: number }) => sum + Number(p.amount),
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

      // Auto-send via email if configured
      let emailSent = false;
      const recipientEmail =
        account.billing_contact_email ||
        (account.clients as unknown as { name: string; email: string | null })
          ?.email;

      const clientName =
        account.billing_contact_name ||
        (account.clients as unknown as { name: string; email: string | null })
          ?.name ||
        "Valued Client";

      if (resendApiKey && recipientEmail && currentBalance > 0) {
        const periodLabel = `${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

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
              subject: `Statement of Account - ${account.account_number} - ${periodLabel}`,
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
                dueDate: dueDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }),
              }),
            }),
          });

          if (emailResponse.ok) {
            emailSent = true;
            // Update statement status to sent
            await supabaseAdmin
              .from("billing_statements")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", statement.id);

            // Log to email_logs
            await supabaseAdmin.from("email_logs").insert({
              billing_account_id: account.id,
              recipient: recipientEmail,
              subject: `Statement of Account - ${account.account_number} - ${periodLabel}`,
              type: "statement",
              status: "sent",
              sent_at: new Date().toISOString(),
              metadata: {
                statement_id: statement.id,
                statement_number: statementNumber,
                current_balance: currentBalance,
              },
            });
          }
        } catch {
          // Email failed but statement was still generated
        }
      }

      results.push({
        account_id: account.id,
        account_number: account.account_number,
        status: "generated",
        statement_number: statementNumber,
        email_sent: emailSent,
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
