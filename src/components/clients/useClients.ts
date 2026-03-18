import { useQuery } from "@tanstack/react-query";
import { getClient, getClients, searchClients } from "../../services/apiClients";

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

export function useSearchClients(searchTerm: string) {
  const {
    data: results,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["clients-search", searchTerm],
    queryFn: () => searchClients(searchTerm),
    enabled: searchTerm.trim().length >= 2,
    staleTime: 30000,
  });

  return {
    results: results || [],
    error,
    isLoading,
  };
}
