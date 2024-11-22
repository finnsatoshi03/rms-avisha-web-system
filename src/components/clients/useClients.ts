import { useQuery } from "@tanstack/react-query";
import { getClients } from "../../services/apiClients";

export function useClients() {
  const {
    data: clients,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
  });

  return {
    clients,
    error,
    isLoading,
  };
}
