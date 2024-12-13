import { useQuery } from "@tanstack/react-query";
import { getClient, getClients } from "../../services/apiClients";

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

export function useClient(id: string) {
  const {
    data: client,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["client", id],
    queryFn: ({ queryKey }) => getClient(queryKey[1]),
  });

  return {
    client,
    error,
    isLoading,
  };
}
