import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../services/supabase";

/**
 * Keeps every open terminal in sync: any insert/update/delete on joborders
 * (from another counter, another tab, or an edge function) marks the job
 * order queries stale so active pages refetch. Debounced so bulk operations
 * (e.g. multi-row status changes) trigger one refetch, not one per row.
 */
export function useJobOrdersRealtime() {
  const queryClient = useQueryClient();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("joborders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "joborders" },
        () => {
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["job_order"] });
            queryClient.invalidateQueries({ queryKey: ["job_orders"] });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
