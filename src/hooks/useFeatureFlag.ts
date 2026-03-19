import { useQuery } from "@tanstack/react-query";
import { supabase } from "../services/supabase";

type FeatureFlagResult = {
  enabled: boolean;
  loading: boolean;
};

async function fetchFeatureFlag(key: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) return false;
  return data.value?.enabled === true;
}

export function useFeatureFlag(key: string): FeatureFlagResult {
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flag", key],
    queryFn: () => fetchFeatureFlag(key),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes per session
    refetchOnWindowFocus: false,
  });

  return {
    enabled: data ?? false,
    loading: isLoading,
  };
}
