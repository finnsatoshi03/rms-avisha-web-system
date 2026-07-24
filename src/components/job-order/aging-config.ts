// Configuration for the Job Order Aging board (Phase 3 —
// docs/JOB_ORDER_STATUS_HISTORY.md). Kept separate from the UI so the shop can
// tune what counts as "stuck" without touching component code.

// Statuses that represent an in-progress repair worklist. Terminal statuses
// (Completed, Pull Out, Canceled) and Quotation (which lives on the Quotations
// page) are intentionally excluded — the aging board is about work still moving.
export const ACTIVE_AGING_STATUSES = [
  "Pending",
  "For Approval",
  "Repairing",
  "Waiting Parts",
  "On hold",
  "Ready for Pickup",
  "For Collection",
  "For Billing",
] as const;

// Days a job order may sit in a given status before it is flagged overdue.
// Tune these to match the shop's real service expectations.
export const AGING_THRESHOLDS: Record<string, number> = {
  Pending: 2,
  "For Approval": 3,
  Repairing: 5,
  "Waiting Parts": 7,
  "On hold": 14,
  "Ready for Pickup": 5,
  "For Collection": 5,
  "For Billing": 7,
};

// Fallback for any status not explicitly listed above.
export const DEFAULT_AGING_THRESHOLD = 7;

export function thresholdForStatus(status: string): number {
  return AGING_THRESHOLDS[status] ?? DEFAULT_AGING_THRESHOLD;
}
