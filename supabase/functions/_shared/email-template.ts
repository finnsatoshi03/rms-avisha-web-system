/**
 * Shared email template for all billing-related emails.
 * Ensures consistent branding across reminders, statements, and notifications.
 */

function formatPeso(amount: number): string {
  return `&#8369;${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

type TableRow = {
  label: string;
  value: string;
  highlight?: "danger" | "success" | "warning" | "bold";
  large?: boolean;
};

type EmailTemplateOptions = {
  title: string;
  clientName: string;
  bodyText: string;
  rows: TableRow[];
  footerNote?: string;
  totalRow?: { label: string; value: string };
};

function highlightStyle(h?: TableRow["highlight"], large?: boolean): string {
  const base = large ? "font-size: 18px; " : "";
  switch (h) {
    case "danger":
      return `${base}font-weight: bold; color: #dc2626;`;
    case "success":
      return `${base}font-weight: bold; color: #16a34a;`;
    case "warning":
      return `${base}font-weight: bold; color: #d97706;`;
    case "bold":
      return `${base}font-weight: bold;`;
    default:
      return base;
  }
}

export function buildEmailHtml(options: EmailTemplateOptions): string {
  const { title, clientName, bodyText, rows, footerNote, totalRow } = options;

  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${r.label}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; ${highlightStyle(r.highlight, r.large)}">${r.value}</td>
      </tr>`
    )
    .join("");

  const totalRowHtml = totalRow
    ? `
      <tr style="background: #1e3a5f;">
        <td style="padding: 14px 16px; color: #ffffff; font-weight: bold; border-radius: 0 0 0 8px;">${totalRow.label}</td>
        <td style="padding: 14px 16px; color: #ffffff; font-weight: bold; text-align: right; font-size: 20px; border-radius: 0 0 8px 0;">${totalRow.value}</td>
      </tr>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${title}</h2>
        <p style="margin: 5px 0 0; opacity: 0.8;">RMS Avisha Repair Management System</p>
      </div>

      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${clientName}</strong>,</p>

        <p>${bodyText}</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 8px; overflow: hidden;">
          ${tableRows}
          ${totalRowHtml}
        </table>

        ${footerNote ? `<p>${footerNote}</p>` : ""}

        <p>If you have already made a payment, please disregard this notice.</p>

        <p>Thank you for your continued patronage.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This is an automated message from RMS Avisha Billing System.<br/>
          Please do not reply directly to this email.
        </p>
      </div>
    </div>
  `;
}

// ─── Pre-built templates ─────────────────────────────────────────────────

export function buildReminderEmail(params: {
  clientName: string;
  accountNumber: string;
  amountDue: number;
  dueDate: string;
  interestRate: number;
}): string {
  return buildEmailHtml({
    title: "Billing Reminder",
    clientName: params.clientName,
    bodyText: "This is a friendly reminder that your account has an outstanding balance.",
    rows: [
      { label: "Account Number", value: params.accountNumber, highlight: "bold" },
      { label: "Amount Due", value: formatPeso(params.amountDue), highlight: "danger", large: true },
      { label: "Due Date", value: params.dueDate, highlight: "bold" },
    ],
    footerNote: `Please settle your balance to avoid additional interest charges of <strong>${params.interestRate}% per month</strong> on overdue amounts.`,
  });
}

export function buildStatementEmail(params: {
  clientName: string;
  accountNumber: string;
  statementNumber: string;
  period: string;
  previousBalance: number;
  newCharges: number;
  interestApplied: number;
  paymentsReceived: number;
  totalDue: number;
  dueDate: string;
}): string {
  const rows: TableRow[] = [
    { label: "Account Number", value: params.accountNumber, highlight: "bold" },
    { label: "Statement #", value: params.statementNumber },
    { label: "Period", value: params.period },
    { label: "Previous Balance", value: formatPeso(params.previousBalance) },
    { label: "New Charges", value: formatPeso(params.newCharges) },
  ];

  if (params.interestApplied > 0) {
    rows.push({
      label: "Interest Charges",
      value: formatPeso(params.interestApplied),
      highlight: "warning",
    });
  }

  if (params.paymentsReceived > 0) {
    rows.push({
      label: "Payments Received",
      value: `-${formatPeso(params.paymentsReceived)}`,
      highlight: "success",
    });
  }

  rows.push({ label: "Due Date", value: params.dueDate, highlight: "bold" });

  return buildEmailHtml({
    title: "Statement of Account",
    clientName: params.clientName,
    bodyText: `Please find below your statement of account for the period <strong>${params.period}</strong>.`,
    rows,
    totalRow: {
      label: "Total Amount Due",
      value: formatPeso(params.totalDue),
    },
    footerNote: "Please settle your outstanding balance on or before the due date to avoid additional interest charges.",
  });
}
