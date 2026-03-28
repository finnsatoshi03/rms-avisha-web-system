# Billing System (SOA) - Phase 3 Workflow Diagrams

## 1. System Workflow - Transfer & Payment Flow

```mermaid
flowchart TD
    A[Job Order Created] --> B{Client pays at JO level?}
    B -->|Yes - Path A: Regular| C[Downpayment / Full Payment on JO]
    C --> D{Fully paid?}
    D -->|Yes| E[Complete JO - Payment Dialog]
    D -->|No| F{Transfer remaining to billing?}

    B -->|No payment yet| F

    F -->|No| G[JO stays in regular flow]
    F -->|Yes - Path B: Billing| H{Client has billing account?}

    H -->|No| I[Create Billing Account]
    I --> J
    H -->|Yes| J[Transfer to Billing]

    J --> K[transfer_job_order_to_billing]
    K --> L[Create billing_line_item\nwith remaining balance]
    K --> M[Mark JO: transferred_to_billing = true]
    K --> N{Credit limit exceeded?}
    N -->|Yes| O[Show warning - don't block]
    N -->|No| P[Transfer complete]
    O --> P

    P --> Q[JO completable without\npayment dialog]

    L --> R[Billing Account Ledger]

    S[Record Payment on\nBilling Account] --> T{Allocation mode?}
    T -->|FIFO| U[Auto-allocate to\noldest items first]
    T -->|Manual| V[User selects\nspecific line items]

    U --> R
    V --> R

    R --> W[Generate Statement]
    W --> X[PDF / Email to Client]

    style A fill:#e0f2fe
    style E fill:#dcfce7
    style J fill:#fef3c7
    style P fill:#dcfce7
    style S fill:#dcfce7
    style X fill:#f3e8ff
```

## 2. Data Flow - Database Schema

```mermaid
erDiagram
    clients ||--o| billing_accounts : "has (0 or 1)"
    clients ||--o{ joborders : "has many"
    billing_accounts ||--o{ billing_line_items : "has many"
    billing_accounts ||--o{ billing_payments : "has many"
    billing_accounts ||--o{ billing_statements : "has many"
    billing_accounts ||--o{ billing_interest_logs : "has many"
    billing_accounts ||--o{ email_logs : "has many"
    billing_line_items ||--o{ billing_payment_allocations : "allocated by"
    billing_line_items ||--o| billing_interest_logs : "logged as"
    billing_payments ||--o{ billing_payment_allocations : "allocated to"
    joborders ||--o| billing_line_items : "transferred as"
    branches ||--o{ billing_line_items : "from branch"

    clients {
        bigint id PK
        varchar name
        text type
        varchar contact_number
    }

    billing_accounts {
        uuid id PK
        bigint client_id FK
        text account_number UK
        text status
        numeric credit_limit
        numeric interest_rate
        int billing_cutoff_day
    }

    billing_line_items {
        uuid id PK
        uuid billing_account_id FK
        bigint job_order_id FK
        int branch_id FK
        text type
        numeric amount
        date due_date
    }

    billing_payments {
        uuid id PK
        uuid billing_account_id FK
        numeric amount
        date payment_date
        text payment_method
    }

    billing_payment_allocations {
        uuid id PK
        uuid billing_payment_id FK
        uuid billing_line_item_id FK
        numeric amount
    }

    billing_statements {
        uuid id PK
        uuid billing_account_id FK
        text statement_number
        date period_start
        date period_end
        numeric interest_applied
        numeric current_balance
        text status
    }

    billing_interest_logs {
        uuid id PK
        uuid billing_account_id FK
        uuid billing_line_item_id FK
        timestamptz applied_at
        numeric interest_amount
        numeric rate
        numeric overdue_balance
        text billing_cycle
    }

    email_logs {
        uuid id PK
        uuid billing_account_id FK
        text recipient
        text subject
        text type
        text status
        text error_message
        jsonb metadata
        timestamptz sent_at
    }

    joborders {
        bigint id PK
        bigint client_id FK
        uuid billing_account_id FK
        boolean transferred_to_billing
        real grand_total
        real downpayment
    }
```

## 3. Frontend User Flow

```mermaid
flowchart TD
    subgraph Sidebar
        NAV[Billing Nav Item]
    end

    NAV --> LIST[Billing Accounts List\n/billing]

    LIST --> CREATE[Create Account\n/billing/new]
    LIST --> DETAIL[Account Detail\n/billing/:id]

    CREATE --> |Select client via\nauto-suggest| CREATE
    CREATE --> |Submit| LIST

    DETAIL --> EDIT[Edit Account\n/billing/:id/edit]

    subgraph "Account Detail Tabs"
        TAB1[Ledger Tab\nChronological transactions]
        TAB2[Job Orders Tab\nAttached JOs]
        TAB3[Payments Tab\nPayment history]
        TAB4[Statements Tab\nGenerated SOAs]
    end

    DETAIL --> TAB1
    DETAIL --> TAB2
    DETAIL --> TAB3
    DETAIL --> TAB4

    subgraph "Action Modals"
        MODAL1[Record Payment\n- Amount, method, date\n- FIFO or manual allocation]
        MODAL2[Attach Job Order\n- Search eligible JOs\n- Multi-select & transfer]
        MODAL3[Generate Statement\n- Period, branch filter\n- Creates SOA snapshot]
    end

    DETAIL -->|Record Payment btn| MODAL1
    DETAIL -->|Attach JO btn| MODAL2
    DETAIL -->|Generate Statement btn| MODAL3

    subgraph "JO Detail Integration"
        JO_VIEW[Job Order View Sheet]
        JO_BILLING[Billing Section\n- Shows transfer status\n- Transfer to Billing button]
    end

    JO_VIEW --> JO_BILLING
    JO_BILLING -->|Transfer| MODAL2
    JO_BILLING -->|View Account| DETAIL

    subgraph "Dashboard Integration"
        DASH[Dashboard Overview]
        WIDGET[Billing Receivables Card\n- Outstanding balance\n- Collected vs overdue\n- Overdue alert]
    end

    DASH --> WIDGET
    WIDGET -->|Click| LIST

    style LIST fill:#e0f2fe
    style DETAIL fill:#e0f2fe
    style CREATE fill:#fef3c7
    style MODAL1 fill:#dcfce7
    style MODAL2 fill:#dcfce7
    style MODAL3 fill:#f3e8ff
    style WIDGET fill:#fee2e2
```

## 4. RBAC Access Matrix

```mermaid
flowchart LR
    subgraph "Dev / Admin"
        DA1[Full CRUD all billing tables]
        DA2[All branches visible]
        DA3[Apply interest manually]
        DA4[Send statements]
        DA5[Close/suspend accounts]
        DA6[Send billing reminders manually]
        DA7[View email logs]
        DA8[View interest history]
    end

    subgraph "Manager"
        M1[View accounts with own-branch items]
        M2[Create accounts]
        M3[Record payments]
        M4[Attach own-branch JOs]
        M5[Generate own-branch statements]
    end

    subgraph "Technician"
        T1[NO billing access]
        T2[No sidebar item]
        T3[No billing section on JO view]
    end

    style DA1 fill:#dcfce7
    style M1 fill:#fef3c7
    style T1 fill:#fee2e2
```

## 5. Automated Billing System

### 5.1 Architecture Overview

```mermaid
flowchart TD
    subgraph "Scheduled Jobs (pg_cron)"
        CRON1["apply-billing-interest-daily\n0 2 * * * (2AM UTC daily)"]
        CRON2["send-billing-reminders-monthly\n0 9 1 * * (1st of month, 9AM UTC)"]
    end

    subgraph "Edge Functions"
        EF1[apply-billing-interest\nSupabase Edge Function]
        EF2[send-billing-reminders\nSupabase Edge Function]
        EF3[send-billing-statement\nExisting Edge Function]
    end

    subgraph "Database"
        BLI[billing_line_items\ntype = 'interest']
        BIL[billing_interest_logs\nAudit trail]
        EL[email_logs\nDelivery tracking]
    end

    subgraph "External"
        RESEND[Resend API\nEmail delivery]
    end

    CRON1 -->|"SQL: apply_monthly_interest()"| BLI
    CRON1 -->|Logs| BIL
    CRON2 -->|"pg_net HTTP POST"| EF2
    EF2 -->|Send emails| RESEND
    EF2 -->|Log delivery| EL
    EF3 -->|Send statement| RESEND

    subgraph "Manual Triggers (Admin/Dev)"
        MT1["'Apply Interest' button\nin Account Sheet"]
        MT2["'Send Reminders' button\nin Account Sheet"]
    end

    MT1 -->|RPC: apply_account_interest| BLI
    MT1 -->|Logs| BIL
    MT2 -->|Invoke Edge Function| EF2

    style CRON1 fill:#e0f2fe
    style CRON2 fill:#e0f2fe
    style EF1 fill:#fef3c7
    style EF2 fill:#fef3c7
    style EF3 fill:#fef3c7
    style RESEND fill:#f3e8ff
```

### 5.2 Automated Interest Application

**Schedule:** Daily at 2:00 AM UTC via `pg_cron`

**Logic:**
1. Iterates all active billing accounts
2. For each account, checks `billing_interest_logs` for existing entry in current billing cycle (YYYY-MM)
3. If already applied for this cycle, **skips** (idempotency guarantee)
4. Calculates overdue balance from `billing_line_items` (past due_date, not fully paid)
5. Applies interest: `interest_amount = overdue_balance * (interest_rate / 100)`
6. Creates a `billing_line_items` entry with `type = 'interest'`
7. Logs to `billing_interest_logs` with cycle, rate, and overdue balance

**Idempotency:** Unique constraint on `(billing_account_id, billing_cycle)` in `billing_interest_logs` prevents duplicate interest per month.

```mermaid
flowchart TD
    START[Cron fires daily at 2AM] --> FETCH[Fetch all active accounts]
    FETCH --> LOOP{For each account}
    LOOP --> CHECK{Interest already applied\nfor YYYY-MM cycle?}
    CHECK -->|Yes| SKIP[Skip - idempotent]
    CHECK -->|No| CALC[Calculate overdue balance]
    CALC --> HAS_OVERDUE{Overdue > 0?}
    HAS_OVERDUE -->|No| SKIP
    HAS_OVERDUE -->|Yes| APPLY[Create interest line item\ninterest = overdue * rate%]
    APPLY --> LOG[Log to billing_interest_logs]
    LOG --> LOOP
    SKIP --> LOOP

    style START fill:#e0f2fe
    style APPLY fill:#fef3c7
    style LOG fill:#dcfce7
    style SKIP fill:#f5f5f5
```

### 5.3 Automated Email Reminders

**Schedule:** 1st of every month at 9:00 AM UTC via `pg_cron` + `pg_net`

**Logic:**
1. Fetches all active billing accounts with client info
2. Gets outstanding balance via `get_billing_account_balance` RPC
3. Skips accounts with zero or negative balance
4. Determines recipient email (billing contact > client email)
5. Sends HTML reminder email via Resend API
6. Logs every attempt to `email_logs` table (pending > sent/failed)

**Email Content:**
- Account number, client name
- Amount due (formatted as Philippine Peso)
- Due date (based on billing cutoff day)
- Interest rate warning

```mermaid
flowchart TD
    START[Cron fires 1st of month at 9AM] --> INVOKE[pg_net calls Edge Function]
    INVOKE --> FETCH[Fetch active accounts + clients]
    FETCH --> LOOP{For each account}
    LOOP --> BAL{Outstanding balance > 0?}
    BAL -->|No| SKIP[Skip]
    BAL -->|Yes| EMAIL_CHECK{Has email address?}
    EMAIL_CHECK -->|No| FAIL_LOG[Log as failed:\nno email address]
    EMAIL_CHECK -->|Yes| SEND[Send via Resend API]
    SEND --> SUCCESS{Sent OK?}
    SUCCESS -->|Yes| SENT_LOG[Log as sent]
    SUCCESS -->|No| ERR_LOG[Log as failed\nwith error details]
    SKIP --> LOOP
    FAIL_LOG --> LOOP
    SENT_LOG --> LOOP
    ERR_LOG --> LOOP

    style START fill:#e0f2fe
    style SEND fill:#fef3c7
    style SENT_LOG fill:#dcfce7
    style FAIL_LOG fill:#fee2e2
    style ERR_LOG fill:#fee2e2
```

### 5.4 New Database Tables

```mermaid
erDiagram
    billing_accounts ||--o{ billing_interest_logs : "has many"
    billing_accounts ||--o{ email_logs : "has many"
    billing_line_items ||--o| billing_interest_logs : "logged as"

    billing_interest_logs {
        uuid id PK
        uuid billing_account_id FK
        uuid billing_line_item_id FK
        timestamptz applied_at
        numeric interest_amount
        numeric rate
        numeric overdue_balance
        text billing_cycle UK
    }

    email_logs {
        uuid id PK
        uuid billing_account_id FK
        text recipient
        text subject
        text type
        text status
        text error_message
        jsonb metadata
        timestamptz sent_at
    }
```

### 5.5 Configuration & Secrets

| Secret | Purpose | Where Set |
|--------|---------|-----------|
| `RESEND_API_KEY` | Email sending via Resend API | Supabase Dashboard > Edge Function Secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-available in Edge Functions | Built-in |
| `SUPABASE_URL` | Auto-available in Edge Functions | Built-in |

### 5.6 Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `send-billing-reminders` | Cron (monthly) or manual POST | Send billing reminder emails to all active accounts with outstanding balance |
| `apply-billing-interest` | Cron (daily) or manual POST | Apply interest to overdue accounts (idempotent per billing cycle) |
| `generate-billing-statements` | Cron (monthly) or manual POST | Auto-generate SOA for previous period, finalize, and email to clients |
| `send-billing-statement` | Manual (from UI) | Send a specific statement of account via email |

### 5.7 Cron Schedules

| Job Name | Schedule | Action |
|----------|----------|--------|
| `apply-billing-interest-daily` | `0 2 * * *` (daily 2AM UTC) | HTTP POST to `apply-billing-interest` edge function via `pg_net` |
| `send-billing-reminders-monthly` | `0 9 1 * *` (1st of month 9AM UTC) | HTTP POST to `send-billing-reminders` edge function via `pg_net` |
| `generate-billing-statements-monthly` | `0 10 2 * *` (2nd of month 10AM UTC) | HTTP POST to `generate-billing-statements` edge function via `pg_net` |

### 5.8 UI Additions

- **Balance Summary**: Shows charges subtotal, interest applied, and total due breakdown
- **Statements Table**: New "Interest" column showing `interest_applied` per statement period
- **Interest History Section**: Collapsible table showing all interest applications with cycle, rate, and amounts
- **Email History Section**: Collapsible table showing all sent/failed emails with status and error details (admin/dev only)
- **Send Reminders Button**: Manual trigger for admin/dev to send billing reminders immediately
- **Apply Interest Button**: Existing button now has idempotency - prevents duplicate interest per billing cycle

## 6. Revenue Flow (No Double-Counting)

```mermaid
flowchart TD
    JO[Job Order\ngrand_total = 10,000]

    JO --> DP[Downpayment: 3,000\nCounted as revenue immediately]
    JO --> REM[Remaining: 7,000]

    REM --> PATH_A{Path A:\nDirect Payment?}
    REM --> PATH_B{Path B:\nTransfer to Billing?}

    PATH_A -->|Yes| CASH[Cash Collected: 7,000\nJO completed, full grand_total\nin dashboard revenue]

    PATH_B -->|Yes| RECV[Billing Receivable: 7,000\nShows in billing dashboard widget\nNOT in JO revenue until collected]

    RECV --> COLLECT[Billing Payment Received]
    COLLECT --> COLLECTED[Moves from Receivable\nto Collected]

    subgraph "Dashboard Revenue"
        R1[Cash Collected\n= direct payments + downpayments]
        R2[Billing Receivables\n= transferred amounts - billing payments]
        R3[Total Revenue\n= Cash + Receivables]
    end

    style DP fill:#dcfce7
    style CASH fill:#dcfce7
    style RECV fill:#fef3c7
    style COLLECTED fill:#dcfce7
```
