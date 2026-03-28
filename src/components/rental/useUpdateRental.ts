import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateRental } from "../../services/apiRentals";

export function useUpdateRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rentalId,
      data,
    }: {
      rentalId: number;
      data: Parameters<typeof updateRental>[1];
    }) => updateRental(rentalId, data),
    onSuccess: () => {
      toast.success("Rental updated successfully");
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
