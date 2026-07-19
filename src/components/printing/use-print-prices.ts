import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { PrintPackageConfig } from "./print-config";

/**
 * Shared price list for print packages. Overrides live in `system_settings`
 * (key `photo_printing_prices`) as {packageId: php}, so every terminal and
 * branch sees the same prices; missing entries fall back to the defaults in
 * print-config. RLS lets any authenticated user read but only admin/dev
 * update this row.
 */
export type PriceOverrides = Record<string, number>;

const QUERY_KEY = ["printing-prices"];

export function usePrintPrices() {
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<PriceOverrides> => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "photo_printing_prices")
        .maybeSingle();
      if (error || !data) return {};
      const value = data.value as PriceOverrides | null;
      return value && typeof value === "object" ? value : {};
    },
    staleTime: 5 * 60 * 1000,
  });
  return { overrides: data ?? {} };
}

export function useSavePrintPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (overrides: PriceOverrides) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value: overrides, updated_at: new Date().toISOString() })
        .eq("key", "photo_printing_prices");
      if (error) throw new Error(error.message);
      return overrides;
    },
    onSuccess: (overrides) => {
      queryClient.setQueryData(QUERY_KEY, overrides);
    },
  });
}

/** Config default unless the shop has overridden the price in-app. */
export function effectivePrice(
  pkg: PrintPackageConfig,
  overrides: PriceOverrides
): number | undefined {
  const override = overrides[pkg.id];
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return override;
  }
  return pkg.price;
}
