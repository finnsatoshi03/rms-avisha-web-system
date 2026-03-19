import {
  BillingAccount,
  BillingLineItem,
  BillingPayment,
  BillingStatement,
  BillingAging,
  LedgerEntry,
} from "../../lib/billing-types";

// ─── Mock Client ────────────────────────────────────────────────────────────

export const DEMO_CLIENT = {
  id: 9999,
  name: "Sunshine Electronics Corp.",
  type: "company" as const,
  contact_number: "0917-555-0123",
  email: "billing@sunshineelectronics.ph",
  address: "123 Electronics Ave, Makati City",
};

// ─── Mock Billing Accounts (list view) ──────────────────────────────────────

export const DEMO_ACCOUNTS: BillingAccount[] = [
  {
    id: "demo-account-001",
    client_id: 9999,
    account_number: "BA-DEMO-001",
    status: "active",
    credit_limit: 50000,
    interest_rate: 2,
    billing_cutoff_day: 15,
    billing_contact_name: "Maria Santos",
    billing_contact_email: "maria@sunshineelectronics.ph",
    billing_contact_phone: "0917-555-0123",
    notes: "Premium client — monthly settlement terms",
    created_by: null,
    created_at: "2026-01-15T08:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    clients: DEMO_CLIENT as never,
  },
  {
    id: "demo-account-002",
    client_id: 9998,
    account_number: "BA-DEMO-002",
    status: "active",
    credit_limit: 30000,
    interest_rate: 1.5,
    billing_cutoff_day: 30,
    billing_contact_name: "Juan Dela Cruz",
    billing_contact_email: "juan@techfix.ph",
    billing_contact_phone: "0918-555-0456",
    notes: null,
    created_by: null,
    created_at: "2026-02-10T08:00:00Z",
    updated_at: "2026-03-05T10:00:00Z",
    clients: {
      id: 9998,
      name: "TechFix Solutions",
      type: "company",
      contact_number: "0918-555-0456",
    } as never,
  },
  {
    id: "demo-account-003",
    client_id: 9997,
    account_number: "BA-DEMO-003",
    status: "suspended",
    credit_limit: 10000,
    interest_rate: 3,
    billing_cutoff_day: 15,
    billing_contact_name: "Pedro Reyes",
    billing_contact_email: null,
    billing_contact_phone: "0919-555-0789",
    notes: "Suspended — overdue for 60+ days",
    created_by: null,
    created_at: "2025-11-20T08:00:00Z",
    updated_at: "2026-02-20T10:00:00Z",
    clients: {
      id: 9997,
      name: "Pedro Reyes",
      type: "individual",
      contact_number: "0919-555-0789",
    } as never,
  },
];

// ─── The primary demo account ───────────────────────────────────────────────

export const DEMO_ACCOUNT = DEMO_ACCOUNTS[0];

// ─── Mock Job Orders (eligible for transfer) ────────────────────────────────

export const DEMO_JOB_ORDERS = [
  {
    id: 90001,
    order_no: "DEMO-101",
    labor_description: "LCD Screen Replacement",
    grand_total: 8500,
    downpayment: 3000,
    remaining: 5500,
    status: "Completed",
    branch_id: 1,
    branches: { id: 1, name: "Main Branch", prefix: "MB" },
  },
  {
    id: 90002,
    order_no: "DEMO-102",
    labor_description: "Battery Replacement",
    grand_total: 2500,
    downpayment: 0,
    remaining: 2500,
    status: "In Progress",
    branch_id: 1,
    branches: { id: 1, name: "Main Branch", prefix: "MB" },
  },
  {
    id: 90003,
    order_no: "DEMO-103",
    labor_description: "Motherboard Repair",
    grand_total: 15000,
    downpayment: 5000,
    remaining: 10000,
    status: "Completed",
    branch_id: 2,
    branches: { id: 2, name: "Branch 2", prefix: "B2" },
  },
];

// ─── Mock Line Items ────────────────────────────────────────────────────────

export const DEMO_LINE_ITEMS: BillingLineItem[] = [
  {
    id: "demo-li-001",
    billing_account_id: "demo-account-001",
    job_order_id: 90001,
    branch_id: 1,
    type: "charge",
    description: "JO DEMO-101 - LCD Screen Replacement",
    amount: 5500,
    balance_at_time: 5500,
    due_date: "2026-03-15",
    created_by: null,
    created_at: "2026-02-15T10:00:00Z",
    branches: { id: 1, name: "Main Branch", prefix: "MB" },
    joborders: { id: 90001, order_no: "DEMO-101", status: "Completed" },
    paid_amount: 5500,
  },
  {
    id: "demo-li-002",
    billing_account_id: "demo-account-001",
    job_order_id: 90002,
    branch_id: 1,
    type: "charge",
    description: "JO DEMO-102 - Battery Replacement",
    amount: 2500,
    balance_at_time: 8000,
    due_date: "2026-03-15",
    created_by: null,
    created_at: "2026-02-20T14:00:00Z",
    branches: { id: 1, name: "Main Branch", prefix: "MB" },
    joborders: { id: 90002, order_no: "DEMO-102", status: "In Progress" },
    paid_amount: 0,
  },
  {
    id: "demo-li-003",
    billing_account_id: "demo-account-001",
    job_order_id: 90003,
    branch_id: 2,
    type: "charge",
    description: "JO DEMO-103 - Motherboard Repair",
    amount: 10000,
    balance_at_time: 18000,
    due_date: "2026-04-15",
    created_by: null,
    created_at: "2026-03-01T09:00:00Z",
    branches: { id: 2, name: "Branch 2", prefix: "B2" },
    joborders: { id: 90003, order_no: "DEMO-103", status: "Completed" },
    paid_amount: 0,
  },
  {
    id: "demo-li-004",
    billing_account_id: "demo-account-001",
    job_order_id: null,
    branch_id: 1,
    type: "interest",
    description: "Interest - March 2026 (2% on overdue balance of 5,500)",
    amount: 110,
    balance_at_time: 18110,
    due_date: "2026-04-15",
    created_by: null,
    created_at: "2026-03-15T00:00:00Z",
    branches: { id: 1, name: "Main Branch", prefix: "MB" },
    paid_amount: 0,
  },
];

// ─── Mock Payments ──────────────────────────────────────────────────────────

export const DEMO_PAYMENTS: BillingPayment[] = [
  {
    id: "demo-pay-001",
    billing_account_id: "demo-account-001",
    amount: 5500,
    payment_date: "2026-03-10",
    payment_method: "Cash",
    reference_number: null,
    notes: "Full payment for LCD Screen Replacement",
    created_by: null,
    created_at: "2026-03-10T14:30:00Z",
    allocations: [
      {
        id: "demo-alloc-001",
        billing_payment_id: "demo-pay-001",
        billing_line_item_id: "demo-li-001",
        amount: 5500,
        created_at: "2026-03-10T14:30:00Z",
      },
    ],
  },
  {
    id: "demo-pay-002",
    billing_account_id: "demo-account-001",
    amount: 2500,
    payment_date: "2026-03-15",
    payment_method: "Bank Transfer",
    reference_number: "BT-2026-0315",
    notes: "Partial payment",
    created_by: null,
    created_at: "2026-03-15T10:00:00Z",
    allocations: [
      {
        id: "demo-alloc-002",
        billing_payment_id: "demo-pay-002",
        billing_line_item_id: "demo-li-002",
        amount: 2500,
        created_at: "2026-03-15T10:00:00Z",
      },
    ],
  },
];

// ─── Mock Aging ─────────────────────────────────────────────────────────────

export const DEMO_AGING: BillingAging = {
  current_amount: 10110,
  days_1_30: 0,
  days_31_60: 0,
  days_61_90: 0,
  days_90_plus: 0,
};

// ─── Mock Balance ───────────────────────────────────────────────────────────

export const DEMO_BALANCE = 10110; // 18110 total charges - 8000 payments

// ─── Mock Ledger ────────────────────────────────────────────────────────────

export const DEMO_LEDGER: LedgerEntry[] = (() => {
  const entries: LedgerEntry[] = [
    {
      id: "demo-li-001",
      date: "2026-02-15T10:00:00Z",
      type: "charge",
      description: "JO DEMO-101 - LCD Screen Replacement",
      debit: 5500,
      credit: 0,
      balance: 5500,
      branch: "Main Branch",
      source: "line_item",
    },
    {
      id: "demo-li-002",
      date: "2026-02-20T14:00:00Z",
      type: "charge",
      description: "JO DEMO-102 - Battery Replacement",
      debit: 2500,
      credit: 0,
      balance: 8000,
      branch: "Main Branch",
      source: "line_item",
    },
    {
      id: "demo-li-003",
      date: "2026-03-01T09:00:00Z",
      type: "charge",
      description: "JO DEMO-103 - Motherboard Repair",
      debit: 10000,
      credit: 0,
      balance: 18000,
      branch: "Branch 2",
      source: "line_item",
    },
    {
      id: "demo-pay-001",
      date: "2026-03-10T14:30:00Z",
      type: "payment",
      description: "Payment - Cash",
      debit: 0,
      credit: 5500,
      balance: 12500,
      source: "payment",
    },
    {
      id: "demo-li-004",
      date: "2026-03-15T00:00:00Z",
      type: "interest",
      description: "Interest - March 2026 (2% on overdue balance of 5,500)",
      debit: 110,
      credit: 0,
      balance: 12610,
      branch: "Main Branch",
      source: "line_item",
    },
    {
      id: "demo-pay-002",
      date: "2026-03-15T10:00:00Z",
      type: "payment",
      description: "Payment - Bank Transfer (BT-2026-0315)",
      debit: 0,
      credit: 2500,
      balance: 10110,
      source: "payment",
    },
  ];
  return entries;
})();

// ─── Mock Statement ─────────────────────────────────────────────────────────

export const DEMO_STATEMENT: BillingStatement = {
  id: "demo-stmt-001",
  billing_account_id: "demo-account-001",
  statement_number: "SOA-BADEMO001-2026-03",
  period_start: "2026-03-01",
  period_end: "2026-03-31",
  previous_balance: 8000,
  new_charges: 10000,
  payments_received: 8000,
  interest_applied: 110,
  current_balance: 10110,
  due_date: "2026-04-15",
  branch_filter: null,
  status: "draft",
  generated_by: null,
  generated_at: "2026-03-31T16:00:00Z",
  sent_at: null,
  pdf_url: null,
};

// ─── Demo Step Definitions ──────────────────────────────────────────────────

export type DemoStep = {
  id: number;
  title: string;
  subtitle: string;
  guide: string;
  action?: string;
};

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: "Billing Accounts List",
    subtitle: "Your billing accounts at a glance",
    guide:
      "This is your billing accounts overview. Each client with a billing account appears here with their current balance, status, and contact info.",
    action: 'Click on "Sunshine Electronics Corp." to view details',
  },
  {
    id: 2,
    title: "Account Detail",
    subtitle: "Full account overview and ledger",
    guide:
      "This is the account detail view. You can see the running balance, aging summary, credit limit usage, and full transaction ledger — all in one place.",
    action: 'Click "Attach Job Order" to add charges to this account',
  },
  {
    id: 3,
    title: "Attach Job Order",
    subtitle: "Transfer job order balances to billing",
    guide:
      "Select job orders to transfer their remaining balance to this billing account. The client pays later through the billing account instead of paying per job order.",
    action: "Select a job order and confirm the transfer",
  },
  {
    id: 4,
    title: "Record Payment",
    subtitle: "Track client payments",
    guide:
      "Record payments when the client pays. Payments are automatically allocated to the oldest charges first (FIFO), or you can manually allocate to specific job orders.",
    action: "Review the payment details and confirm",
  },
  {
    id: 5,
    title: "Generate Statement",
    subtitle: "Create a Statement of Account (SOA)",
    guide:
      "Generate statements monthly or anytime. Preview the statement breakdown before finalizing, then export as PDF or send directly to the client.",
    action: "Review the statement preview",
  },
  {
    id: 6,
    title: "Dashboard Integration",
    subtitle: "Billing data on your dashboard",
    guide:
      "Billing revenue and receivables appear on your main dashboard alongside regular collections. Track total receivables, overdue accounts, and collection performance at a glance.",
  },
  {
    id: 7,
    title: "Tour Complete",
    subtitle: "You've seen the full billing workflow",
    guide:
      "That's everything! The billing system handles the full cycle — from attaching job orders, to recording payments, to generating professional statements. When activated, all of this works with your real data.",
  },
];
