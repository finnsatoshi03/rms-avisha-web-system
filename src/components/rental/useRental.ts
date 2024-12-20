import { useQuery } from "@tanstack/react-query";
import { getRentalByUnitIdWithClient } from "../../services/apiRental";

export function useRental(unitId: number) {
  const {
    data: rental,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["rental", unitId],
    queryFn: () => getRentalByUnitIdWithClient(unitId),
    enabled: !!unitId,
  });

  return {
    rental,
    error,
    isLoading,
  };
}
