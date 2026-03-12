import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login as loginApi } from "../../services/apiAuth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: login, isPending: isLoading } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi({ email, password }),
    onSuccess: (result) => {
      queryClient.setQueryData(["user"], result.user);
      navigate("/dashboard/job-order", { replace: true });

      window.history.pushState(null, document.title, window.location.href);
      window.addEventListener("popstate", function () {
        window.history.pushState(null, document.title, window.location.href);
      });
    },
    onError: (error) => {
      console.log(error);
      toast.error(`Error: ${error.message}`);
    },
  });

  return { login, isLoading };
}
