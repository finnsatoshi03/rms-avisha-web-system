import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";

/**
 * Server-side gate for the Photo Printing feature. The flag lives in
 * `system_settings` (key `photo_printing_access`), which RLS lets any
 * authenticated user read but only the dev role change — so the shop cannot
 * unlock it from the client. Fail closed: missing row, query error, or a
 * pending fetch all count as locked, and locked sheets render with a baked-in
 * demo watermark.
 *
 * To activate for the client (dev role):
 *   update system_settings set value = '{"unlocked": true}'
 *   where key = 'photo_printing_access';
 */
export function usePrintingAccess(): { unlocked: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["printing-access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "photo_printing_access")
        .maybeSingle();
      if (error || !data) return false;
      const value = data.value as { unlocked?: boolean } | null;
      return value?.unlocked === true;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  return { unlocked: data === true, isLoading };
}
