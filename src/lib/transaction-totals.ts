type NumericInput = number | null | undefined;

function toCurrencyNumber(value: NumericInput): number {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(numericValue, 0);
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function amountsMatch(
  left: number,
  right: number,
  tolerance = 0.01
): boolean {
  return Math.abs(roundCurrency(left) - roundCurrency(right)) <= tolerance;
}

export type TransactionTotalInput = {
  subTotal: NumericInput;
  discount?: NumericInput;
  downpayment?: NumericInput;
};

export type TransactionTotalBreakdown = {
  subTotal: number;
  discount: number;
  downpayment: number;
  totalBeforeDownpayment: number;
  totalAmount: number;
};

export type StoredAmountDueInput = {
  grandTotal?: NumericInput;
  subTotal: NumericInput;
  discount?: NumericInput;
  downpayment?: NumericInput;
};

export function computeTransactionTotal({
  subTotal,
  discount = 0,
  downpayment = 0,
}: TransactionTotalInput): TransactionTotalBreakdown {
  const normalizedSubTotal = toCurrencyNumber(subTotal);
  const normalizedDiscount = toCurrencyNumber(discount);
  const normalizedDownpayment = toCurrencyNumber(downpayment);

  const totalBeforeDownpayment = Math.max(
    roundCurrency(normalizedSubTotal - normalizedDiscount),
    0
  );
  const totalAmount = Math.max(
    roundCurrency(totalBeforeDownpayment - normalizedDownpayment),
    0
  );

  return {
    subTotal: roundCurrency(normalizedSubTotal),
    discount: roundCurrency(normalizedDiscount),
    downpayment: roundCurrency(normalizedDownpayment),
    totalBeforeDownpayment,
    totalAmount,
  };
}

export function computeStoredAmountDue({
  grandTotal = 0,
  subTotal,
  discount = 0,
  downpayment = 0,
}: StoredAmountDueInput): number {
  const normalizedGrandTotal = toCurrencyNumber(grandTotal);
  const normalizedDownpayment = toCurrencyNumber(downpayment);
  const totals = computeTransactionTotal({
    subTotal,
    discount,
    downpayment,
  });

  if (normalizedGrandTotal <= 0) {
    return totals.totalAmount;
  }

  // Backward compatibility:
  // legacy rows may have grand_total stored before downpayment deduction.
  if (
    normalizedDownpayment > 0 &&
    amountsMatch(normalizedGrandTotal, totals.totalBeforeDownpayment)
  ) {
    return Math.max(roundCurrency(normalizedGrandTotal - normalizedDownpayment), 0);
  }

  return roundCurrency(normalizedGrandTotal);
}
