import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createRental } from "../../services/apiRentals";
import { CreateRentalConsumable } from "../../lib/types";

export function useCreateRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      data,
      clientId,
    }: {
      data: {
        rental_asset_id: number;
        name: string;
        contact_number: string;
        email?: string;
        technician_id?: string | null;
        branch_id: number;
        start_date: string;
        end_date?: string;
        due_date: string;
        rental_type: "DAILY" | "MONTHLY";
        rate_amount: number;
        notes?: string;
        consumables?: CreateRentalConsumable[];
        billing_account_id?: string | null;
        created_by?: string;
      };
      clientId: number | null;
    }) => createRental(data, clientId),
    onSuccess: (result) => {
      toast.success(`Rental ${result.rental_no} created successfully`);
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["rental_assets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
