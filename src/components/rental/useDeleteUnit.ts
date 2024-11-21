import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUnits } from "../../services/apiUnits";
import toast from "react-hot-toast";

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUnits,
    onSuccess: () => {
      toast.success("Unit deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: () => {
      toast.error("Error deleting unit");
    },
  });
}
