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
    billing_line_items ||--o{ billing_payment_allocations : "allocated by"
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
        numeric current_balance
        text status
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
        DA3[Apply interest]
        DA4[Send statements]
        DA5[Close/suspend accounts]
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

## 5. Revenue Flow (No Double-Counting)

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
