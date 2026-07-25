import { getServerNow } from "../lib/server-time";
import { supabase } from "./supabase";
import {
  DEFAULT_CONSUMPTION_WINDOW_DAYS,
  StockSeverity,
  severityFor,
} from "../components/inventory/inventory-config";

/**
 * Inventory low-stock / reorder intelligence (Phase 1 —
 * docs/INVENTORY_LOW_STOCK.md).
 *
 * Read-only. Two data sources are stitched together client-side:
 *
 *  - public.material_stocks is the SKU catalog and the on-hand quantity. It is
 *    soft-deleted via a `deleted` boolean, and the board only ever lists active
 *    (deleted = false) rows.
 *  - public.materials is the per-job-order consumption line. It has NO timestamp
 *    of its own, so "when was this consumed" has to come from the parent job
 *    order's created_at — hence the inner join on joborders.
 *
 * The active catalog is ~200 rows and the whole materials table is under a
 * thousand rows, so two bounded round-trips beat adding a database view.
 */

export interface LowStockRow {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  stocks: number;
  branch_id: number | null;
  location: string | null;
  cost: number | null;
  price: number | null;
  last_stocks_added: string | null;
  /** Total quantity consumed inside the window. */
  consumed: number;
  /** Distinct job orders that consumed this SKU inside the window. */
  consumingOrders: number;
  /** Window length in days, echoed so the UI can label the burn rate. */
  windowDays: number;
  /** consumed / windowDays. Zero when there is no usage in the window. */
  dailyBurn: number;
  /** stocks / dailyBurn, or null when burn is zero (no usable estimate). */
  daysToDepletion: number | null;
  severity: StockSeverity;
}

export interface LowStockScope {
  /** Restrict to one branch. Managers pass their own branch; admins may filter. */
  branchId?: number | null;
  /** Consumption lookback window in days. */
  windowDays?: number;
}

type StockRow = {
  id: number;
  material_name: string | null;
  sku: string | null;
  category: string | null;
  brand: string | null;
  stocks: number | null;
  branch_id: number | null;
  cost: number | null;
  // material_stocks.price is numeric, which PostgREST returns as a string.
  price: number | string | null;
  last_stocks_added: string | null;
  branches: { location: string | null } | null;
};

type ConsumptionRow = {
  material_id: number | null;
  quantity: number | null;
  job_order_id: number | null;
};

function toNumber(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function windowStart(days: number): string {
  const since = getServerNow();
  since.setDate(since.getDate() - days);
  return since.toISOString();
}

/**
 * Active SKUs annotated with recent consumption, burn rate and projected
 * depletion. Returned most-urgent-first: out of stock, then soonest depletion,
 * then lowest quantity.
 */
export async function getLowStock(
  scope: LowStockScope = {}
): Promise<LowStockRow[]> {
  const windowDays = scope.windowDays ?? DEFAULT_CONSUMPTION_WINDOW_DAYS;

  // 1. The active catalog. Same branch scoping the Job Orders page uses:
  //    managers see their branch, admins/devs see everything.
  let stockQuery = supabase
    .from("material_stocks")
    .select(
      `id, material_name, sku, category, brand, stocks, branch_id, cost, price,
       last_stocks_added,
       branches:branch_id (location)`
    )
    .eq("deleted", false);

  if (scope.branchId != null) {
    stockQuery = stockQuery.eq("branch_id", scope.branchId);
  }

  const { data: stocks, error: stockError } = await stockQuery;
  if (stockError) {
    console.error("Error fetching material stocks for low-stock board:", stockError);
    throw new Error("Low stock board could not be loaded");
  }

  const stockRows = (stocks ?? []) as unknown as StockRow[];
  if (stockRows.length === 0) return [];

  // 2. Consumption inside the window. The !inner join on joborders is what
  //    makes the created_at / deleted_at filters apply — materials carries no
  //    timestamp and no soft-delete flag of its own. Restricting to the active
  //    SKU ids also drops lines pointing at already-deleted material_stocks
  //    rows, of which this database has plenty.
  const activeIds = stockRows.map((row) => row.id);
  const { data: usage, error: usageError } = await supabase
    .from("materials")
    .select("material_id, quantity, job_order_id, joborders!inner(created_at)")
    .in("material_id", activeIds)
    .gte("joborders.created_at", windowStart(windowDays))
    .is("joborders.deleted_at", null);

  if (usageError) {
    console.error("Error fetching material consumption:", usageError);
    throw new Error("Low stock board could not be loaded");
  }

  const consumedBySku = new Map<number, { qty: number; orders: Set<number> }>();
  ((usage ?? []) as unknown as ConsumptionRow[]).forEach((line) => {
    if (line.material_id == null) return;
    const entry = consumedBySku.get(line.material_id) ?? {
      qty: 0,
      orders: new Set<number>(),
    };
    entry.qty += line.quantity ?? 0;
    if (line.job_order_id != null) entry.orders.add(line.job_order_id);
    consumedBySku.set(line.material_id, entry);
  });

  const rows: LowStockRow[] = stockRows.map((row) => {
    const stocksOnHand = row.stocks ?? 0;
    const usageEntry = consumedBySku.get(row.id);
    const consumed = usageEntry?.qty ?? 0;
    const dailyBurn = consumed / windowDays;
    // No usage in the window means no defensible estimate — surface that as
    // "unknown" rather than dividing by zero or implying infinite runway.
    const daysToDepletion =
      dailyBurn > 0 ? stocksOnHand / dailyBurn : null;

    return {
      id: row.id,
      name: (row.material_name ?? "").trim() || "Unnamed material",
      sku: row.sku,
      category: row.category?.trim() ? row.category.trim() : null,
      brand: row.brand?.trim() ? row.brand.trim() : null,
      stocks: stocksOnHand,
      branch_id: row.branch_id,
      location: row.branches?.location ?? null,
      cost: toNumber(row.cost),
      price: toNumber(row.price),
      last_stocks_added: row.last_stocks_added,
      consumed,
      consumingOrders: usageEntry?.orders.size ?? 0,
      windowDays,
      dailyBurn,
      daysToDepletion,
      severity: severityFor(stocksOnHand, daysToDepletion),
    };
  });

  return sortByUrgency(rows);
}

/** Out of stock first, then soonest projected depletion, then lowest on-hand. */
export function sortByUrgency(rows: LowStockRow[]): LowStockRow[] {
  return [...rows].sort((a, b) => {
    if (a.stocks <= 0 !== (b.stocks <= 0)) return a.stocks <= 0 ? -1 : 1;

    // Rows with an estimate sort ahead of rows without one, soonest first.
    if (a.daysToDepletion != null && b.daysToDepletion != null) {
      if (a.daysToDepletion !== b.daysToDepletion)
        return a.daysToDepletion - b.daysToDepletion;
    } else if (a.daysToDepletion != null) {
      return -1;
    } else if (b.daysToDepletion != null) {
      return 1;
    }

    if (a.stocks !== b.stocks) return a.stocks - b.stocks;
    return a.name.localeCompare(b.name);
  });
}

export interface SkuConsumptionEvent {
  id: number;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  material_description: string | null;
  job_order_id: number | null;
  order_no: string | null;
  status: string | null;
  client_name: string | null;
  /** The parent job order's created_at — the only timestamp available. */
  consumed_at: string | null;
}

/**
 * Consumption history for a single SKU, newest first. Deliberately NOT limited
 * to the board's window: the detail sheet is where you go to find out whether a
 * SKU with "no recent usage" has ever moved at all.
 */
export async function getSkuConsumption(
  materialId: number,
  limit = 50
): Promise<SkuConsumptionEvent[]> {
  const { data, error } = await supabase
    .from("materials")
    .select(
      `id, quantity, unit_price, total_amount, material_description, job_order_id,
       joborders!inner (order_no, status, created_at, clients:client_id (name))`
    )
    .eq("material_id", materialId)
    .is("joborders.deleted_at", null)
    .order("created_at", { referencedTable: "joborders", ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching SKU consumption history:", error);
    throw new Error("Consumption history could not be loaded");
  }

  const rows = (data ?? []) as unknown as Array<{
    id: number;
    quantity: number | null;
    unit_price: number | null;
    total_amount: number | null;
    material_description: string | null;
    job_order_id: number | null;
    joborders: {
      order_no: string | null;
      status: string | null;
      created_at: string | null;
      clients: { name: string | null } | null;
    } | null;
  }>;

  return rows
    .map((row) => ({
      id: row.id,
      quantity: row.quantity ?? 0,
      unit_price: row.unit_price,
      total_amount: row.total_amount,
      material_description: row.material_description,
      job_order_id: row.job_order_id,
      order_no: row.joborders?.order_no ?? null,
      status: row.joborders?.status ?? null,
      client_name: row.joborders?.clients?.name ?? null,
      consumed_at: row.joborders?.created_at ?? null,
    }))
    // PostgREST orders on the embedded table, but sorting here keeps the sheet
    // correct even if that ordering is ever dropped.
    .sort((a, b) => (b.consumed_at ?? "").localeCompare(a.consumed_at ?? ""));
}
