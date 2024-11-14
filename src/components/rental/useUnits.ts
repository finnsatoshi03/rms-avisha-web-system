import { useQuery } from "@tanstack/react-query";
import { getUnits } from "../../services/apiUnits";

export function useUnits() {
  const {
    data: units,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["units"],
    queryFn: getUnits,
  });

  return {
    units,
    error,
    isLoading,
  };
}
