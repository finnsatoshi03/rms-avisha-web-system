import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../../services/apiClients";
import toast from "react-hot-toast";

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      toast.success("Client created successfully");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: () => {
      toast.error("Error creating client");
    },
  });
}
