import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../../services/apiAuth";

export function useUser() {
  const { isLoading, data: user } = useQuery({
    queryKey: ["user"],
    queryFn: getCurrentUser,
  });

  return {
    isLoading,
    user,
    isAdmin:
      user?.email === "avisha@email.com" || user?.email === "admin@admin.com",
    isTaytay: user?.email === "manager.taytay@rmsavisha.com",
    isPasig: user?.email === "manager.pasig@rmsavisha.com",
    isUser:
      (user?.user_metadata?.role?.includes("technician") ?? false) ||
      user?.email === "tech1@tech.com",
  };
}
