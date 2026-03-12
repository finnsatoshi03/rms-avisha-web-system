import { useMutation } from "@tanstack/react-query";
import { signup as signupApi } from "../../services/apiAuth";
import toast from "react-hot-toast";

export function useSignup() {
  const { mutate: signup, isPending: isLoading } = useMutation({
    mutationFn: signupApi,
    onSuccess: (result, variables) => {
      if (result?.invite_sent === false) {
        toast.error(
          `Account created, but invite email failed: ${
            result.invite_error || "Please send password reset manually."
          }`
        );
        return;
      }

      if (variables.password?.trim()) {
        toast.success(
          "Account created. Invite sent. Share the temporary password securely; user will be forced to change it after first login."
        );
        return;
      }

      toast.success("Account created. Invite sent. User will set password on first access.");
    },
    onError: (error: Error) => {
      console.log(error.message);
      toast.error(error.message || "Failed to create account. Please try again.");
    },
  });

  return { signup, isLoading };
}
