import { RentalUnitFormType } from "../components/rental/rental-form";
import { supabase } from "./supabase";

export async function getUnits() {
  const { data: units, error } = await supabase.from("units").select("*");

  if (error) {
    // console.error(error);
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

export async function deleteUnits(id: string) {
  const { data, error } = await supabase.from("units").delete().eq("id", id);
  if (error) {
    throw new Error("Error deleting unit");
  }
  return data;
}
