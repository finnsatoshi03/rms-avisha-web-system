import { supabase } from "./supabase";

/**
 * Feature usage tracking (docs/FEATURE_USAGE_TRACKING.md). Page-visit
 * granularity: one row per navigation, admin-only to read. Admin/dev visits are
 * never recorded (the tracker hook returns early for them).
 */

export interface FeatureUsageEvent {
  id: number;
  user_id: string;
  feature: string;
  path: string;
  action: string;
  created_at: string;
  user: {
    fullname: string | null;
    email: string | null;
    role: string | null;
  } | null;
}

// Friendly labels for the top-level routes. Keep in sync with the sidebar /
// breadcrumbConfig. Unknown routes fall back to a title-cased first segment.
const FEATURE_LABELS: Record<string, string> = {
  "dashboard/job-order": "Job Order Dashboard",
  "dashboard/rental": "Rental Dashboard",
  "technician-dashboard": "Technician Dashboard",
  "job-orders": "Job Orders",
  "job-order-aging": "Aging Board",
  quotations: "Quotations",
  clients: "Clients",
  materials: "Materials",
  expenses: "Expenses",
  billing: "Billing",
  rentals: "Rentals",
  "rental-assets": "Rental Assets",
  archive: "Archive",
  branches: "Branch Management",
  technicians: "Technicians",
  settings: "Settings",
  account: "Account",
  "feature-usage": "Feature Usage",
};

/** Map a router pathname to a stable, human-friendly feature label. */
export function pathToFeature(pathname: string): string {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  if (!clean) return "Home";

  // Longest known prefix wins (e.g. "dashboard/job-order" before "dashboard").
  const match = Object.keys(FEATURE_LABELS)
    .filter((key) => clean === key || clean.startsWith(key + "/"))
    .sort((a, b) => b.length - a.length)[0];
  if (match) return FEATURE_LABELS[match];

  const first = clean.split("/")[0];
  return first
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Record a single page visit. Fire-and-forget: failures (including the table
 * not existing yet, or RLS) are swallowed so navigation is never affected.
 */
export async function logFeatureVisit(params: {
  userId: string;
  feature: string;
  path: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from("feature_usage_events").insert({
      user_id: params.userId,
      feature: params.feature,
      path: params.path,
      action: "view",
    });
    if (error) console.debug("feature usage log skipped:", error.message);
  } catch (err) {
    console.debug("feature usage log failed:", err);
  }
}

/**
 * Recent usage events within the given window (admin-only via RLS). Capped so a
 * busy log can't blow up the dashboard; aggregation happens client-side.
 */
export async function getFeatureUsage(params: {
  sinceDays: number | null;
  limit?: number;
}): Promise<FeatureUsageEvent[]> {
  let query = supabase
    .from("feature_usage_events")
    .select(
      `id, user_id, feature, path, action, created_at,
       user:user_id (fullname, email, role)`
    )
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 5000);

  if (params.sinceDays != null) {
    const since = new Date();
    since.setDate(since.getDate() - params.sinceDays);
    query = query.gte("created_at", since.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching feature usage:", error);
    throw new Error("Feature usage could not be loaded");
  }
  return (data ?? []) as unknown as FeatureUsageEvent[];
}
