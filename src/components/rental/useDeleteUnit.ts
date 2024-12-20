import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUnit } from "../../services/apiUnits";
import toast from "react-hot-toast";

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      toast.success("Unit deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: () => {
      toast.error("Error deleting unit");
    },
  });
}
