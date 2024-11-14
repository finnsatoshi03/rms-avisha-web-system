import { supabase } from "./supabase";

export async function getUnits() {
  const { data: units, error } = await supabase.from("units").select("*");

  if (error) {
    // console.error(error);
    throw new Error("Error fetching units");
  }

  return units;
}
