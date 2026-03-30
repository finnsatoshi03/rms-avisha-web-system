import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import {
  TransactionDateMode,
  formatDateLabel,
  getTodayDateString,
  normalizeDateOnly,
  resolveTransactionDateFromMode,
} from "../../lib/transaction-date";
import { cn } from "../../lib/utils";

interface TransactionDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceLabel: "Job Order" | "Rental";
  sourceDate: string | null;
  itemCount?: number;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultMode?: TransactionDateMode;
  initialCustomDate?: string | null;
  pending?: boolean;
  onConfirm: (selection: {
    mode: TransactionDateMode;
    customDate: string | null;
    transactionDate: string;
  }) => Promise<void> | void;
}

interface DateOptionCardProps {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  sublabel?: React.ReactNode;
  children?: React.ReactNode;
}

function DateOptionCard({
  selected,
  disabled,
  onClick,
  label,
  sublabel,
  children,
}: DateOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg border-2 p-3 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-muted-foreground/40 hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected ? "border-primary bg-primary" : "border-muted-foreground/40"
          )}
        >
          {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />}
        </div>
        <div className="flex-1 space-y-1 min-w-0">
          <p className={cn("text-sm font-medium leading-none", selected && "text-primary")}>
            {label}
          </p>
          {sublabel && (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          )}
          {children}
        </div>
      </div>
    </button>
  );
}

export default function TransactionDateDialog({
  open,
  onOpenChange,
  sourceLabel,
  sourceDate,
  itemCount = 1,
  title = "Select Transaction Date",
  description = "Choose which date should be used for this billing entry:",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  defaultMode = "source",
  initialCustomDate,
  pending = false,
  onConfirm,
}: TransactionDateDialogProps) {
  const [mode, setMode] = useState<TransactionDateMode>(defaultMode);
  const [customDate, setCustomDate] = useState<string | null>(
    normalizeDateOnly(initialCustomDate)
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusy = pending || isSubmitting;
  const todayDate = useMemo(() => getTodayDateString(), []);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setCustomDate(normalizeDateOnly(initialCustomDate));
    setError(null);
    setIsSubmitting(false);
  }, [defaultMode, initialCustomDate, open]);

  const sourceDateLabel = formatDateLabel(sourceDate);
  const todayDateLabel = formatDateLabel(todayDate);
  const hasMultipleItems = itemCount > 1;

  function selectMode(next: TransactionDateMode) {
    if (isBusy) return;
    setMode(next);
    setError(null);
  }

  const handleConfirm = async () => {
    const resolved = resolveTransactionDateFromMode({
      mode,
      sourceDate,
      customDate,
    });

    if (resolved.error || !resolved.transactionDate) {
      setError(resolved.error || "Transaction date is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onConfirm({
        mode,
        customDate: normalizeDateOnly(customDate),
        transactionDate: resolved.transactionDate,
      });
      onOpenChange(false);
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.message) {
        setError(caughtError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isBusy ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        closeDisabled={isBusy}
        onEscapeKeyDown={(event) => {
          if (isBusy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isBusy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">{description}</p>

          <div className="space-y-2">
            <DateOptionCard
              selected={mode === "current"}
              disabled={isBusy}
              onClick={() => selectMode("current")}
              label="Use Current Date"
              sublabel={todayDateLabel}
            />

            <DateOptionCard
              selected={mode === "source"}
              disabled={isBusy}
              onClick={() => selectMode("source")}
              label={`Use ${sourceLabel} Date`}
              sublabel={
                hasMultipleItems
                  ? `Applies each selected ${sourceLabel.toLowerCase()} original date${sourceDateLabel !== "—" ? ` (e.g., ${sourceDateLabel})` : ""}`
                  : sourceDateLabel
              }
            />

            <DateOptionCard
              selected={mode === "custom"}
              disabled={isBusy}
              onClick={() => selectMode("custom")}
              label="Use Custom Date"
            >
              <DatePicker
                value={customDate || undefined}
                onChange={(nextDate) => {
                  setCustomDate(nextDate);
                  setError(null);
                }}
                disabled={isBusy || mode !== "custom"}
                placeholder="Pick date"
                className="mt-1.5 text-xs"
              />
            </DateOptionCard>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            {cancelLabel}
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={isBusy}>
            {isBusy ? "Saving..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
