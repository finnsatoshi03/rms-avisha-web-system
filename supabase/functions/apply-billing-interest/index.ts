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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const billingCycle = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Get all active billing accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("billing_accounts")
      .select("id, account_number, interest_rate")
      .eq("status", "active");

    if (accountsError) {
      return json(500, { error: "Failed to fetch accounts", details: accountsError.message });
    }

    if (!accounts || accounts.length === 0) {
      return json(200, { success: true, message: "No active accounts", accounts_affected: 0 });
    }

    const results: Array<{
      account_id: string;
      account_number: string;
      status: string;
      interest_applied?: number;
      overdue_amount?: number;
      message?: string;
    }> = [];
    let affectedCount = 0;

    for (const account of accounts) {
      // Check if interest already applied for this cycle (idempotency at edge function level too)
      const { data: existingLog } = await supabaseAdmin
        .from("billing_interest_logs")
        .select("id")
        .eq("billing_account_id", account.id)
        .eq("billing_cycle", billingCycle)
        .maybeSingle();

      if (existingLog) {
        results.push({
          account_id: account.id,
          account_number: account.account_number,
          status: "skipped",
          message: `Interest already applied for ${billingCycle}`,
        });
        continue;
      }

      // Calculate overdue amount (line items past due + grace period, not fully paid)
      const { data: overdueData } = await supabaseAdmin.rpc("get_billing_account_aging", {
        p_account_id: account.id,
      });

      const aging = Array.isArray(overdueData) ? overdueData[0] : overdueData;
      const totalOverdue =
        (aging?.days_1_30 ?? 0) +
        (aging?.days_31_60 ?? 0) +
        (aging?.days_61_90 ?? 0) +
        (aging?.days_90_plus ?? 0);

      if (totalOverdue <= 0) {
        results.push({
          account_id: account.id,
          account_number: account.account_number,
          status: "skipped",
          message: "No overdue balance",
        });
        continue;
      }

      // Calculate interest
      const interestAmount = Math.round(totalOverdue * (account.interest_rate / 100) * 100) / 100;

      // Get branch_id from most recent charge
      const { data: recentCharge } = await supabaseAdmin
        .from("billing_line_items")
        .select("branch_id")
        .eq("billing_account_id", account.id)
        .eq("type", "charge")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!recentCharge?.branch_id) {
        results.push({
          account_id: account.id,
          account_number: account.account_number,
          status: "skipped",
          message: "No charge line items found (no branch context)",
        });
        continue;
      }

      // Create interest line item
      const { data: lineItem, error: insertError } = await supabaseAdmin
        .from("billing_line_items")
        .insert({
          billing_account_id: account.id,
          job_order_id: null,
          branch_id: recentCharge.branch_id,
          type: "interest",
          description: `Interest - ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} (${account.interest_rate}% on overdue balance of ₱${totalOverdue.toLocaleString("en-PH", { minimumFractionDigits: 2 })})`,
          amount: interestAmount,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          created_by: null, // system-generated
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

      // Log the interest application
      await supabaseAdmin.from("billing_interest_logs").insert({
        billing_account_id: account.id,
        billing_line_item_id: lineItem.id,
        interest_amount: interestAmount,
        rate: account.interest_rate,
        overdue_balance: totalOverdue,
        billing_cycle: billingCycle,
      });

      affectedCount++;
      results.push({
        account_id: account.id,
        account_number: account.account_number,
        status: "applied",
        interest_applied: interestAmount,
        overdue_amount: totalOverdue,
      });
    }

    return json(200, {
      success: true,
      billing_cycle: billingCycle,
      accounts_affected: affectedCount,
      total_accounts: accounts.length,
      results,
    });
  } catch (error) {
    return json(500, { error: (error as Error).message });
  }
});
