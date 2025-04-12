import { useState } from "react";

export function useDownpayment(grandTotal: number, initialValue?: number) {
  const [downpaymentValue, setDownpaymentValue] = useState<number | null>(
    initialValue || null
  );
  const [downpaymentError, setDownpaymentError] = useState<string | null>(null);

  const handleDownpaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value > grandTotal) {
      setDownpaymentError("Downpayment cannot exceed the grand total.");
    } else {
      setDownpaymentError(null);
      setDownpaymentValue(value >= 0 ? value : 0);
    }
  };

  return { downpaymentValue, downpaymentError, handleDownpaymentChange };
}
