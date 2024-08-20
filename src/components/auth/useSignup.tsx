import { useMutation } from "@tanstack/react-query";
import { signup as signupApi } from "../../services/apiAuth";
import toast from "react-hot-toast";

export function useSignup() {
  const { mutate: signup, isPending: isLoading } = useMutation({
    mutationFn: signupApi,
    onSuccess: () => {
      toast.success(
        "Account created successfully. Please check your email to verify your technician's account."
      );
    },
    onError: (error) => {
      console.log(error.message);
      toast.error("Failed to create account. Please try again.");
    },
  });

  return { signup, isLoading };
}
