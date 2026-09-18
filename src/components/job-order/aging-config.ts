// Configuration for the Job Order Aging board (Phase 3 —
// docs/JOB_ORDER_STATUS_HISTORY.md). Kept separate from the UI so the shop can
// tune what counts as "stuck" without touching component code.

import { JOB_ORDER_STATUSES } from "../../lib/job-order-statuses";

// Includes quotation preparation and jobs awaiting pullout. Closed statuses
// and the legacy Quotation status are excluded from the active worklist.
const activeStatuses = JOB_ORDER_STATUSES.filter(
  (status) => status.agingDays !== undefined,
);
export const ACTIVE_AGING_STATUSES = activeStatuses.map((status) => status.label);

// Days a job order may sit in a given status before it is flagged overdue.
// Tune these to match the shop's real service expectations.
export const AGING_THRESHOLDS: Record<string, number> = Object.fromEntries(
  activeStatuses.map((status) => [status.label, status.agingDays!]),
);

// Fallback for any status not explicitly listed above.
export const DEFAULT_AGING_THRESHOLD = 7;

export function thresholdForStatus(status: string): number {
  return AGING_THRESHOLDS[status] ?? DEFAULT_AGING_THRESHOLD;
}
