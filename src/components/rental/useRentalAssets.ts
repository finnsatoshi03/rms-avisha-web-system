import { useQuery } from "@tanstack/react-query";
import {
  getRentalAssets,
  getAvailableAssets,
} from "../../services/apiRentalAssets";

export function useRentalAssets(branchId?: number | null) {
  return useQuery({
    queryKey: ["rental_assets", branchId],
    queryFn: () => getRentalAssets({ branchId }),
  });
}

export function useAvailableAssets(branchId: number | null) {
  return useQuery({
    queryKey: ["rental_assets", "available", branchId],
    queryFn: () => getAvailableAssets(branchId!),
    enabled: !!branchId,
  });
}
