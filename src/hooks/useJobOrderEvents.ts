import { useQuery } from "@tanstack/react-query";
import { getJobOrderEvents } from "../services/apiJobOrderEvents";

/**
 * Status transition history for one job order. Disabled until a real id is
 * available so it never fires for the "create" form. Status history only
 * changes when someone moves the order, so a modest staleTime is fine.
 */
export function useJobOrderEvents(jobOrderId?: number) {
  return useQuery({
    queryKey: ["joborder-events", jobOrderId],
    queryFn: () => getJobOrderEvents(jobOrderId as number),
    enabled: typeof jobOrderId === "number" && jobOrderId > 0,
    staleTime: 60 * 1000,
  });
}
