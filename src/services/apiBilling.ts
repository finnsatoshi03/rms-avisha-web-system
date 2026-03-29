/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabase";
import {
  BillingAccount,
  BillingLineItem,
  BillingSourceType,
  BillingPayment,
  SourcePaymentResult,
  BillingStatement,
  BillingAging,
  BillingDashboardSummary,
  BillingInterestLog,
  EmailLog,
  CreateBillingAccountData,
  RecordPaymentData,
  LedgerEntry,
} from "../lib/billing-types";

function getSplitPaymentTotal(payments: Record<string, number>): number {
  return Object.values(payments).reduce((acc, amount) => acc + Number(amount || 0), 0);
}

function getPaymentMethodAndNotes(payments: Record<string, number>): {
  paymentMethod: string;
  notes: string | null;
} {
  const entries = Object.entries(payments).filter(([, amount]) => Number(amount) > 0);
  if (entries.length === 0) {
    return { paymentMethod: "cash", notes: null };
  }

  if (entries.length === 1) {
    return { paymentMethod: entries[0][0], notes: null };
  }

  const notes = `Split payment: ${entries
    .map(([method, amount]) => `${method}:${Number(amount).toFixed(2)}`)
    .join(", ")}`;

  return { paymentMethod: "split", notes };
}

// ========================
// Billing Accounts
// ========================

export async function getBillingAccounts(): Promise<BillingAccount[]> {
  const { data, error } = await supabase
    .from("billing_accounts")
    .select(`*, clients:client_id (*)`)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch billing accounts: " + error.message);
  return data || [];
}

export async function getBillingAccount(id: string): Promise<BillingAccount> {
  const { data, error } = await supabase
    .from("billing_accounts")
    .select(`*, clients:client_id (*)`)
    .eq("id", id)
    .single();

  if (error) throw new Error("Failed to fetch billing account: " + error.message);
  return data;
}

export async function getBillingAccountByClientId(clientId: number): Promise<BillingAccount | null> {
  const { data, error } = await supabase
    .from("billing_accounts")
    .select(`*, clients:client_id (*)`)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) throw new Error("Failed to fetch billing account: " + error.message);
  return data;
}

export async function createBillingAccount(accountData: CreateBillingAccountData): Promise<BillingAccount> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("billing_accounts")
    .insert({
      ...accountData,
      account_number: "", // trigger will auto-generate
      created_by: userData.user?.id,
    })
    .select(`*, clients:client_id (*)`)
    .single();

  if (error) throw new Error("Failed to create billing account: " + error.message);
  return data;
}

export async function updateBillingAccount(
  id: string,
  updates: Partial<CreateBillingAccountData> & { status?: string }
): Promise<BillingAccount> {
  const { data, error } = await supabase
    .from("billing_accounts")
    .update(updates)
    .eq("id", id)
    .select(`*, clients:client_id (*)`)
    .single();

  if (error) throw new Error("Failed to update billing account: " + error.message);
  return data;
}

export async function deleteBillingAccount(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_billing_account_safe", {
    p_account_id: id,
  });

  if (!error) return;

  if (error.code === "P0001" || error.code === "23503") {
    throw new Error(error.message);
  }

  throw new Error("Failed to delete billing account: " + error.message);
}

// ========================
// Balance & Aging
// ========================

export async function getBillingAccountBalance(accountId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_billing_account_balance", {
    p_account_id: accountId,
  });

  if (error) throw new Error("Failed to get balance: " + error.message);
  return data ?? 0;
}

export async function getBillingAccountAging(accountId: string): Promise<BillingAging> {
  const { data, error } = await supabase.rpc("get_billing_account_aging", {
    p_account_id: accountId,
  });

  if (error) throw new Error("Failed to get aging: " + error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    current_amount: row?.current_amount ?? 0,
    days_1_30: row?.days_1_30 ?? 0,
    days_31_60: row?.days_31_60 ?? 0,
    days_61_90: row?.days_61_90 ?? 0,
    days_90_plus: row?.days_90_plus ?? 0,
  };
}

// ========================
// Line Items
// ========================

export async function getBillingLineItems(accountId: string): Promise<BillingLineItem[]> {
  const { data, error } = await supabase
    .from("billing_line_items")
    .select(`*, branches:branch_id (id, name, prefix), joborders:job_order_id (id, order_no, status), rentals:rental_id (id, rental_no, status)`)
    .eq("billing_account_id", accountId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Failed to fetch line items: " + error.message);

  return (data || []).map((li: any) => ({
    ...li,
    amount: Number(li.amount || 0),
    total_paid: Number(li.total_paid || 0),
    remaining_balance: Number(li.remaining_balance || 0),
    paid_amount: Number(li.total_paid || 0),
  }));
}

// ========================
// Transfer JO to Billing
// ========================

export async function transferJobOrderToBilling(
  joId: number,
  accountId: string
): Promise<any> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("transfer_job_order_to_billing", {
    p_jo_id: joId,
    p_account_id: accountId,
    p_transferred_by: userData.user?.id,
  });

  if (error) throw new Error("Failed to transfer job order: " + error.message);
  return data;
}

// ========================
// Payments
// ========================

export async function getBillingPayments(accountId: string): Promise<BillingPayment[]> {
  const { data, error } = await supabase
    .from("billing_payments")
    .select(`
      *,
      billing_payment_allocations (
        id, amount, billing_line_item_id,
        billing_line_items:billing_line_item_id (id, description, job_order_id)
      )
    `)
    .eq("billing_account_id", accountId)
    .order("payment_date", { ascending: false });

  if (error) throw new Error("Failed to fetch payments: " + error.message);
  return (data || []).map((p: any) => ({
    ...p,
    allocations: p.billing_payment_allocations,
  }));
}

export async function recordBillingPayment(paymentData: RecordPaymentData): Promise<BillingPayment> {
  const { data: userData } = await supabase.auth.getUser();

  // 1. Create payment
  const { data: payment, error: paymentError } = await supabase
    .from("billing_payments")
    .insert({
      billing_account_id: paymentData.billing_account_id,
      amount: paymentData.amount,
      payment_date: paymentData.payment_date,
      payment_method: paymentData.payment_method,
      reference_number: paymentData.reference_number || null,
      notes: paymentData.notes || null,
      created_by: userData.user?.id,
    })
    .select()
    .single();

  if (paymentError) throw new Error("Failed to record payment: " + paymentError.message);

  // 2. Allocate payment
  if (paymentData.allocations && paymentData.allocations.length > 0) {
    // Manual allocation to specific line items
    const allocations = paymentData.allocations.map((a) => ({
      billing_payment_id: payment.id,
      billing_line_item_id: a.line_item_id,
      amount: a.amount,
    }));

    const { error: allocError } = await supabase
      .from("billing_payment_allocations")
      .insert(allocations);

    if (allocError) throw new Error("Failed to allocate payment: " + allocError.message);
  } else {
    // FIFO allocation
    const { error: fifoError } = await supabase.rpc("allocate_payment_fifo", {
      p_payment_id: payment.id,
      p_account_id: paymentData.billing_account_id,
    });

    if (fifoError) throw new Error("Failed to auto-allocate payment: " + fifoError.message);
  }

  return payment;
}

export async function applySourcePayment(
  sourceType: BillingSourceType,
  sourceId: number,
  payments: Record<string, number>,
  options?: {
    paymentDate?: string;
    referenceNumber?: string;
    notes?: string;
  }
): Promise<SourcePaymentResult> {
  const amount = getSplitPaymentTotal(payments);
  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  const { paymentMethod, notes: splitNotes } = getPaymentMethodAndNotes(payments);
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("apply_source_payment", {
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_amount: amount,
    p_payment_date: options?.paymentDate || new Date().toISOString().slice(0, 10),
    p_payment_method: paymentMethod,
    p_reference_number: options?.referenceNumber || null,
    p_notes: options?.notes || splitNotes,
    p_created_by: userData.user?.id || null,
  });

  if (error) throw new Error("Failed to apply payment: " + error.message);
  return data as SourcePaymentResult;
}

// ========================
// Statements
// ========================

export async function getBillingStatements(accountId: string): Promise<BillingStatement[]> {
  const { data, error } = await supabase
    .from("billing_statements")
    .select("*")
    .eq("billing_account_id", accountId)
    .order("generated_at", { ascending: false });

  if (error) throw new Error("Failed to fetch statements: " + error.message);
  return data || [];
}

export async function generateBillingStatement(
  accountId: string,
  periodStart: string,
  periodEnd: string,
  branchFilter?: number
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("generate_billing_statement", {
    p_account_id: accountId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_branch_filter: branchFilter || null,
    p_generated_by: userData.user?.id,
  });

  if (error) throw new Error("Failed to generate statement: " + error.message);
  return data;
}

export async function updateBillingStatement(
  id: string,
  updates: Partial<BillingStatement>
): Promise<BillingStatement> {
  const { data, error } = await supabase
    .from("billing_statements")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error("Failed to update statement: " + error.message);
  return data;
}

// ========================
// Interest
// ========================

export async function applyAccountInterest(accountId: string): Promise<any> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("apply_account_interest", {
    p_account_id: accountId,
    p_applied_by: userData.user?.id,
  });

  if (error) throw new Error("Failed to apply interest: " + error.message);
  return data;
}

export async function applyMonthlyInterest(): Promise<any> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("apply_monthly_interest", {
    p_applied_by: userData.user?.id,
  });

  if (error) throw new Error("Failed to apply monthly interest: " + error.message);
  return data;
}

// ========================
// Dashboard
// ========================

export async function getBillingDashboardSummary(branchId?: number): Promise<BillingDashboardSummary> {
  const { data, error } = await supabase.rpc("get_billing_dashboard_summary", {
    p_branch_id: branchId || null,
  });

  if (error) throw new Error("Failed to get billing summary: " + error.message);
  return data ?? { total_receivables: 0, total_collected: 0, overdue_accounts: 0, total_overdue: 0 };
}

// ========================
// Ledger (composite view)
// ========================

export async function getBillingLedger(accountId: string): Promise<LedgerEntry[]> {
  const [lineItems, payments] = await Promise.all([
    getBillingLineItems(accountId),
    getBillingPayments(accountId),
  ]);

  const entries: LedgerEntry[] = [];

  // Add line items as ledger entries
  lineItems.forEach((li) => {
    entries.push({
      id: li.id,
      date: li.created_at,
      type: li.type,
      description: li.description,
      debit: li.amount > 0 ? li.amount : 0,
      credit: li.amount < 0 ? Math.abs(li.amount) : 0,
      balance: 0, // calculated below
      branch: li.branches?.name,
      source: "line_item",
    });
  });

  // Add payments as ledger entries
  payments.forEach((p) => {
    entries.push({
      id: p.id,
      date: p.created_at,
      type: "payment",
      description: `Payment - ${p.payment_method || "Unknown"}${p.reference_number ? ` (${p.reference_number})` : ""}`,
      debit: 0,
      credit: p.amount,
      balance: 0,
      source: "payment",
    });
  });

  // Sort by date
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance
  let runningBalance = 0;
  entries.forEach((entry) => {
    runningBalance += entry.debit - entry.credit;
    entry.balance = runningBalance;
  });

  return entries;
}

// ========================
// Interest Logs
// ========================

export async function getBillingInterestLogs(accountId: string): Promise<BillingInterestLog[]> {
  const { data, error } = await supabase
    .from("billing_interest_logs")
    .select("*")
    .eq("billing_account_id", accountId)
    .order("applied_at", { ascending: false });

  if (error) throw new Error("Failed to fetch interest logs: " + error.message);
  return data || [];
}

// ========================
// Email Logs
// ========================

export async function getEmailLogs(accountId?: string): Promise<EmailLog[]> {
  let query = supabase
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (accountId) {
    query = query.eq("billing_account_id", accountId);
  }

  const { data, error } = await query;
  if (error) throw new Error("Failed to fetch email logs: " + error.message);
  return data || [];
}

export async function getStatementEmailLogs(statementId: string): Promise<EmailLog[]> {
  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .eq("entity_type", "billing_statement")
    .eq("entity_id", statementId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch statement email logs: " + error.message);
  return data || [];
}

// ========================
// Manual Triggers
// ========================

export async function triggerSendBillingReminders(): Promise<any> {
  const { data, error } = await supabase.functions.invoke("send-billing-reminders", {
    body: {},
  });

  if (error) throw new Error("Failed to send billing reminders: " + error.message);
  return data;
}

export async function triggerApplyBillingInterest(): Promise<any> {
  const { data, error } = await supabase.functions.invoke("apply-billing-interest", {
    body: {},
  });

  if (error) throw new Error("Failed to apply billing interest: " + error.message);
  return data;
}

export async function triggerGenerateBillingStatements(): Promise<any> {
  const { data, error } = await supabase.functions.invoke("generate-billing-statements", {
    body: {},
  });

  if (error) throw new Error("Failed to generate billing statements: " + error.message);
  return data;
}

// ========================
// Eligible JOs for transfer
// ========================

// ========================
// Transfer Rental to Billing
// ========================

export async function transferRentalToBilling(
  rentalId: number,
  accountId: string
): Promise<any> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("transfer_rental_to_billing", {
    p_rental_id: rentalId,
    p_account_id: accountId,
    p_transferred_by: userData.user?.id,
  });

  if (error) throw new Error("Failed to transfer rental: " + error.message);
  return data;
}

// ========================
// Eligible Rentals for transfer
// ========================

export async function getEligibleRentals(clientId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from("rentals")
    .select(`
      id, rental_no, status, grand_total, downpayment, branch_id, rate_amount,
      consumables_total, discount, rental_type,
      branches:branch_id (id, name, prefix),
      rental_assets:rental_asset_id (id, unit_name, model)
    `)
    .eq("client_id", clientId)
    .eq("transferred_to_billing", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch eligible rentals: " + error.message);

  // Filter to only those with remaining balance
  return (data || []).filter((rental: any) => {
    const grandTotal = rental.grand_total || 0;
    const downpayment = rental.downpayment || 0;
    const remaining = grandTotal - downpayment;

    // No balance to transfer
    if (remaining <= 0) return false;

    // Completed rentals with no balance shouldn't be transferred
    if (rental.status === "Cancelled") return false;

    return true;
  });
}

// ========================
// Eligible JOs for transfer
// ========================

export async function getEligibleJobOrders(clientId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from("joborders")
    .select(`
      id, order_no, status, grand_total, downpayment, branch_id, labor_description,
      payment_details,
      branches:branch_id (id, name, prefix)
    `)
    .eq("client_id", clientId)
    .eq("transferred_to_billing", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch eligible job orders: " + error.message);

  // Filter to only those with remaining balance
  // Exclude completed JOs that were fully paid via payment dialog
  return (data || []).filter((jo: any) => {
    const grandTotal = jo.grand_total || 0;
    const downpayment = jo.downpayment || 0;
    const remaining = grandTotal - downpayment;

    // No balance to transfer
    if (remaining <= 0) return false;

    // Completed JOs with payment_details were paid in full at the counter — not eligible
    if (
      (jo.status === "Completed" || jo.status === "Pull Out") &&
      jo.payment_details &&
      Object.keys(jo.payment_details).length > 0
    ) {
      return false;
    }

    return true;
  });
}
