import { useCallback, useEffect, useState } from "react";

export function useDownpayment(grandTotal: number, initialValue?: number) {
  const [downpaymentValue, setDownpaymentValue] = useState<number | null>(
    initialValue ?? null
  );
  const [downpaymentError, setDownpaymentError] = useState<string | null>(null);

  const setDownpaymentValueStrict = useCallback(
    (value: number | null | undefined): boolean => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        setDownpaymentError(null);
        setDownpaymentValue(null);
        return true;
      }

      const normalizedValue = Math.max(Number(value), 0);
      if (normalizedValue > grandTotal) {
        setDownpaymentError("Downpayment cannot exceed the grand total.");
        return false;
      }

      setDownpaymentError(null);
      setDownpaymentValue(normalizedValue);
      return true;
    },
    [grandTotal]
  );

  const handleDownpaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue.trim() === "") {
      setDownpaymentValueStrict(null);
      return;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      setDownpaymentError("Downpayment cannot exceed the grand total.");
      return;
    }

    setDownpaymentValueStrict(value);
  };

  useEffect(() => {
    if (downpaymentValue === null || downpaymentValue === undefined) {
      setDownpaymentError(null);
      return;
    }

    if (downpaymentValue > grandTotal) {
      const clampedValue = Math.max(grandTotal, 0);
      setDownpaymentValue(clampedValue);
      setDownpaymentError(null);
      return;
    }

    setDownpaymentError(null);
  }, [downpaymentValue, grandTotal]);

  return {
    downpaymentValue,
    downpaymentError,
    handleDownpaymentChange,
    setDownpaymentValueStrict,
  };
}
