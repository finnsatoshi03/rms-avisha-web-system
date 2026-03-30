import { format } from "date-fns";

export type TransactionDateMode = "current" | "source" | "custom";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function getTodayDateString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function normalizeDateOnly(
  value: string | Date | null | undefined
): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return format(value, "yyyy-MM-dd");
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (DATE_ONLY_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes("T") && DATE_ONLY_REGEX.test(trimmed.slice(0, 10))) {
    return trimmed.slice(0, 10);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "yyyy-MM-dd");
}

export function formatDateLabel(value: string | null | undefined): string {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return "—";
  return format(new Date(`${normalized}T00:00:00`), "MMM d, yyyy");
}

export function isFutureDate(dateValue: string): boolean {
  const normalized = normalizeDateOnly(dateValue);
  if (!normalized) return false;
  return normalized > getTodayDateString();
}

export function resolveTransactionDateFromMode(params: {
  mode: TransactionDateMode;
  sourceDate?: string | null;
  customDate?: string | null;
}): { transactionDate: string | null; error: string | null } {
  const today = getTodayDateString();

  if (params.mode === "current") {
    return { transactionDate: today, error: null };
  }

  if (params.mode === "source") {
    const sourceDate = normalizeDateOnly(params.sourceDate);
    if (!sourceDate) {
      return { transactionDate: null, error: "Source date is unavailable." };
    }
    if (isFutureDate(sourceDate)) {
      return {
        transactionDate: null,
        error: "Source date cannot be in the future.",
      };
    }
    return { transactionDate: sourceDate, error: null };
  }

  const customDate = normalizeDateOnly(params.customDate);
  if (!customDate) {
    return { transactionDate: null, error: "Please select a custom date." };
  }
  if (isFutureDate(customDate)) {
    return {
      transactionDate: null,
      error: "Transaction date cannot be in the future.",
    };
  }

  return { transactionDate: customDate, error: null };
}
