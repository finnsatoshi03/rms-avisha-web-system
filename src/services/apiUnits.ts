import { RentalUnitFormType } from "../components/rental/unit-form";
import { supabase } from "./supabase";

export async function getUnits() {
  const { data: units, error } = await supabase
    .from("units")
    .select("*")
    .neq("status", "inactive")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Error fetching units");
  }

  return units;
}

export async function createUnit(data: RentalUnitFormType) {
  const response = await supabase.from("units").insert(data).single();
  const { data: newUnit, error } = response;
  if (error) {
    throw new Error("Error creating unit");
  }
  return newUnit;
}

export async function updateUnit(id: string, data: RentalUnitFormType) {
  const response = await supabase
    .from("units")
    .update(data)
    .eq("id", id)
    .single();
  const { data: updatedUnit, error } = response;
  if (error) {
    throw new Error("Error updating unit");
  }
  return updatedUnit;
}

export async function updateStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from("units")
    .update({ status })
    .eq("id", id)
    .single();

  if (error) {
    throw new Error("Error updating unit status");
  }
  return data;
}

export async function deleteUnit(id: string) {
  const { data, error } = await supabase
    .from("units")
    .update({ is_available: false, status: "inactive" })
    .eq("id", id);

  if (error) {
    throw new Error("Error updating unit status");
  }
  return data;
}
