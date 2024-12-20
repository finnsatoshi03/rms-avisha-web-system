import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateRental, UpdateRentalData } from "../../services/apiRental";
import toast from "react-hot-toast";

export function useUpdateRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rentalData: UpdateRentalData) => updateRental(rentalData),
    onSuccess: (_result, variables) => {
      toast.success("Rental updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["rental", variables.rental_details?.rental_id],
      });
      queryClient.invalidateQueries({ queryKey: ["unit", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
