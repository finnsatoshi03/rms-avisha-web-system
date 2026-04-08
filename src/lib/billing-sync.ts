import { BillingPaymentStatus, BillingSourceType } from "./billing-types";

export type BillingSyncSnapshot = {
  source?: string;
  source_type?: BillingSourceType;
  source_id?: number;
  total_amount?: number;
  total_paid?: number;
  remaining_balance?: number;
  payment_status?: BillingPaymentStatus;
  updated_at?: string;
};

type BillingPaymentDetails = Record<string, unknown> & {
  billing_sync?: BillingSyncSnapshot;
};

function toNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function getBillingSyncSnapshot(
  paymentDetails: unknown
): BillingSyncSnapshot | null {
  if (!paymentDetails || typeof paymentDetails !== "object") {
    return null;
  }

  const maybeDetails = paymentDetails as BillingPaymentDetails;
  const snapshot = maybeDetails.billing_sync;

  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const sourceType = snapshot.source_type;
  const sourceId = toNumber(snapshot.source_id);

  if (
    (sourceType !== "job_order" && sourceType !== "rental") ||
    sourceId === null
  ) {
    return null;
  }

  const totalAmount = toNumber(snapshot.total_amount) ?? 0;
  const totalPaid = toNumber(snapshot.total_paid) ?? 0;
  const remainingBalance =
    toNumber(snapshot.remaining_balance) ?? Math.max(totalAmount - totalPaid, 0);

  const paymentStatus =
    snapshot.payment_status === "paid" ||
    snapshot.payment_status === "partial" ||
    snapshot.payment_status === "pending"
      ? snapshot.payment_status
      : remainingBalance <= 0
        ? "paid"
        : totalPaid > 0
          ? "partial"
          : "pending";

  return {
    source: typeof snapshot.source === "string" ? snapshot.source : "billing",
    source_type: sourceType,
    source_id: sourceId,
    total_amount: totalAmount,
    total_paid: totalPaid,
    remaining_balance: Math.max(remainingBalance, 0),
    payment_status: paymentStatus,
    updated_at:
      typeof snapshot.updated_at === "string" ? snapshot.updated_at : undefined,
  };
}

export function isBillingLinkedSource(params: {
  sourceType: BillingSourceType;
  sourceId: number;
  transferredToBilling?: boolean | null;
  paymentDetails?: unknown;
}): boolean {
  if (params.transferredToBilling) {
    return true;
  }

  const snapshot = getBillingSyncSnapshot(params.paymentDetails);
  return Boolean(
    snapshot &&
      snapshot.source_type === params.sourceType &&
      Number(snapshot.source_id) === Number(params.sourceId)
  );
}

export function getPaymentStatusLabel(
  paymentStatus: BillingPaymentStatus | null | undefined
): string {
  switch (paymentStatus) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    default:
      return "Pending";
  }
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getDirectPaymentDetailsTotal(paymentDetails: unknown): number {
  if (
    !paymentDetails ||
    typeof paymentDetails !== "object" ||
    Array.isArray(paymentDetails)
  ) {
    return 0;
  }

  const entries = Object.entries(paymentDetails as Record<string, unknown>);
  const total = entries.reduce((sum, [key, value]) => {
    if (key === "billing_sync") return sum;
    const numeric = toNumber(value);
    if (numeric === null || numeric <= 0) return sum;
    return sum + numeric;
  }, 0);

  return Math.max(roundCurrency(total), 0);
}

export function getDirectPaymentRemainingBalance(
  totalAmount: number,
  paymentDetails: unknown
): number {
  const normalizedTotal = Number.isFinite(totalAmount)
    ? Math.max(roundCurrency(totalAmount), 0)
    : 0;
  const paidTotal = getDirectPaymentDetailsTotal(paymentDetails);
  return Math.max(roundCurrency(normalizedTotal - paidTotal), 0);
}
