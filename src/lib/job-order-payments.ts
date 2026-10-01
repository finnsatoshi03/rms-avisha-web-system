import { BillingPayment } from "./billing-types";

const methodLabels: Record<string, string> = {
  cash: "Cash", check: "Check", gcash: "GCash", paymaya: "PayMaya",
  bank_transfer: "Bank Transfer", grabpay: "GrabPay", split: "Split payment",
};

export function paymentMethodLabel(method: string | null): string {
  return method ? methodLabels[method] || method.replace(/_/g, " ") : "Method not recorded";
}

export function directPaymentEntries(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return [];
  return Object.entries(details).flatMap(([method, value]) => {
    if (method === "billing_sync" || (typeof value !== "number" && typeof value !== "string")) return [];
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? [{ method, amount }] : [];
  });
}

// A billing payment can cover several orders. Display only this order's active allocation.
export function jobOrderBillingPayments(payments: BillingPayment[], orderId: number) {
  return payments.flatMap((payment) => {
    if (payment.status === "reversed") return [];
    const amount = (payment.allocations || []).reduce((sum, allocation) => {
      const item = allocation.billing_line_items;
      const matches = item?.source_type && item.source_id != null
        ? item.source_type === "job_order" && Number(item.source_id) === orderId
        : Number(item?.job_order_id) === orderId;
      const value = Number(allocation.amount);
      return matches && allocation.status !== "reversed" && Number.isFinite(value) && value > 0
        ? sum + value : sum;
    }, 0);
    return amount > 0 ? [{ ...payment, allocatedAmount: amount }] : [];
  });
}
