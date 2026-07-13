import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { Client } from "../../lib/types";
import { updateClient } from "../../services/apiClients";

// Views that render client details through a client_id join — all need a
// refetch after an edit so the updated details show everywhere.
const AFFECTED_QUERY_KEYS = [
  "client",
  "clients",
  "clients-search",
  "client-children",
  "job_order",
  "job_orders",
  "rentals",
  "billing_accounts",
  "quotations",
  "archive",
];

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) =>
      updateClient(id, data),
    onSuccess: () => {
      toast.success("Client updated successfully");
      AFFECTED_QUERY_KEYS.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
    },
    onError: () => {
      toast.error("Error updating client");
    },
  });
}
