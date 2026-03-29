export type TourStep = {
  target: string; // CSS selector (data-tour attribute)
  title: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right";
  clickBefore?: string; // CSS selector to click before showing this step
  typeInto?: { selector: string; value: string }; // simulate typing into an input
  waitMs?: number; // ms to wait after actions for DOM to update
};

export type TourDefinition = {
  featureKey: string;
  steps: TourStep[];
};

const tours: Record<string, TourDefinition> = {
  client_auto_suggest: {
    featureKey: "client_auto_suggest",
    steps: [
      {
        target: '[data-tour="client-search-field"]',
        title: "Find your client here",
        content:
          "Just click this field and start typing your client's name or phone number. We'll look them up for you automatically — no need to remember the exact spelling!",
        placement: "bottom",
      },
      {
        target: '[data-tour="client-search-dropdown"]',
        title: "Pick the right client",
        content:
          "Your matches will show up here. If the name isn't spelled exactly right, don't worry — we'll still suggest close matches under \"Did you mean?\" so you can pick the right one.",
        placement: "bottom",
        clickBefore: '[data-tour="client-search-field"]',
        typeInto: { selector: '[cmdk-input]', value: "san" },
        waitMs: 800,
      },
      {
        target: '[data-tour="client-create-button"]',
        title: "New client? Add them here",
        content:
          "If the client is brand new and not in the system yet, just click this button to add them right away — no need to go to a separate page.",
        placement: "top",
        clickBefore: '[data-tour="client-search-field"]',
        waitMs: 400,
      },
    ],
  },

  rental_assets: {
    featureKey: "rental_assets",
    steps: [
      {
        target: '[data-tour="rental-assets-search"]',
        title: "Search your printers",
        content:
          "Quickly find any printer by typing its name, model, or serial number. Results filter instantly as you type.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-assets-add"]',
        title: "Add a new printer",
        content:
          "Click here to register a new rental printer. You'll set the unit name, model, serial number, daily and monthly rates, and assign it to a branch.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-assets-table"]',
        title: "Your printer fleet",
        content:
          "All your rental printers are listed here. You can see each unit's name, model, serial number, status, branch, and billing rates at a glance.",
        placement: "top",
      },
      {
        target: '[data-tour="rental-assets-status"]',
        title: "Track printer status",
        content:
          "Each printer shows its current status — Available, Rented, Maintenance, or Retired. Hover over a rented printer to see which client has it.",
        placement: "left",
      },
      {
        target: '[data-tour="rental-assets-rates"]',
        title: "Daily & monthly rates",
        content:
          "These columns show the billing rates for each printer. When creating a rental, the rate is automatically pulled based on the rental type you choose.",
        placement: "left",
      },
    ],
  },

  rental_management: {
    featureKey: "rental_management",
    steps: [
      {
        target: '[data-tour="rentals-search"]',
        title: "Find any rental",
        content:
          "Search by rental number, client name, status, or technician. Results update as you type so you can find what you need fast.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-add"]',
        title: "Create a new rental",
        content:
          "Click here to start a new rental. You'll fill in the client details, pick a printer, set the rental period, and add any consumables — all in one form.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-add-printer"]',
        title: "Quick-add a printer",
        content:
          "Need to add a new printer first? This shortcut takes you straight to the Rental Printers page to register one.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-overdue-filter"]',
        title: "Spot overdue rentals",
        content:
          "Click here to filter and show only overdue rentals. Overdue rows are also highlighted in red in the table so they're easy to spot.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-status-filters"]',
        title: "Filter by status",
        content:
          "Click any status badge to filter rentals — Created, Released, Ongoing, Returned, Completed, or Cancelled. You can combine multiple filters too.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-table"]',
        title: "Your rental records",
        content:
          "All rentals are listed here with key details — rental number, client, printer, status, dates, technician, and total amount. Click any row to view full details, manage consumables, record inspections, and more.",
        placement: "top",
      },
    ],
  },
  rental_create: {
    featureKey: "rental_create",
    steps: [
      {
        target: '[data-tour="rental-create-client"]',
        title: "Start with the client",
        content:
          "Search for an existing client by name or phone number, or create a new one right here. Their contact info fills in automatically.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-create-basic-info"]',
        title: "Contact & technician",
        content:
          "Review the client's contact number and email, and assign a technician who will handle this rental.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-create-details"]',
        title: "Set up the rental",
        content:
          "Pick a printer, choose daily or monthly billing, and set the start date. The rate and due date calculate automatically based on your selections.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-create-consumables"]',
        title: "Add consumables",
        content:
          "Need to include ink, toner, or other supplies? Add them here — pick from inventory (stock is auto-deducted) or enter items manually.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-create-summary"]',
        title: "Review & submit",
        content:
          "Check the billing summary — rate, consumables, discount, and downpayment all roll up into the grand total. Hit Create Rental when you're ready!",
        placement: "left",
      },
    ],
  },

  billing_accounts: {
    featureKey: "billing_accounts",
    steps: [
      {
        target: '[data-tour="billing-search"]',
        title: "Find billing accounts",
        content:
          "Search by client name, account number, or phone number. Results filter instantly as you type.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-status-filter"]',
        title: "Filter by status",
        content:
          "Narrow down to Active, Suspended, or Closed accounts. Useful when you have many accounts to manage.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-create"]',
        title: "Create a billing account",
        content:
          "Click here to set up a new billing account for a client. You'll set credit limits, interest rates, and billing contact details.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-table"]',
        title: "Your billing accounts",
        content:
          "All accounts are listed here with key details — account number, client, credit limit, and status. Click any row to open the full account view where you can record payments, attach job orders or rentals, generate statements, and more.",
        placement: "top",
      },
    ],
  },

  billing_account_create: {
    featureKey: "billing_account_create",
    steps: [
      {
        target: '[data-tour="billing-form-client"]',
        title: "Select a client",
        content:
          "Search for an existing client by name or phone number, or create a new one right here. Each client can only have one billing account.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-form-contact"]',
        title: "Billing contact info",
        content:
          "Set the billing contact name, email, and phone number. The email is used for sending automated reminders and statements, so make sure it's correct!",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-form-settings"]',
        title: "Account settings",
        content:
          "Configure the credit limit (0 = unlimited), billing cutoff day (1-28), and the monthly interest rate applied to overdue balances. These settings control how the automated billing system behaves.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-form-submit"]',
        title: "Create the account",
        content:
          "Once everything looks good, hit Create. The system auto-generates an account number and the account starts as Active immediately.",
        placement: "top",
      },
    ],
  },

  billing_account_detail: {
    featureKey: "billing_account_detail",
    steps: [
      {
        target: '[data-tour="billing-detail-header"]',
        title: "Account overview",
        content:
          "This shows the account number, status (Active/Suspended/Closed), client name, and contact details. Everything you need to identify the account at a glance.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-balance"]',
        title: "Balance & aging",
        content:
          "The total unpaid balance across all charges. Below it, you'll see the aging breakdown — how old each unpaid amount is (Current, 1-30 days, 31-60, etc.). If there's a credit limit, the usage bar shows how close they are to the cap.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-actions"]',
        title: "Core actions",
        content:
          "These are your day-to-day tools: record a Payment, attach a Job Order or Rental to transfer its balance here, or generate a Statement of Account (SOA). Each opens a side panel on the right.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-action-payment"]',
        title: "Payment action",
        content:
          "Use this to record client payments with amount, method, date, and reference number.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-action-attach-jo"]',
        title: "Attach JO action",
        content:
          "Transfer one or more job order balances into this billing account for consolidated collection.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-action-attach-rental"]',
        title: "Attach Rental action",
        content:
          "Transfer rental balances into this account so they are tracked and collected through billing.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-action-statement"]',
        title: "Statement action",
        content:
          "Open the statement generator to prepare a Statement of Account using billing period defaults.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-action-edit"]',
        title: "Edit action",
        content:
          "Update account settings like credit limit, cutoff day, and billing contact details.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-admin-interest"]',
        title: "Apply interest manually",
        content:
          "Manually apply monthly interest on overdue balances. This is a fallback — the system automatically applies interest daily at 2:00 AM UTC via a scheduled job. Use this button if you need to trigger it early or re-apply.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-dialog-interest"]',
        title: "Apply interest dialog",
        content:
          "This confirmation dialog previews overdue balance, interest rate, and estimated charge before applying.",
        placement: "bottom",
        clickBefore: '[data-tour="billing-detail-admin-interest"]',
        waitMs: 350,
      },
      {
        target: '[data-tour="billing-detail-admin-reminders"]',
        title: "Send reminders manually",
        content:
          "Manually send billing reminders to all qualifying accounts. The system automatically sends reminders on the 1st of every month at 9:00 AM UTC. This button is your manual override.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-dialog-reminders"]',
        title: "Send reminders dialog",
        content:
          "Review account balance and recipient before triggering reminder emails for all qualifying active accounts.",
        placement: "bottom",
        clickBefore: '[data-tour="billing-detail-admin-reminders"]',
        waitMs: 350,
      },
      {
        target: '[data-tour="billing-detail-admin-soa"]',
        title: "Auto-generate statements",
        content:
          "Manually trigger SOA generation for all active accounts. The system does this automatically on the 2nd of every month at 10:00 AM UTC. Statements are created as finalized and auto-emailed to clients.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-dialog-soa"]',
        title: "Auto-generate SOA dialog",
        content:
          "This dialog summarizes cutoff details and latest statement context before generating and emailing SOAs.",
        placement: "bottom",
        clickBefore: '[data-tour="billing-detail-admin-soa"]',
        waitMs: 350,
      },
      {
        target: '[data-tour="billing-detail-ledger"]',
        title: "Transaction ledger",
        content:
          "The complete history of all charges, payments, interest, and adjustments. Each row shows the date, type, description, and a running balance. Use the filter buttons at the top-right to show only Job Orders or Rentals.",
        placement: "top",
      },
      {
        target: '[data-tour="billing-detail-source-filter"]',
        title: "Filter by source",
        content:
          "Toggle between All, Job Orders only, or Rentals only. This makes it easy to see charges from a specific source without the noise of the other.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-jo-section"]',
        title: "Attached job orders",
        content:
          "All job orders transferred to this account appear here. You can see the JO number, branch, amount, how much has been paid, and whether it's Paid, Partial, or Unpaid.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-jo-table"]',
        title: "Job orders table",
        content:
          "This table lists each attached job order with amount, paid amount, and payment status.",
        placement: "bottom",
        clickBefore: '[data-tour="billing-detail-jo-section"]',
        waitMs: 300,
      },
      {
        target: '[data-tour="billing-detail-rental-section"]',
        title: "Attached rentals",
        content:
          "Same as job orders but for rentals. When a rental is transferred to billing, its remaining balance shows up here and gets tracked just like a job order charge.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-rental-table"]',
        title: "Rentals table",
        content:
          "See each attached rental with branch, total amount, paid amount, and current status.",
        placement: "bottom",
        clickBefore: '[data-tour="billing-detail-rental-section"]',
        waitMs: 300,
      },
      {
        target: '[data-tour="billing-detail-payments-section"]',
        title: "Payment history",
        content:
          "Every payment recorded for this account — with date, amount, method (Cash, GCash, Bank Transfer, etc.), and reference number. Payments are allocated to charges via FIFO or manual selection.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-payments-table"]',
        title: "Payments table",
        content:
          "Recorded payments are shown here with amount, method, date, and reference details.",
        placement: "bottom",
        clickBefore: '[data-tour="billing-detail-payments-section"]',
        waitMs: 300,
      },
      {
        target: '[data-tour="billing-detail-statements-section"]',
        title: "Statements (SOA)",
        content:
          "Generated Statement of Account documents. Each shows the billing period, interest applied, current balance, and status (Draft → Finalized → Sent). You can finalize, email, or download PDF copies from here.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-statements-table"]',
        title: "Statements table",
        content:
          "Review generated statements, statuses, send/resend actions, and PDF download options.",
        placement: "bottom",
        clickBefore: '[data-tour="billing-detail-statements-section"]',
        waitMs: 300,
      },
      {
        target: '[data-tour="billing-detail-interest-logs"]',
        title: "Interest history",
        content:
          "An audit trail of every interest charge applied. Shows the billing cycle, overdue balance at the time, the rate used, and the calculated interest amount. Useful for transparency and dispute resolution.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-interest-table"]',
        title: "Interest table",
        content:
          "Each applied interest entry is listed with cycle, overdue basis, rate, and computed amount.",
        placement: "bottom",
        clickBefore: '[data-tour="billing-detail-interest-logs"]',
        waitMs: 300,
      },
      {
        target: '[data-tour="billing-detail-email-logs"]',
        title: "Email history",
        content:
          "Track every email sent for this account — billing reminders, statements, and notifications. See the status (Sent, Failed, Pending) and recipient. If a send fails, the error message is shown on hover.",
        placement: "bottom",
      },
      {
        target: '[data-tour="billing-detail-email-table"]',
        title: "Email table",
        content:
          "Email logs include type, recipient, sent status, and failure context when delivery fails.",
        placement: "bottom",
        clickBefore: '[data-tour="billing-detail-email-logs"]',
        waitMs: 300,
      },
      {
        target: '[data-tour="billing-detail-dialog-payment"]',
        title: "Payment panel",
        content:
          "This panel records payments and supports FIFO or manual allocation to unpaid line items.",
        placement: "left",
        clickBefore: '[data-tour="billing-detail-action-payment"]',
        waitMs: 350,
      },
      {
        target: '[data-tour="billing-detail-dialog-attach-jo"]',
        title: "Attach JO panel",
        content:
          "Select eligible job orders, review transfer totals, and move balances to this billing account.",
        placement: "left",
        clickBefore: '[data-tour="billing-detail-action-attach-jo"]',
        waitMs: 350,
      },
      {
        target: '[data-tour="billing-detail-dialog-attach-rental"]',
        title: "Attach Rental panel",
        content:
          "Select rentals for transfer so their remaining balances are tracked through this account.",
        placement: "left",
        clickBefore: '[data-tour="billing-detail-action-attach-rental"]',
        waitMs: 350,
      },
      {
        target: '[data-tour="billing-detail-dialog-statement"]',
        title: "Statement panel",
        content:
          "Generate SOAs with period defaults, then finalize and send them from the statements list.",
        placement: "left",
        clickBefore: '[data-tour="billing-detail-action-statement"]',
        waitMs: 350,
      },
      {
        target: '[data-tour="billing-detail-dialog-edit"]',
        title: "Edit panel",
        content:
          "Update account configuration and billing contact data without leaving the detail sheet.",
        placement: "left",
        clickBefore: '[data-tour="billing-detail-action-edit"]',
        waitMs: 350,
      },
    ],
  },

  rental_asset_create: {
    featureKey: "rental_asset_create",
    steps: [
      {
        target: '[data-tour="rental-asset-create-info"]',
        title: "Identify the printer",
        content:
          "Enter the printer's name (e.g., \"Epson L3210\"), model number, and serial number so your team can easily find and track it.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-asset-create-rates"]',
        title: "Set the rental rates",
        content:
          "Enter the daily and monthly rates. When someone creates a rental, the correct rate fills in automatically based on the billing type they choose.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-asset-create-submit"]',
        title: "Save the printer",
        content:
          "Add any notes if needed, then click the button to register this printer. It'll show up as Available and ready to rent out!",
        placement: "top",
      },
    ],
  },
};

export function getTourDefinition(featureKey: string): TourDefinition | null {
  return tours[featureKey] || null;
}
