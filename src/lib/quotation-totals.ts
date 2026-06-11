import { computeTransactionTotal, roundCurrency } from "./transaction-totals";

type NumericInput = number | string | null | undefined;

type QuotationAmountItem = {
  amount?: NumericInput;
  total_amount?: NumericInput;
  qty?: NumericInput;
  quantity?: NumericInput;
  unit_price?: NumericInput;
  unitPrice?: NumericInput;
  is_manual?: boolean | null;
};

export type ComputeQuotationTotalInput = {
  labor_rate?: NumericInput;
  labor_amount?: NumericInput;
  service_fee?: NumericInput;
  total_quote?: NumericInput;
  downpayment?: NumericInput;
  materials?: QuotationAmountItem[] | null;
  manual_items?: QuotationAmountItem[] | null;
  quotation_items?: QuotationAmountItem[] | null;
  material_total?: NumericInput;
  include_manual_items?: boolean;
  discount?: NumericInput;
};

export type QuotationTotalBreakdown = {
  labor_rate: number;
  labor_amount: number;
  labor_total: number;
  service_fee: number;
  inventory_material_total: number;
  manual_items_total: number;
  material_total: number;
  subtotal: number;
  discount: number;
  downpayment: number;
  total_before_downpayment: number;
  grand_total: number;
};

type QuotationFinancialShape = {
  subtotal?: NumericInput;
  discount?: NumericInput;
  downpayment?: NumericInput;
  labor_rate?: NumericInput;
  amount?: NumericInput;
  service_fee?: NumericInput;
  total_quote?: NumericInput;
  quotation_items?: QuotationAmountItem[] | null;
  include_manual_items?: boolean | null;
};

function toCurrencyNumber(value: NumericInput): number {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(numericValue, 0);
}

export function resolveQuotationDownpayment(
  quotationDownpayment: NumericInput,
  legacyJobOrderDownpayment?: NumericInput
): number | undefined {
  if (quotationDownpayment !== undefined && quotationDownpayment !== null) {
    return roundCurrency(toCurrencyNumber(quotationDownpayment));
  }

  if (
    legacyJobOrderDownpayment !== undefined &&
    legacyJobOrderDownpayment !== null
  ) {
    return roundCurrency(toCurrencyNumber(legacyJobOrderDownpayment));
  }

  return undefined;
}

function resolveItemAmount(item: QuotationAmountItem): number {
  if (item.amount !== undefined && item.amount !== null) {
    return toCurrencyNumber(item.amount);
  }

  if (item.total_amount !== undefined && item.total_amount !== null) {
    return toCurrencyNumber(item.total_amount);
  }

  const qty = toCurrencyNumber(item.qty ?? item.quantity);
  const unitPrice = toCurrencyNumber(item.unit_price ?? item.unitPrice);
  return roundCurrency(qty * unitPrice);
}

function sumItemAmounts(items: QuotationAmountItem[]): number {
  const total = items.reduce((sum, item) => sum + resolveItemAmount(item), 0);
  return roundCurrency(total);
}

export function computeQuotationTotal(
  input: ComputeQuotationTotalInput
): QuotationTotalBreakdown {
  const discount = roundCurrency(toCurrencyNumber(input.discount));
  const quotationItems = input.quotation_items ?? [];
  const inventoryItems =
    input.materials ??
    quotationItems.filter((item) => !item?.is_manual);
  const manualItems =
    input.manual_items ??
    quotationItems.filter((item) => Boolean(item?.is_manual));

  const labor_rate = roundCurrency(toCurrencyNumber(input.labor_rate));
  const explicitLaborAmountProvided =
    input.labor_amount !== undefined && input.labor_amount !== null;
  const inferredLaborAmount = Math.max(
    roundCurrency(toCurrencyNumber(input.service_fee) - labor_rate),
    0
  );
  const labor_amount = roundCurrency(
    explicitLaborAmountProvided
      ? toCurrencyNumber(input.labor_amount)
      : inferredLaborAmount
  );
  const labor_total = roundCurrency(labor_rate + labor_amount);

  const inventory_material_total = sumItemAmounts(inventoryItems);
  const includeManualItems = input.include_manual_items ?? true;
  const manualItemsRawTotal = sumItemAmounts(manualItems);
  const manual_items_total = includeManualItems ? manualItemsRawTotal : 0;

  let material_total = roundCurrency(
    inventory_material_total + manual_items_total
  );

  // Backward compatibility for rows where item-level data is unavailable.
  if (inventoryItems.length === 0 && manualItems.length === 0) {
    const fallbackRawSubtotal = roundCurrency(toCurrencyNumber(input.material_total));
    const storedGrandTotal = roundCurrency(toCurrencyNumber(input.total_quote));

    const legacyGrandTotal = computeTransactionTotal({
      subTotal: roundCurrency(labor_total + fallbackRawSubtotal),
      discount,
      downpayment: 0,
    }).totalBeforeDownpayment;

    const combinedGrandTotal = computeTransactionTotal({
      subTotal: fallbackRawSubtotal,
      discount,
      downpayment: 0,
    }).totalBeforeDownpayment;

    const useCombinedSubtotalAssumption =
      storedGrandTotal > 0 &&
      Math.abs(storedGrandTotal - combinedGrandTotal) <
        Math.abs(storedGrandTotal - legacyGrandTotal);

    material_total = useCombinedSubtotalAssumption
      ? Math.max(roundCurrency(fallbackRawSubtotal - labor_total), 0)
      : fallbackRawSubtotal;
  }

  const subtotal = roundCurrency(labor_total + material_total);
  const explicitDownpaymentProvided =
    input.downpayment !== undefined && input.downpayment !== null;
  const totalsBeforeDownpayment = computeTransactionTotal({
    subTotal: subtotal,
    discount,
    downpayment: 0,
  });

  const storedGrandTotal = roundCurrency(toCurrencyNumber(input.total_quote));
  const canInferDownpayment =
    !explicitDownpaymentProvided &&
    input.total_quote !== undefined &&
    input.total_quote !== null &&
    storedGrandTotal > 0;

  const inferredDownpayment = canInferDownpayment
    ? Math.max(
        roundCurrency(
          totalsBeforeDownpayment.totalBeforeDownpayment - storedGrandTotal
        ),
        0
      )
    : 0;

  const downpayment = explicitDownpaymentProvided
    ? roundCurrency(toCurrencyNumber(input.downpayment))
    : inferredDownpayment;

  const totals = computeTransactionTotal({
    subTotal: subtotal,
    discount,
    downpayment,
  });
  const total_before_downpayment = totals.totalBeforeDownpayment;
  const grand_total = totals.totalAmount;

  return {
    labor_rate,
    labor_amount,
    labor_total,
    service_fee: labor_total,
    inventory_material_total,
    manual_items_total: roundCurrency(manual_items_total),
    material_total,
    subtotal,
    discount,
    downpayment,
    total_before_downpayment,
    grand_total,
  };
}

export function withComputedQuotationTotals<T extends QuotationFinancialShape>(
  quotation: T,
  options?: { include_manual_items?: boolean }
): T & {
  subtotal: number;
  discount: number;
  downpayment: number;
  labor_rate: number;
  amount: number;
  service_fee: number;
  total_quote: number;
  labor_total: number;
  material_total: number;
  inventory_material_total: number;
  manual_items_total: number;
  total_before_downpayment: number;
  grand_total: number;
} {
  const totals = computeQuotationTotal({
    labor_rate: quotation.labor_rate,
    labor_amount: quotation.amount,
    service_fee: quotation.service_fee,
    total_quote: quotation.total_quote,
    downpayment: quotation.downpayment,
    quotation_items: quotation.quotation_items,
    material_total: quotation.subtotal,
    include_manual_items:
      options?.include_manual_items ??
      (quotation.include_manual_items ?? true),
    discount: quotation.discount,
  });

  return {
    ...quotation,
    subtotal: totals.subtotal,
    discount: totals.discount,
    downpayment: totals.downpayment,
    labor_rate: totals.labor_rate,
    amount: totals.labor_amount,
    service_fee: totals.service_fee,
    total_quote: totals.grand_total,
    labor_total: totals.labor_total,
    material_total: totals.material_total,
    inventory_material_total: totals.inventory_material_total,
    manual_items_total: totals.manual_items_total,
    total_before_downpayment: totals.total_before_downpayment,
    grand_total: totals.grand_total,
  };
}
