import { supabase } from "./supabase";

export type BranchRecord = {
  id: number;
  location: string;
};

export async function getBranches(): Promise<BranchRecord[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, location")
    .order("id", { ascending: true });

  if (error) {
    throw new Error("Branches could not be fetched");
  }

  return data || [];
}

