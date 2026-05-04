import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout as logoutApi } from "../../services/apiAuth";
import { useNavigate } from "react-router-dom";
import { useBranchSession } from "./branch-session-context";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearActiveBranchSelection } = useBranchSession();

  const { mutate: logout, isPending: isLoading } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      void clearActiveBranchSelection();
      queryClient.removeQueries();
      navigate("/login", { replace: true });
    },
  });

  return { logout, isLoading };
}
