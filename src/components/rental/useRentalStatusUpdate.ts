import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateRentalStatus } from "../../services/apiRentals";

export function useRentalStatusUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      updateRentalStatus(ids, status),
    onSuccess: () => {
      toast.success("Rental status updated");
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["rental_assets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
