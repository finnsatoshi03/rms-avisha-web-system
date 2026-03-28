import { Client } from "./types";

export type BillingAccountStatus = "active" | "suspended" | "closed";
export type BillingLineItemType = "charge" | "interest" | "adjustment" | "credit";
export type BillingStatementStatus = "draft" | "finalized" | "sent";

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
  branch_id: number;
  type: BillingLineItemType;
  description: string;
  amount: number;
  balance_at_time: number | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  branches?: { id: number; name: string; prefix: string };
  joborders?: { id: number; order_no: string; status: string };
  paid_amount?: number;
};

export type BillingPayment = {
  id: string;
  billing_account_id: string;
  amount: number;
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
  allocations?: { line_item_id: string; amount: number }[];
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
export type EmailLogType = "billing_reminder" | "statement" | "notification";

export type EmailLog = {
  id: string;
  billing_account_id: string | null;
  recipient: string;
  subject: string;
  type: EmailLogType;
  status: EmailLogStatus;
  error_message: string | null;
  metadata: Record<string, unknown>;
  sent_at: string | null;
  created_at: string;
};
