import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser as updateUserApi } from "../../services/apiAuth";
import toast from "react-hot-toast";

export function useUpdatedUser() {
  const queryClient = useQueryClient();

  const { mutate: updateUser, isPending: isLoading } = useMutation({
    mutationFn: updateUserApi,
    onSuccess: (user) => {
      toast.success("User account updated successfully");
      queryClient.setQueryData(["user"], user.user);

      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return { updateUser, isLoading };
}
