import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRentalWithClient } from "../../services/apiRental";
import toast from "react-hot-toast";

export function useCreateRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRentalWithClient,
    onSuccess: () => {
      toast.success("Rental created successfully");
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
    onError: () => {
      toast.error("Error creating rental");
    },
  });
}
