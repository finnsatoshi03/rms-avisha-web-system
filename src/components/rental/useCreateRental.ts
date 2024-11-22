import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRental } from "../../services/apiRental";
import toast from "react-hot-toast";

export function useCreateRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRental,
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
