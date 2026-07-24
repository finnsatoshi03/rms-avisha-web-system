import { JobOrderAgingRow, JobOrderEvent } from "../lib/types";
import { withEffectiveUserEmail } from "../lib/effective-user-email";
import { ACTIVE_AGING_STATUSES } from "../components/job-order/aging-config";
import { supabase } from "./supabase";

/**
 * Status transition history for a single job order (Phase 1 feature —
 * docs/JOB_ORDER_STATUS_HISTORY.md). Rows are written only by the
 * log_joborder_status_change trigger, and RLS makes this table read-only, so
 * this is the sole access path from the app.
 *
 * Returned oldest-first so callers can compute per-stage durations by walking
 * consecutive rows; the timeline UI reverses it for display.
 */
export async function getJobOrderEvents(
  jobOrderId: number
): Promise<JobOrderEvent[]> {
  const { data, error } = await supabase
    .from("joborder_events")
    .select(
      `id, joborder_id, from_status, to_status, changed_at, note,
       actor:changed_by (id, fullname, email, migrated_email)`
    )
    .eq("joborder_id", jobOrderId)
    // changed_at is the primary sort; id breaks ties for events written in the
    // same transaction (e.g. rapid successive updates).
    .order("changed_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching job order events:", error);
    throw new Error("Status history could not be loaded");
  }

  return ((data ?? []) as unknown as JobOrderEvent[]).map((event) => ({
    ...event,
    actor: event.actor
      ? withEffectiveUserEmail(event.actor) ?? event.actor
      : null,
  }));
}

type AgingScope = {
  branchId?: number | null;
  technicianId?: string | null;
};

/**
 * Data for the Job Order Aging board: every active (non-terminal) job order,
 * annotated with when it entered its current status so the UI can compute how
 * long it has been sitting there.
 *
 * The active set is small (well under a few hundred rows), so we fetch it and
 * its events in two round-trips and stitch them together client-side rather
 * than adding a database view/RPC. "When it entered the current status" is the
 * newest joborder_events row for the order — status changes always append an
 * event, so the latest event is the current-status entry.
 */
export async function getJobOrderAging(
  scope: AgingScope = {}
): Promise<JobOrderAgingRow[]> {
  let query = supabase
    .from("joborders")
    .select(
      `id, order_no, status, created_at, machine_type, problem_statement,
       technical_report, technician_id,
       clients:client_id (name),
       users:technician_id (fullname, email, migrated_email),
       branches:branch_id (location)`
    )
    .in("status", ACTIVE_AGING_STATUSES as unknown as string[])
    .is("deleted_at", null);

  // Same scoping the Job Orders page uses: managers see their branch,
  // technicians see only their own orders, admins/devs see everything.
  if (scope.branchId != null) query = query.eq("branch_id", scope.branchId);
  if (scope.technicianId) query = query.eq("technician_id", scope.technicianId);

  const { data: orders, error } = await query;
  if (error) {
    console.error("Error fetching active job orders for aging:", error);
    throw new Error("Aging board could not be loaded");
  }

  const orderRows = (orders ?? []) as unknown as Array<{
    id: number;
    order_no: string | null;
    status: string;
    created_at: string;
    machine_type: string | null;
    problem_statement: string | null;
    technical_report: string | null;
    technician_id: string | null;
    clients: { name: string | null } | null;
    users: { fullname: string | null } | null;
    branches: { location: string | null } | null;
  }>;

  if (orderRows.length === 0) return [];

  const ids = orderRows.map((o) => o.id);
  const { data: events, error: eventsError } = await supabase
    .from("joborder_events")
    .select("joborder_id, changed_at, note")
    .in("joborder_id", ids)
    .order("changed_at", { ascending: false })
    .order("id", { ascending: false });

  if (eventsError) {
    console.error("Error fetching events for aging:", eventsError);
    throw new Error("Aging board could not be loaded");
  }

  // First row per order wins because events are sorted newest-first.
  const latestByOrder = new Map<
    number,
    { changed_at: string; note: string | null }
  >();
  for (const ev of (events ?? []) as Array<{
    joborder_id: number;
    changed_at: string;
    note: string | null;
  }>) {
    if (!latestByOrder.has(ev.joborder_id)) {
      latestByOrder.set(ev.joborder_id, {
        changed_at: ev.changed_at,
        note: ev.note,
      });
    }
  }

  return orderRows.map((o) => {
    // Fall back to created_at if an order somehow has no event row.
    const latest = latestByOrder.get(o.id);
    return {
      id: o.id,
      order_no: o.order_no,
      status: o.status,
      client_name: o.clients?.name ?? null,
      technician_id: o.technician_id,
      technician_name: o.users?.fullname ?? null,
      branch_location: o.branches?.location ?? null,
      machine_type: o.machine_type,
      problem_statement: o.problem_statement,
      created_at: o.created_at,
      hasReport: Boolean(o.technical_report && o.technical_report.trim()),
      enteredStatusAt: latest?.changed_at ?? o.created_at,
      isEstimate: latest ? latest.note === "backfilled" : true,
    };
  });
}
