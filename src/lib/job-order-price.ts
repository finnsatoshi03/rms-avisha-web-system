import type { JobOrderData } from "./types";
import { computeStoredAmountDue, roundCurrency } from "./transaction-totals";

// Completed prices include the deposit already collected. Keep stored balances
// unchanged because payment collection still uses the amount after downpayment.
export function jobOrderPrice(order: Pick<JobOrderData,
  "status" | "grand_total" | "sub_total" | "labor_total" | "material_total" | "discount" | "downpayment"
>): number {
  if (order.status.toLowerCase() !== "completed") return Number(order.grand_total || 0);
  const downpayment = Math.max(Number(order.downpayment || 0), 0);
  return roundCurrency(computeStoredAmountDue({
    grandTotal: order.grand_total,
    subTotal: Number(order.sub_total || 0) > 0
      ? order.sub_total : Number(order.labor_total || 0) + Number(order.material_total || 0),
    discount: order.discount,
    downpayment,
  }) + downpayment);
}
