import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { saveInspection } from "../../services/apiRentals";

export function useSaveInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rentalId,
      data,
    }: {
      rentalId: number;
      data: Parameters<typeof saveInspection>[1];
    }) => saveInspection(rentalId, data),
    onSuccess: () => {
      toast.success("Inspection saved successfully");
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
