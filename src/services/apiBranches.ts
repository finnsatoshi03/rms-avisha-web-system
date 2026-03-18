import { supabase } from "./supabase";

export type BranchRecord = {
  id: number;
  name: string;
  location: string;
  prefix: string;
  pdf_header: string | null;
  pdf_footer: string | null;
  created_at: string | null;
};

export type CreateBranchPayload = {
  name: string;
  prefix?: string | null;
  pdf_header?: string | null;
  pdf_footer?: string | null;
};

export type UpdateBranchPayload = {
  name: string;
  pdf_header?: string | null;
  pdf_footer?: string | null;
};

export type BranchDependencyCounts = {
  joborders_count: number;
  clients_count: number;
  material_stocks_count: number;
  expenses_count: number;
  technicians_count: number;
  quotations_count: number;
  units_count: number;
  rentals_count: number;
};

type BranchRow = {
  id: number;
  name: string | null;
  location: string | null;
  prefix: string | null;
  pdf_header: string | null;
  pdf_footer: string | null;
  created_at: string | null;
};

const MANUAL_PREFIX_REGEX = /^[0-9]{2}$/;
const MIN_DYNAMIC_PREFIX = 3;
const MAX_PREFIX = 99;

function toBranchRecord(row: BranchRow): BranchRecord {
  const fallbackName = row.name || row.location || `Branch ${row.id}`;
  return {
    id: row.id,
    name: fallbackName,
    location: row.location || fallbackName,
    prefix: row.prefix || "00",
    pdf_header: row.pdf_header,
    pdf_footer: row.pdf_footer,
    created_at: row.created_at,
  };
}

export function isValidManualPrefix(prefix: string) {
  if (!MANUAL_PREFIX_REGEX.test(prefix)) {
    return false;
  }

  const asNumber = Number(prefix);
  return asNumber >= MIN_DYNAMIC_PREFIX && asNumber <= MAX_PREFIX;
}

export function getNextAvailablePrefix(existingPrefixes: string[]): string {
  const used = new Set(existingPrefixes);
  for (let value = MIN_DYNAMIC_PREFIX; value <= MAX_PREFIX; value += 1) {
    const candidate = value.toString().padStart(2, "0");
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("No available prefix left. Maximum prefix 99 has been reached.");
}

export async function getBranches(): Promise<BranchRecord[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, location, prefix, pdf_header, pdf_footer, created_at")
    .order("prefix", { ascending: true });

  if (error) {
    throw new Error("Branches could not be fetched");
  }

  return (data || []).map((row) => toBranchRecord(row as BranchRow));
}

export async function getBranchById(branchId: number): Promise<BranchRecord> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, location, prefix, pdf_header, pdf_footer, created_at")
    .eq("id", branchId)
    .single();

  if (error || !data) {
    throw new Error("Branch could not be fetched");
  }

  return toBranchRecord(data as BranchRow);
}

async function resolveBranchPrefix(inputPrefix?: string | null): Promise<string> {
  const trimmed = inputPrefix?.trim() ?? "";
  if (trimmed) {
    if (!isValidManualPrefix(trimmed)) {
      throw new Error("Prefix must be a unique 2-digit number between 03 and 99.");
    }

    return trimmed;
  }

  const branches = await getBranches();
  return getNextAvailablePrefix(branches.map((branch) => branch.prefix));
}

export async function createBranch(payload: CreateBranchPayload): Promise<BranchRecord> {
  const name = payload.name.trim();
  if (!name) {
    throw new Error("Branch name is required.");
  }

  const prefix = await resolveBranchPrefix(payload.prefix);

  const { data, error } = await supabase
    .from("branches")
    .insert({
      name,
      location: name,
      prefix,
      pdf_header: payload.pdf_header ?? "",
      pdf_footer: payload.pdf_footer ?? "No Copy no claim",
    })
    .select("id, name, location, prefix, pdf_header, pdf_footer, created_at")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      if (error.message?.includes("branches_pkey")) {
        throw new Error(
          "Branch ID generator is out of sync. Please retry. If the issue persists, run the latest migrations."
        );
      }
      throw new Error("Branch name or prefix already exists.");
    }

    throw new Error("Branch could not be created.");
  }

  return toBranchRecord(data as BranchRow);
}

export async function updateBranch(
  branchId: number,
  payload: UpdateBranchPayload
): Promise<BranchRecord> {
  const name = payload.name.trim();
  if (!name) {
    throw new Error("Branch name is required.");
  }

  const { data, error } = await supabase
    .from("branches")
    .update({
      name,
      location: name,
      pdf_header: payload.pdf_header ?? "",
      pdf_footer: payload.pdf_footer ?? "No Copy no claim",
    })
    .eq("id", branchId)
    .select("id, name, location, prefix, pdf_header, pdf_footer, created_at")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new Error("Branch name already exists.");
    }

    throw new Error("Branch could not be updated.");
  }

  return toBranchRecord(data as BranchRow);
}

export async function getBranchDependencyCounts(
  branchId: number
): Promise<BranchDependencyCounts> {
  const { data, error } = await supabase.rpc("get_branch_dependency_counts", {
    p_branch_id: branchId,
  });

  if (error) {
    throw new Error("Failed to check branch dependencies.");
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | BranchDependencyCounts
    | undefined;

  return {
    joborders_count: Number(row?.joborders_count ?? 0),
    clients_count: Number(row?.clients_count ?? 0),
    material_stocks_count: Number(row?.material_stocks_count ?? 0),
    expenses_count: Number(row?.expenses_count ?? 0),
    technicians_count: Number(row?.technicians_count ?? 0),
    quotations_count: Number(row?.quotations_count ?? 0),
    units_count: Number(row?.units_count ?? 0),
    rentals_count: Number(row?.rentals_count ?? 0),
  };
}

export function hasBranchDependencies(counts: BranchDependencyCounts): boolean {
  return (
    counts.joborders_count > 0 ||
    counts.clients_count > 0 ||
    counts.material_stocks_count > 0 ||
    counts.expenses_count > 0 ||
    counts.technicians_count > 0 ||
    counts.quotations_count > 0 ||
    counts.units_count > 0 ||
    counts.rentals_count > 0
  );
}

export async function deleteBranch(branchId: number) {
  const { error } = await supabase.from("branches").delete().eq("id", branchId);
  if (error) {
    throw new Error("Branch could not be deleted.");
  }
}

export async function getBranchJobOrderCounts(): Promise<Record<number, number>> {
  const { data, error } = await supabase.from("joborders").select("branch_id");

  if (error) {
    throw new Error("Job order counts per branch could not be fetched.");
  }

  return (data || []).reduce((acc, row) => {
    if (typeof row.branch_id === "number") {
      acc[row.branch_id] = (acc[row.branch_id] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);
}
