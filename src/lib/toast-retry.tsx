import toast from "react-hot-toast";

/**
 * Error toast with an inline Retry button. Use for mutations that are safe to
 * re-run as-is (idempotent updates like status changes, refetches, resends).
 * Don't use it for actions that could double-apply (payments, inserts).
 */
export function toastErrorWithRetry(message: string, onRetry: () => void) {
  toast.error(
    (t) => (
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id);
            onRetry();
          }}
          className="shrink-0 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    ),
    { duration: 8000 }
  );
}
