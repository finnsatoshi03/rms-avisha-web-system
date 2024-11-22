import { RentalFormType } from "../components/rental/rental-form";
import { supabase } from "./supabase";

interface CreateRentalData extends RentalFormType {
  unit_id: number;
  status: "ACTIVE" | "INACTIVE";
}

export async function createRental(data: CreateRentalData) {
  const { data: assignedRental, error } = await supabase
    .from("rentals")
    .insert([data]);

  if (error) {
    console.log(error);
    throw new Error("Error assigning a unit for rental");
  }
  return assignedRental;
}
