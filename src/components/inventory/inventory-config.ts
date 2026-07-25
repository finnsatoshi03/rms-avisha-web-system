// Configuration for the Inventory Low Stock board (Phase 1 —
// docs/INVENTORY_LOW_STOCK.md). Kept separate from the UI so the shop can tune
// what counts as "low" without touching component code.
//
// There is deliberately NO reorder-threshold column on material_stocks yet, so
// these are shop-wide defaults. Phase 2 adds a per-SKU reorder_point column and
// these become the fallback for SKUs that have not been given one.

/** On-hand quantity at or below which a SKU is "critical" (but not yet out). */
export const CRITICAL_STOCK = 5;

/** On-hand quantity at or below which a SKU is "low". */
export const LOW_STOCK = 15;

/**
 * Days of consumption history used to compute burn rate. Consumption in this
 * database is sparse (about a dozen SKUs consumed per year), so a wide window
 * is the only way to get a usable signal — and most SKUs will still have no
 * usage at all. See CONSUMPTION_WINDOWS for the options exposed in the UI.
 */
export const DEFAULT_CONSUMPTION_WINDOW_DAYS = 90;

/** Windows the user can switch between on the board. */
export const CONSUMPTION_WINDOWS = [90, 180, 365] as const;

/** Projected days-to-depletion at or below which a SKU is escalated. */
export const DEPLETION_CRITICAL_DAYS = 7;
export const DEPLETION_LOW_DAYS = 30;

export type StockSeverity = "out" | "critical" | "low" | "ok";

/** Most-urgent-first ordering, used for both sorting and filter menus. */
export const SEVERITY_ORDER: StockSeverity[] = [
  "out",
  "critical",
  "low",
  "ok",
];

export const SEVERITY_LABELS: Record<StockSeverity, string> = {
  out: "Out of stock",
  critical: "Critical",
  low: "Low",
  ok: "Healthy",
};

/**
 * Severity for a SKU, from on-hand quantity and (when known) how many days of
 * stock the recent burn rate implies.
 *
 * Quantity sets the floor; a fast burn rate can only escalate, never soften.
 * `daysToDepletion` is null whenever there is no recent usage to divide by —
 * that case is treated as "no extra information", not as "healthy".
 */
export function severityFor(
  stocks: number,
  daysToDepletion: number | null
): StockSeverity {
  if (stocks <= 0) return "out";

  let severity: StockSeverity =
    stocks <= CRITICAL_STOCK ? "critical" : stocks <= LOW_STOCK ? "low" : "ok";

  if (daysToDepletion != null) {
    const byDepletion: StockSeverity =
      daysToDepletion <= DEPLETION_CRITICAL_DAYS
        ? "critical"
        : daysToDepletion <= DEPLETION_LOW_DAYS
        ? "low"
        : "ok";
    if (
      SEVERITY_ORDER.indexOf(byDepletion) < SEVERITY_ORDER.indexOf(severity)
    ) {
      severity = byDepletion;
    }
  }

  return severity;
}

/**
 * Smallest on-hand quantity that lands a SKU in the given severity band.
 *
 * The kanban lanes are derived from quantity, not stored like a job order
 * status, so dropping a card into a lane has no value to write on its own. This
 * gives the restock sheet a sensible pre-filled *suggestion* which the user then
 * confirms or overrides — the board never writes a guessed quantity silently.
 *
 * Note this ignores burn-rate escalation: a fast-moving SKU may still land in a
 * more urgent lane than the one it was dropped into, which is correct.
 */
export function suggestedStockFor(severity: StockSeverity): number {
  switch (severity) {
    case "out":
      return 0;
    case "critical":
      return 1;
    case "low":
      return CRITICAL_STOCK + 1;
    case "ok":
      return LOW_STOCK + 1;
  }
}

/** Human-readable depletion hint for a row. */
export function depletionLabel(
  stocks: number,
  daysToDepletion: number | null
): string {
  if (stocks <= 0) return "out of stock";
  if (daysToDepletion == null) return "no recent usage";
  if (daysToDepletion < 1) return "<1 day left";
  return `~${Math.floor(daysToDepletion)} days left`;
}
