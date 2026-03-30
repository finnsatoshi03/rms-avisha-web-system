/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabase";
import {
  BillingAccount,
  BillingLineItem,
  BillingSourceType,
  BillingPayment,
  SourcePaymentResult,
  SourceRecalculationResult,
  BillingDeletionMode,
  BillingAccountDeletionImpact,
  BillingAccountDeletionResult,
  SourceReceiptStats,
  SourceReceiptSummary,
  BillingStatement,
  BillingAging,
  BillingDashboardSummary,
  BillingInterestLog,
  EmailLog,
  CreateBillingAccountData,
  RecordPaymentData,
  LedgerEntry,
} from "../lib/billing-types";

export const RECEIPT_BUCKET = "billing-receipts";
export const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

type ReceiptStorageSourceType = BillingSourceType | "billing";

function getReceiptExtension(file: File): string {
  const normalizedName = file.name?.toLowerCase() || "";
  const knownByName = normalizedName.split(".").pop();
  if (knownByName && knownByName.length <= 6) {
    return knownByName;
  }

  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

function sanitizeReceiptPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function validateReceiptFile(file: File): string | null {
  if (!ALLOWED_RECEIPT_MIME_TYPES.has(file.type)) {
    return "Only JPG, PNG, or PDF files are allowed.";
  }

  if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
    return "Receipt file must be 10MB or below.";
  }

  return null;
}

export function buildReceiptStoragePath(params: {
  sourceType: ReceiptStorageSourceType;
  sourceId: number | string;
  file: File;
}): string {
  const sourceFolder =
    params.sourceType === "job_order"
      ? "job-orders"
      : params.sourceType === "rental"
        ? "rentals"
        : "billing";

  const sourceId = String(params.sourceId);
  const extension = getReceiptExtension(params.file);
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const fileName = `${Date.now()}-${randomId}.${extension}`;

  return `${sourceFolder}/${sourceId}/${fileName}`;
}

export function resolveReceiptStorageContextFromPayment(
  payment: BillingPayment,
  fallbackAccountId?: string
): { sourceType: ReceiptStorageSourceType; sourceId: number | string } {
  const allocations = payment.allocations || [];
  const uniqueSources = new Set(
    allocations
      .map((allocation) => allocation.billing_line_items)
      .filter(
        (lineItem): lineItem is BillingLineItem =>
          Boolean(
            lineItem &&
              (lineItem.source_type === "job_order" ||
                lineItem.source_type === "rental") &&
              lineItem.source_id != null
          )
      )
      .map((lineItem) => `${lineItem.source_type}:${lineItem.source_id}`)
  );

  if (uniqueSources.size === 1) {
    const [sourceKey] = Array.from(uniqueSources);
    const [sourceType, sourceIdText] = sourceKey.split(":");
    const sourceId = Number(sourceIdText);
    if (
      (sourceType === "job_order" || sourceType === "rental") &&
      Number.isFinite(sourceId)
    ) {
      return { sourceType, sourceId };
    }
  }

  return {
    sourceType: "billing",
    sourceId: fallbackAccountId || payment.billing_account_id,
  };
}

export async function uploadReceiptFile(params: {
  sourceType: ReceiptStorageSourceType;
  sourceId: number | string;
  file: File;
}): Promise<string> {
  const validationError = validateReceiptFile(params.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const storagePath = buildReceiptStoragePath(params);
  const { error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(storagePath, params.file, {
      cacheControl: "3600",
      contentType: params.file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw new Error("Failed to upload receipt: " + error.message);
  }

  return storagePath;
}

export async function deleteReceiptFile(receiptUrl: string): Promise<void> {
  const path = sanitizeReceiptPath(receiptUrl || "");
  if (!path || /^https?:\/\//i.test(path)) {
    return;
  }

  const { error } = await supabase.storage.from(RECEIPT_BUCKET).remove([path]);
  if (error) {
    throw new Error("Failed to delete previous receipt: " + error.message);
  }
}

export async function getSignedReceiptUrl(
  receiptUrl: string,
  expiresInSeconds = 60 * 15
): Promise<string> {
  const normalized = sanitizeReceiptPath(receiptUrl || "");
  if (!normalized) {
    throw new Error("Receipt URL is missing.");
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(normalized, expiresInSeconds);

  if (error) {
    throw new Error("Failed to generate signed receipt URL: " + error.message);
  }

  if (!data?.signedUrl) {
    throw new Error("Signed URL was not returned.");
  }

  return data.signedUrl;
}

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

function toTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toNumberValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function getBillingAccountDeletionImpact(
  accountId: string
): Promise<BillingAccountDeletionImpact> {
  const { data, error } = await supabase.rpc(
    "get_billing_account_deletion_impact",
    {
      p_account_id: accountId,
    }
  );

  if (error) {
    throw new Error("Failed to load billing deletion impact: " + error.message);
  }

  const payload = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | null;

  if (!payload || typeof payload !== "object") {
    throw new Error("Billing deletion impact was not returned.");
  }

  const linkedJobOrders = Array.isArray(payload.linked_job_orders)
    ? (payload.linked_job_orders as Array<Record<string, unknown>>).map(
        (row) => ({
          id: Number(row.id),
          order_no:
            row.order_no == null ? null : String(row.order_no || "").trim(),
          status: row.status == null ? null : String(row.status || "").trim(),
        })
      )
    : [];

  const linkedRentals = Array.isArray(payload.linked_rentals)
    ? (payload.linked_rentals as Array<Record<string, unknown>>).map((row) => ({
        id: Number(row.id),
        rental_no:
          row.rental_no == null ? null : String(row.rental_no || "").trim(),
        status: row.status == null ? null : String(row.status || "").trim(),
      }))
    : [];

  return {
    account_id: String(payload.account_id || accountId),
    account_number: String(payload.account_number || ""),
    linked_job_orders: linkedJobOrders.filter((row) => Number.isFinite(row.id)),
    linked_rentals: linkedRentals.filter((row) => Number.isFinite(row.id)),
    payment_count: toNumberValue(payload.payment_count),
    payment_total: toNumberValue(payload.payment_total),
    payment_receipt_count: toNumberValue(payload.payment_receipt_count),
    statement_count: toNumberValue(payload.statement_count),
    statement_sent_count: toNumberValue(payload.statement_sent_count),
    email_count: toNumberValue(payload.email_count),
    email_sent_count: toNumberValue(payload.email_sent_count),
    source_receipt_count: toNumberValue(payload.source_receipt_count),
    receipt_attachment_count: toNumberValue(payload.receipt_attachment_count),
  };
}

export async function deleteBillingAccountWithStrategy(
  accountId: string,
  mode: BillingDeletionMode,
  reason?: string
): Promise<BillingAccountDeletionResult> {
  const { data, error } = await supabase.rpc(
    "delete_billing_account_with_strategy",
    {
      p_account_id: accountId,
      p_mode: mode,
      p_reason: reason || null,
    }
  );

  if (error) {
    throw new Error("Failed to delete billing account: " + error.message);
  }

  const payload = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | null;

  if (!payload || typeof payload !== "object") {
    throw new Error("Billing deletion result was not returned.");
  }

  return {
    deleted: Boolean(payload.deleted),
    account_id: String(payload.account_id || accountId),
    account_number: String(payload.account_number || ""),
    deletion_mode:
      payload.deletion_mode === "billing_with_linked"
        ? "billing_with_linked"
        : "billing_only",
    detached_job_orders: toNumberValue(payload.detached_job_orders),
    detached_rentals: toNumberValue(payload.detached_rentals),
    deleted_job_orders: toNumberValue(payload.deleted_job_orders),
    deleted_rentals: toNumberValue(payload.deleted_rentals),
    allocations_reversed: toNumberValue(payload.allocations_reversed),
    allocations_deleted: toNumberValue(payload.allocations_deleted),
    payments_reversed: toNumberValue(payload.payments_reversed),
    payments_deleted: toNumberValue(payload.payments_deleted),
    line_items_deleted: toNumberValue(payload.line_items_deleted),
    statements_deleted: toNumberValue(payload.statements_deleted),
    email_logs_invalidated: toNumberValue(payload.email_logs_invalidated),
    receipt_paths_to_delete: toTextArray(payload.receipt_paths_to_delete),
    audit_id: payload.audit_id ? String(payload.audit_id) : null,
  };
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
        id, amount, status, reversed_at, reversed_by, reversal_reason, billing_line_item_id,
        billing_line_items:billing_line_item_id (
          id,
          description,
          job_order_id,
          rental_id,
          source_type,
          source_id
        )
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
      receipt_url: paymentData.receipt_url || null,
      receipt_uploaded_by: paymentData.receipt_url ? userData.user?.id || null : null,
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

export async function updateBillingPaymentReceipt(
  paymentId: string,
  receiptUrl: string | null
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const updates = receiptUrl
    ? {
        receipt_url: sanitizeReceiptPath(receiptUrl),
        receipt_uploaded_by: userData.user?.id || null,
      }
    : {
        receipt_url: null,
        receipt_uploaded_by: null,
      };

  const { error } = await supabase
    .from("billing_payments")
    .update(updates)
    .eq("id", paymentId);

  if (error) {
    throw new Error("Failed to update billing receipt: " + error.message);
  }
}

export async function updateSourceReceipt(
  sourceType: BillingSourceType,
  sourceId: number,
  receiptUrl: string | null
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const tableName = sourceType === "job_order" ? "joborders" : "rentals";
  const updates = receiptUrl
    ? {
        receipt_url: sanitizeReceiptPath(receiptUrl),
        receipt_uploaded_at: new Date().toISOString(),
        receipt_uploaded_by: userData.user?.id || null,
      }
    : {
        receipt_url: null,
        receipt_uploaded_at: null,
        receipt_uploaded_by: null,
      };

  const { error } = await supabase.from(tableName).update(updates).eq("id", sourceId);
  if (error) {
    throw new Error("Failed to update source receipt: " + error.message);
  }
}

export async function getSourceLatestReceipt(
  sourceType: BillingSourceType,
  sourceId: number
): Promise<SourceReceiptSummary | null> {
  const { data, error } = await supabase.rpc("get_source_latest_receipt", {
    p_source_type: sourceType,
    p_source_id: sourceId,
  });

  if (error) {
    throw new Error("Failed to fetch source receipt: " + error.message);
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    payment_id: row.payment_id,
    billing_account_id: row.billing_account_id,
    amount: Number(row.amount || 0),
    payment_date: row.payment_date,
    payment_method: row.payment_method,
    reference_number: row.reference_number,
    receipt_url: row.receipt_url,
    receipt_uploaded_at: row.receipt_uploaded_at,
    receipt_uploaded_by: row.receipt_uploaded_by,
  };
}

export async function getSourceReceiptStats(
  sourceType: BillingSourceType,
  sourceId: number
): Promise<SourceReceiptStats> {
  const { data, error } = await supabase.rpc("get_source_receipt_stats", {
    p_source_type: sourceType,
    p_source_id: sourceId,
  });

  if (error) {
    throw new Error("Failed to fetch source receipt stats: " + error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_payments: Number(row?.total_payments || 0),
    payments_with_receipt: Number(row?.payments_with_receipt || 0),
    payments_missing_receipt: Number(row?.payments_missing_receipt || 0),
  };
}

export async function applySourcePayment(
  sourceType: BillingSourceType,
  sourceId: number,
  payments: Record<string, number>,
  options?: {
    paymentDate?: string;
    referenceNumber?: string;
    notes?: string;
    receiptUrl?: string | null;
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

  const result = data as SourcePaymentResult;
  const receiptUrl = options?.receiptUrl ? sanitizeReceiptPath(options.receiptUrl) : null;

  if (receiptUrl) {
    if (result.payment_id) {
      await updateBillingPaymentReceipt(result.payment_id, receiptUrl);
    } else {
      await updateSourceReceipt(sourceType, sourceId, receiptUrl);
    }
    result.receipt_url = receiptUrl;
  }

  return result;
}

export async function recalculateLinkedSourceBilling(
  sourceType: BillingSourceType,
  sourceId: number,
  options?: {
    reason?: string;
  }
): Promise<SourceRecalculationResult> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("recalculate_linked_source_billing", {
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_reason: options?.reason || null,
    p_reversed_by: userData.user?.id || null,
  });

  if (error) {
    throw new Error("Failed to recalculate linked billing: " + error.message);
  }

  return data as SourceRecalculationResult;
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
    const effectiveCredit = (p.allocations || [])
      .filter((allocation: any) => allocation.status !== "reversed")
      .reduce((sum: number, allocation: any) => sum + Number(allocation.amount || 0), 0);

    if (effectiveCredit <= 0) {
      return;
    }

    entries.push({
      id: p.id,
      date: p.created_at,
      type: "payment",
      description: `Payment - ${p.payment_method || "Unknown"}${p.reference_number ? ` (${p.reference_number})` : ""}`,
      debit: 0,
      credit: effectiveCredit,
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
    .is("deleted_at", null)
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
    .is("deleted_at", null)
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
