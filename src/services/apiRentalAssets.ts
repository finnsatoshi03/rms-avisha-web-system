import { CreateRentalAssetData } from "../lib/types";
import { supabase } from "./supabase";

export async function getRentalAssets({
  branchId = null,
  fetchAll = false,
}: {
  branchId?: number | null;
  fetchAll?: boolean;
} = {}) {
  let query = supabase
    .from("rental_assets")
    .select("*, branches:branch_id(*)");

  if (!fetchAll) {
    query = query.eq("deleted", false);
  }

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query.order("updated_at", {
    ascending: false,
  });

  if (error) {
    console.log(error);
    throw new Error("Rental assets could not be fetched");
  }

  return data;
}

export async function getAvailableAssets(branchId: number) {
  const { data, error } = await supabase
    .from("rental_assets")
    .select("*, branches:branch_id(*)")
    .eq("status", "available")
    .eq("deleted", false)
    .eq("branch_id", branchId)
    .order("unit_name", { ascending: true });

  if (error) {
    console.log(error);
    throw new Error("Available rental assets could not be fetched");
  }

  return data;
}

export async function getRentalAsset(id: number) {
  const { data, error } = await supabase
    .from("rental_assets")
    .select("*, branches:branch_id(*)")
    .eq("id", id)
    .single();

  if (error) {
    console.log(error);
    throw new Error("Rental asset could not be fetched");
  }

  return data;
}

export async function createRentalAsset(asset: CreateRentalAssetData) {
  const { data, error } = await supabase
    .from("rental_assets")
    .insert(asset)
    .select()
    .single();

  if (error) {
    console.log(error);
    throw new Error("Rental asset could not be created");
  }

  return data;
}

export async function updateRentalAsset(
  id: number,
  asset: Partial<CreateRentalAssetData>
) {
  const { data, error } = await supabase
    .from("rental_assets")
    .update(asset)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.log(error);
    throw new Error("Rental asset could not be updated");
  }

  return data;
}

export async function updateRentalAssetStatus(id: number, status: string) {
  const { error } = await supabase
    .from("rental_assets")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.log(error);
    throw new Error("Rental asset status could not be updated");
  }
}

export async function deleteRentalAsset(id: number) {
  // Check for active rentals on this asset
  const { data: activeRentals, error: checkError } = await supabase
    .from("rentals")
    .select("id")
    .eq("rental_asset_id", id)
    .is("deleted_at", null)
    .in("status", ["Created", "Released", "Ongoing"])
    .limit(1);

  if (checkError) {
    console.log(checkError);
    throw new Error("Could not verify rental asset dependencies");
  }

  if (activeRentals && activeRentals.length > 0) {
    throw new Error(
      "Cannot delete: this printer has active rentals. Return or cancel them first."
    );
  }

  // Soft delete
  const { error } = await supabase
    .from("rental_assets")
    .update({ deleted: true })
    .eq("id", id);

  if (error) {
    console.log(error);
    throw new Error("Rental asset could not be deleted");
  }
}
