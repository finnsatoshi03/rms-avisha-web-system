import React, { useState, useEffect } from "react";
import { Input } from "./input";
import { cn } from "../../lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Formats a raw phone value into +63 XXX XXX XXXX format.
 */
export function formatPhoneNumber(raw: string): string {
  let cleaned = raw.replace(/[^0-9+]/g, "");

  if (!cleaned.startsWith("+63")) {
    cleaned = "+63";
  }

  const digits = cleaned.substring(3).replace(/\D/g, "").substring(0, 10);

  const parts = ["+63"];
  if (digits.length > 0) parts.push(" " + digits.substring(0, 3));
  if (digits.length > 3) parts.push(" " + digits.substring(3, 6));
  if (digits.length > 6) parts.push(" " + digits.substring(6, 10));

  return parts.join("").trim();
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = "+63 9XX XXX XXXX",
  className,
  disabled = false,
}: PhoneInputProps) {
  const [display, setDisplay] = useState(() => formatPhoneNumber(value || "+63 "));

  useEffect(() => {
    if (value !== display) {
      setDisplay(formatPhoneNumber(value || "+63 "));
    }
    // Only sync when external value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setDisplay(formatted);
    onChange(formatted);
  };

  return (
    <Input
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(className)}
      disabled={disabled}
    />
  );
}
