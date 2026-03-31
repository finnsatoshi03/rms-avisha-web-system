import { Client } from "./types";

export type BillingAccountStatus = "active" | "suspended" | "closed";
export type BillingLineItemType = "charge" | "interest" | "adjustment" | "credit";
export type BillingStatementStatus = "draft" | "finalized" | "sent";
export type BillingSourceType = "job_order" | "rental";
export type BillingPaymentStatus = "pending" | "partial" | "paid";
export type BillingDeletionMode = "billing_only" | "billing_with_linked";

export type BillingAccount = {
  id: string;
  client_id: number;
  account_number: string;
  status: BillingAccountStatus;
  credit_limit: number;
  interest_rate: number;
  billing_cutoff_day: number;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_contact_phone: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  clients?: Client;
  current_balance?: number;
  aging?: BillingAging;
};

export type BillingLineItem = {
  id: string;
  billing_account_id: string;
  job_order_id: number | null;
  rental_id: number | null;
  source_type?: BillingSourceType | null;
  source_id?: number | null;
  branch_id: number;
  type: BillingLineItemType;
  description: string;
  amount: number;
  total_paid?: number;
  remaining_balance?: number;
  payment_status?: BillingPaymentStatus;
  receipt_url?: string | null;
  receipt_uploaded_at?: string | null;
  receipt_uploaded_by?: string | null;
  balance_at_time: number | null;
  transaction_date?: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  branches?: { id: number; name: string; prefix: string };
  joborders?: {
    id: number;
    order_no: string;
    status: string;
    created_at?: string | null;
  };
  rentals?: {
    id: number;
    rental_no: string;
    status: string;
    created_at?: string | null;
  };
  paid_amount?: number;
};

export type BillingPayment = {
  id: string;
  billing_account_id: string;
  amount: number;
  status?: "posted" | "partially_reversed" | "reversed";
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversal_reason?: string | null;
  receipt_url?: string | null;
  receipt_uploaded_at?: string | null;
  receipt_uploaded_by?: string | null;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  created_by_user?: { fullname: string | null };
  allocations?: BillingPaymentAllocation[];
};

export type BillingPaymentAllocation = {
  id: string;
  billing_payment_id: string;
  billing_line_item_id: string;
  amount: number;
  status?: "active" | "reversed";
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversal_reason?: string | null;
  created_at: string;
  billing_line_items?: BillingLineItem;
};

export type BillingStatement = {
  id: string;
  billing_account_id: string;
  statement_number: string;
  period_start: string;
  period_end: string;
  previous_balance: number;
  new_charges: number;
  payments_received: number;
  interest_applied: number;
  current_balance: number;
  due_date: string | null;
  branch_filter: number | null;
  status: BillingStatementStatus;
  generated_by: string | null;
  generated_at: string;
  sent_at: string | null;
  pdf_url: string | null;
};

export type BillingAging = {
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
};

export type BillingDashboardSummary = {
  total_receivables: number;
  total_collected: number;
  overdue_accounts: number;
  total_overdue: number;
};

export type CreateBillingAccountData = {
  client_id: number;
  credit_limit?: number;
  interest_rate?: number;
  billing_cutoff_day?: number;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_contact_phone?: string;
  notes?: string;
};

export type RecordPaymentData = {
  billing_account_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  receipt_url?: string;
  receipt_source_type?: BillingSourceType;
  receipt_source_id?: number;
  allocations?: { line_item_id: string; amount: number }[];
};

export type SourcePaymentResult = {
  source_type: BillingSourceType;
  source_id: number;
  billing_account_id: string | null;
  payment_id: string | null;
  total_amount: number;
  total_paid: number;
  remaining_balance: number;
  payment_status: BillingPaymentStatus;
  is_transferred_to_billing: boolean;
  receipt_url?: string | null;
};

export type SourceRecalculationResult = {
  source_type: BillingSourceType;
  source_id: number;
  billing_account_id: string | null;
  total_amount: number;
  total_paid: number;
  remaining_balance: number;
  payment_status: BillingPaymentStatus;
  line_items_updated: number;
  allocations_reversed: number;
  payments_touched: number;
  amount_reversed: number;
  skipped: boolean;
};

export type BillingDeletionLinkedJobOrder = {
  id: number;
  order_no: string | null;
  status: string | null;
};

export type BillingDeletionLinkedRental = {
  id: number;
  rental_no: string | null;
  status: string | null;
};

export type BillingAccountDeletionImpact = {
  account_id: string;
  account_number: string;
  linked_job_orders: BillingDeletionLinkedJobOrder[];
  linked_rentals: BillingDeletionLinkedRental[];
  payment_count: number;
  payment_total: number;
  payment_receipt_count: number;
  statement_count: number;
  statement_sent_count: number;
  email_count: number;
  email_sent_count: number;
  source_receipt_count: number;
  receipt_attachment_count: number;
};

export type BillingAccountDeletionResult = {
  deleted: boolean;
  account_id: string;
  account_number: string;
  deletion_mode: BillingDeletionMode;
  detached_job_orders: number;
  detached_rentals: number;
  deleted_job_orders: number;
  deleted_rentals: number;
  allocations_reversed: number;
  allocations_deleted: number;
  payments_reversed: number;
  payments_deleted: number;
  line_items_deleted: number;
  statements_deleted: number;
  email_logs_invalidated: number;
  receipt_paths_to_delete: string[];
  audit_id: string | null;
};

export type SourceReceiptSummary = {
  payment_id: string;
  billing_account_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  receipt_url: string | null;
  receipt_uploaded_at: string | null;
  receipt_uploaded_by: string | null;
};

export type SourceReceiptStats = {
  total_payments: number;
  payments_with_receipt: number;
  payments_missing_receipt: number;
};

export type LedgerEntry = {
  id: string;
  date: string;
  type: "charge" | "interest" | "adjustment" | "credit" | "payment";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  branch?: string;
  source: "line_item" | "payment";
};

export type BillingInterestLog = {
  id: string;
  billing_account_id: string;
  billing_line_item_id: string | null;
  applied_at: string;
  interest_amount: number;
  rate: number;
  overdue_balance: number;
  billing_cycle: string;
  created_at: string;
};

export type EmailLogStatus = "pending" | "sent" | "failed";
export type EmailLogType =
  | "billing_reminder"
  | "statement"
  | "notification"
  | "quotation";
export type EmailLogEntityType =
  | "billing_statement"
  | "billing_account"
  | "notification"
  | "quotation";

export type EmailLog = {
  id: string;
  billing_account_id: string | null;
  recipient: string;
  recipient_email?: string | null;
  recipient_to?: string[] | null;
  recipient_cc?: string[] | null;
  recipient_bcc?: string[] | null;
  subject: string;
  type: EmailLogType;
  entity_type?: EmailLogEntityType | null;
  entity_id?: string | null;
  status: EmailLogStatus;
  error_message: string | null;
  metadata: Record<string, unknown>;
  sent_at: string | null;
  created_at: string;
};
