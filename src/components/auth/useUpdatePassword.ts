import { useMutation } from "@tanstack/react-query";
import { updatePassword as updatePasswordApi } from "../../services/apiAuth";
import toast from "react-hot-toast";

export function useUpdatePassword() {
  const { mutate: updatePassword, isPending: isLoading } = useMutation({
    mutationFn: updatePasswordApi,
    onSuccess: () => {
      toast.success("Password updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return { updatePassword, isLoading };
}
