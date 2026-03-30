import { useCallback, useRef, useState } from "react";

export type TransactionPhase =
  | "idle"
  | "confirming"
  | "loading"
  | "success"
  | "error";

interface RunTransactionOptions {
  errorMessage?: string;
  successMessage?: string;
  keepSuccessStateMs?: number;
}

function toErrorMessage(
  error: unknown,
  fallback = "Transaction failed. Please try again."
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function useTransactionHandler() {
  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const setConfirming = useCallback(() => {
    setPhase("confirming");
    setError(null);
    setSuccessMessage(null);
  }, []);

  const setIdle = useCallback(() => {
    setPhase("idle");
  }, []);

  const reset = useCallback(() => {
    inFlightRef.current = false;
    setPhase("idle");
    setError(null);
    setSuccessMessage(null);
  }, []);

  const run = useCallback(
    async (
      transaction: () => Promise<void>,
      options?: RunTransactionOptions
    ): Promise<boolean> => {
      if (inFlightRef.current) {
        return false;
      }

      inFlightRef.current = true;
      setPhase("loading");
      setError(null);
      setSuccessMessage(null);

      try {
        await transaction();
        setSuccessMessage(options?.successMessage ?? null);
        setPhase("success");

        if ((options?.keepSuccessStateMs ?? 0) > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, options?.keepSuccessStateMs)
          );
        }

        return true;
      } catch (err) {
        setError(toErrorMessage(err, options?.errorMessage));
        setPhase("error");
        return false;
      } finally {
        inFlightRef.current = false;
      }
    },
    []
  );

  return {
    phase,
    error,
    successMessage,
    isLoading: phase === "loading",
    isConfirming: phase === "confirming",
    isSuccess: phase === "success",
    isError: phase === "error",
    isLocked: phase === "loading",
    setConfirming,
    setIdle,
    setPhase,
    setError,
    reset,
    run,
  };
}
